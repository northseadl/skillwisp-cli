/**
 * 用户自定义 GitHub 源管理器
 *
 * 核心能力：
 * - addSource:    添加 GitHub 仓库作为资源来源（克隆 + 扫描 + 索引）
 * - removeSource: 移除源及其本地数据
 * - syncSource:   同步源（git pull + 重新扫描）
 * - listSources:  列出所有用户源
 * - loadUserSourceResources: 加载所有用户源的资源列表
 *
 * 扫描算法：
 *   递归遍历仓库目录，查找 SKILL.md / RULE.md / WORKFLOW.md
 *   从文件 YAML frontmatter 或 # 标题中提取元数据
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Resource, ResourceType, SourcesConfig } from './types.js';
import { SOURCES_DIR, findBuiltinRegistryDir } from './paths.js';
import { runGit } from './git.js';

// ═══════════════════════════════════════════════════════════════════════════
// 常量与类型
// ═══════════════════════════════════════════════════════════════════════════

const SOURCES_CONFIG_FILE = join(SOURCES_DIR, 'sources.json');

/** 文件名 → 资源类型映射 */
const ENTRY_FILE_MAP: Record<string, ResourceType> = {
    'SKILL.md': 'skill',
    'RULE.md': 'rule',
    'WORKFLOW.md': 'workflow',
};

/** 扫描时排除的目录 */
const SCAN_EXCLUDE_DIRS = new Set([
    '.git', 'node_modules', 'dist', '.github', '.vscode',
    '__pycache__', '.idea', '.agents', '.skillwisp',
]);

export interface UserSource {
    id: string;
    repo: string;
    addedAt: string;
    lastSync: string;
    resourceCount: number;
}

interface UserSourcesConfig {
    sources: UserSource[];
}

export interface AddSourceResult {
    success: boolean;
    source?: UserSource;
    error?: string;
}

export interface SyncResult {
    success: boolean;
    resourceCount?: number;
    error?: string;
}

export interface RemoveResult {
    success: boolean;
    error?: string;
}

interface ScannedResource {
    id: string;
    type: ResourceType;
    name: string;
    description: string;
    tags: string[];
    /** 相对于仓库根目录的路径 */
    relativePath: string;
}



// ═══════════════════════════════════════════════════════════════════════════
// 配置持久化
// ═══════════════════════════════════════════════════════════════════════════

function ensureSourcesDir(): void {
    if (!existsSync(SOURCES_DIR)) {
        mkdirSync(SOURCES_DIR, { recursive: true });
    }
}

function loadSourcesConfig(): UserSourcesConfig {
    if (!existsSync(SOURCES_CONFIG_FILE)) {
        return { sources: [] };
    }
    try {
        return JSON.parse(readFileSync(SOURCES_CONFIG_FILE, 'utf-8')) as UserSourcesConfig;
    } catch {
        return { sources: [] };
    }
}

function saveSourcesConfig(config: UserSourcesConfig): void {
    ensureSourcesDir();
    writeFileSync(SOURCES_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════
// URL 解析
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 从 GitHub URL 推断 source id
 *
 * https://github.com/anthropics/skills     → anthropics
 * https://github.com/someone/my-ai-skills  → someone
 *
 * 如果与内置源冲突（由调用方检查），使用 user-repo 格式
 */
function parseRepoUrl(url: string): { owner: string; repo: string; normalizedUrl: string } {
    // 规范化 URL
    let normalized = url.trim().replace(/\/$/, '').replace(/\.git$/, '');

    // 支持格式: github.com/owner/repo, https://github.com/owner/repo
    const match = normalized.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        throw new Error(
            `Unsupported URL format: ${url}\n` +
            `Expected: https://github.com/<owner>/<repo>`
        );
    }

    const owner = match[1];
    const repo = match[2];

    // 确保是完整的 https URL
    if (!normalized.startsWith('https://')) {
        normalized = `https://github.com/${owner}/${repo}`;
    }

    return { owner, repo, normalizedUrl: normalized };
}

/**
 * 决定 source id，避免与已有源冲突
 */
function resolveSourceId(owner: string, repo: string, existingIds: Set<string>): string {
    if (!existingIds.has(owner)) {
        return owner;
    }
    // 冲突时使用 owner-repo
    const fallback = `${owner}-${repo}`;
    if (!existingIds.has(fallback)) {
        return fallback;
    }
    // 极端情况：加序号
    let i = 2;
    while (existingIds.has(`${fallback}-${i}`)) i++;
    return `${fallback}-${i}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 仓库扫描
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 从 Markdown 文件提取 YAML frontmatter
 */
function extractFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result: Record<string, unknown> = {};

    // 简易 YAML 解析（只处理 key: value 和 key: [array]）
    for (const line of yaml.split('\n')) {
        const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
        if (!kvMatch) continue;

        const key = kvMatch[1];
        let value = kvMatch[2].trim();

        // 数组 [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
            result[key] = value.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
        } else {
            // 去除引号
            result[key] = value.replace(/^["']|["']$/g, '');
        }
    }

    return result;
}

/**
 * 从 Markdown 提取第一个 # 标题
 */
function extractFirstHeading(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
}

/**
 * 递归扫描目录发现资源
 */
function scanDirectory(
    dir: string,
    rootDir: string,
    sourceId: string,
    results: ScannedResource[],
    maxDepth = 5,
    currentDepth = 0
): void {
    if (currentDepth > maxDepth) return;

    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return; // 权限问题时跳过
    }

    // 检查当前目录是否包含入口文件
    for (const [entryFile, resourceType] of Object.entries(ENTRY_FILE_MAP)) {
        const entryPath = join(dir, entryFile);
        if (existsSync(entryPath)) {
            try {
                const content = readFileSync(entryPath, 'utf-8');
                const fm = extractFrontmatter(content);
                const dirName = basename(dir);
                const relativePath = relative(rootDir, dir).replace(/\\/g, '/');

                const name = (fm.name as string)
                    || extractFirstHeading(content)
                    || dirName;

                const description = (fm.description as string)
                    || content.replace(/^---[\s\S]*?---\n?/, '').trim().slice(0, 200);

                const tags = Array.isArray(fm.tags)
                    ? fm.tags.map(String)
                    : [];

                results.push({
                    id: dirName,
                    type: resourceType,
                    name,
                    description,
                    tags,
                    relativePath,
                });
            } catch {
                // 解析失败跳过
            }
            return; // 找到入口文件后不再深入子目录
        }
    }

    // 继续递归子目录
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SCAN_EXCLUDE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        scanDirectory(
            join(dir, entry.name),
            rootDir,
            sourceId,
            results,
            maxDepth,
            currentDepth + 1
        );
    }
}

/**
 * 扫描仓库目录，返回发现的资源列表
 */
function scanRepo(repoDir: string, sourceId: string): ScannedResource[] {
    const results: ScannedResource[] = [];
    scanDirectory(repoDir, repoDir, sourceId, results);
    return results;
}

/**
 * 将扫描结果转为 Resource[]
 */
function toResources(scanned: ScannedResource[], sourceId: string, repoUrl: string): Resource[] {
    return scanned.map((s) => ({
        id: s.id,
        type: s.type,
        source: sourceId,
        path: `@${sourceId}/${s.relativePath}`,
        name: s.name,
        description: s.description,
        tags: s.tags,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
// 公开 API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 添加 GitHub 仓库作为资源来源
 *
 * 流程：解析 URL → 推断 id → git clone → 扫描 → 保存配置
 */
export async function addSource(repoUrl: string): Promise<AddSourceResult> {
    try {
        const { owner, repo, normalizedUrl } = parseRepoUrl(repoUrl);

        // 检查是否已添加
        const config = loadSourcesConfig();
        const existingByUrl = config.sources.find((s) => s.repo === normalizedUrl);
        if (existingByUrl) {
            return { success: false, error: `Source already added as @${existingByUrl.id}` };
        }

        // 收集所有已存在的 id（内置 + 用户）
        const existingIds = new Set(config.sources.map((s) => s.id));
        // 内置源 id 也需要纳入冲突检测
        try {
            const builtinSources = loadBuiltinSourceIds();
            for (const id of builtinSources) existingIds.add(id);
        } catch {
            // 内置源加载失败不阻塞
        }

        const sourceId = resolveSourceId(owner, repo, existingIds);
        const sourceDir = join(SOURCES_DIR, sourceId);
        const repoDir = join(sourceDir, 'repo');

        // 克隆仓库
        ensureSourcesDir();
        if (existsSync(sourceDir)) {
            rmSync(sourceDir, { recursive: true, force: true });
        }
        mkdirSync(sourceDir, { recursive: true });

        runGit(['clone', '--depth', '1', `${normalizedUrl}.git`, repoDir]);

        // 扫描资源
        const scanned = scanRepo(repoDir, sourceId);
        if (scanned.length === 0) {
            // 清理
            rmSync(sourceDir, { recursive: true, force: true });
            return {
                success: false,
                error: `No resources found in ${normalizedUrl}\n` +
                    `(Looked for ${Object.keys(ENTRY_FILE_MAP).join(', ')} files)`,
            };
        }

        // 保存索引
        const resources = toResources(scanned, sourceId, normalizedUrl);
        const indexPath = join(sourceDir, 'index.json');
        writeFileSync(indexPath, JSON.stringify({ resources }, null, 2), 'utf-8');

        // 更新配置
        const now = new Date().toISOString();
        const source: UserSource = {
            id: sourceId,
            repo: normalizedUrl,
            addedAt: now,
            lastSync: now,
            resourceCount: scanned.length,
        };
        config.sources.push(source);
        saveSourcesConfig(config);

        return { success: true, source };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * 移除用户源
 */
export function removeSource(sourceId: string): RemoveResult {
    try {
        const config = loadSourcesConfig();
        const idx = config.sources.findIndex((s) => s.id === sourceId);
        if (idx === -1) {
            return { success: false, error: `Source @${sourceId} not found` };
        }

        // 删除文件
        const sourceDir = join(SOURCES_DIR, sourceId);
        if (existsSync(sourceDir)) {
            rmSync(sourceDir, { recursive: true, force: true });
        }

        // 更新配置
        config.sources.splice(idx, 1);
        saveSourcesConfig(config);

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * 同步源（git pull + 重新扫描）
 *
 * 如果不指定 sourceId，同步所有源
 */
export async function syncSource(sourceId?: string): Promise<Map<string, SyncResult>> {
    const config = loadSourcesConfig();
    const results = new Map<string, SyncResult>();

    const targets = sourceId
        ? config.sources.filter((s) => s.id === sourceId)
        : config.sources;

    if (targets.length === 0 && sourceId) {
        results.set(sourceId, { success: false, error: `Source @${sourceId} not found` });
        return results;
    }

    for (const source of targets) {
        try {
            const repoDir = join(SOURCES_DIR, source.id, 'repo');

            if (!existsSync(repoDir)) {
                // 仓库目录丢失，重新克隆
                mkdirSync(join(SOURCES_DIR, source.id), { recursive: true });
                runGit(['clone', '--depth', '1', `${source.repo}.git`, repoDir]);
            } else {
                // git pull
                runGit(['pull', '--depth', '1', '--ff-only'], { cwd: repoDir });
            }

            // 重新扫描
            const scanned = scanRepo(repoDir, source.id);
            const resources = toResources(scanned, source.id, source.repo);
            const indexPath = join(SOURCES_DIR, source.id, 'index.json');
            writeFileSync(indexPath, JSON.stringify({ resources }, null, 2), 'utf-8');

            // 更新配置
            source.lastSync = new Date().toISOString();
            source.resourceCount = scanned.length;

            results.set(source.id, { success: true, resourceCount: scanned.length });
        } catch (error) {
            results.set(source.id, {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    saveSourcesConfig(config);
    return results;
}

/**
 * 列出所有用户源
 */
export function listUserSources(): UserSource[] {
    return loadSourcesConfig().sources;
}

/**
 * 加载所有用户源的资源，合并为统一的 Resource[]
 */
export function loadUserSourceResources(): Resource[] {
    const config = loadSourcesConfig();
    const allResources: Resource[] = [];

    for (const source of config.sources) {
        const indexPath = join(SOURCES_DIR, source.id, 'index.json');
        if (!existsSync(indexPath)) continue;

        try {
            const data = JSON.parse(readFileSync(indexPath, 'utf-8')) as { resources: Resource[] };
            allResources.push(...data.resources);
        } catch {
            // 索引损坏时跳过
        }
    }

    return allResources;
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部辅助
// ═══════════════════════════════════════════════════════════════════════════

function loadBuiltinSourceIds(): string[] {
    try {
        const builtinDir = findBuiltinRegistryDir();
        const content = readFileSync(join(builtinDir, 'sources.yaml'), 'utf-8');
        const config = parseYaml(content) as SourcesConfig;
        return config.sources.map((s) => s.id);
    } catch {
        return [];
    }
}
