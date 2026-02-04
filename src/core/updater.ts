/**
 * 索引自动更新器
 *
 * 职责：
 * 1. 检查远程索引版本
 * 2. 验证 CLI 兼容性
 * 3. 自动下载并保存到用户目录
 *
 * 更新策略：
 * - 后台异步检测，不阻塞用户操作
 * - 支持手动触发 (skillwisp update)
 * - 检测间隔默认 24 小时
 * - 智能镜像选择（记住最快镜像）
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import type { IndexData, UpdateMeta, SourcesConfig } from './types.js';
import { CLI_VERSION, isVersionLower } from './version.js';
import { loadPreferences } from './preferences.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// 路径定义
// ═══════════════════════════════════════════════════════════════════════════

const USER_DATA_DIR = join(homedir(), '.agent', '.skillwisp');
const USER_REGISTRY_DIR = join(USER_DATA_DIR, 'cache');
const META_FILE = join(USER_DATA_DIR, 'meta.json');

export { USER_REGISTRY_DIR };

// ═══════════════════════════════════════════════════════════════════════════
// 元信息管理
// ═══════════════════════════════════════════════════════════════════════════

export function loadUpdateMeta(): UpdateMeta | null {
    try {
        if (!existsSync(META_FILE)) return null;
        return JSON.parse(readFileSync(META_FILE, 'utf-8')) as UpdateMeta;
    } catch {
        return null;
    }
}

function saveUpdateMeta(meta: UpdateMeta): void {
    if (!existsSync(USER_DATA_DIR)) {
        mkdirSync(USER_DATA_DIR, { recursive: true });
    }
    writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════
// 源配置加载
// ═══════════════════════════════════════════════════════════════════════════

function findBuiltinRegistryDir(): string {
    const devPath = join(__dirname, '../../registry');
    if (existsSync(devPath)) return devPath;
    const distPath = join(__dirname, '../registry');
    if (existsSync(distPath)) return distPath;
    throw new Error('Built-in registry directory not found');
}

function loadSourcesConfig(): SourcesConfig {
    const builtinDir = findBuiltinRegistryDir();
    const content = readFileSync(join(builtinDir, 'sources.yaml'), 'utf-8');
    return parseYaml(content) as SourcesConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
// 远程获取
// ═══════════════════════════════════════════════════════════════════════════

const FETCH_TIMEOUT = 8000;
const RETRY_COUNT = 2;
const RETRY_DELAY = 500;

function toRawUrl(repoUrl: string, path: string): string {
    if (repoUrl.includes('gitcode.com')) {
        return `${repoUrl}/-/raw/main/${path}`;
    }
    if (repoUrl.includes('github.com')) {
        return repoUrl.replace('github.com', 'raw.githubusercontent.com') + `/main/${path}`;
    }
    if (repoUrl.includes('gitee.com')) {
        return `${repoUrl}/raw/master/${path}`;
    }
    throw new Error(`Unknown mirror: ${repoUrl}`);
}

async function fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i <= RETRY_COUNT; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
        } catch (error) {
            lastError = error as Error;
            if (i < RETRY_COUNT) {
                await new Promise((r) => setTimeout(r, RETRY_DELAY));
            }
        }
    }

    throw lastError || new Error('Fetch failed');
}

interface FetchResult {
    content: string;
    mirror: string;
}

async function fetchFromMirrors(path: string, preferredMirror?: string): Promise<FetchResult> {
    const sources = loadSourcesConfig();
    const allMirrors = [sources.distribution.primary, ...sources.distribution.mirrors];

    // 优先使用首选镜像
    if (preferredMirror && allMirrors.includes(preferredMirror)) {
        try {
            const url = toRawUrl(preferredMirror, path);
            const content = await fetchWithRetry(url);
            return { content, mirror: preferredMirror };
        } catch {
            // 首选失败，继续尝试其他
        }
    }

    // 并行请求所有镜像
    const results = await Promise.allSettled(
        allMirrors
            .filter((m) => m !== preferredMirror)
            .map(async (mirror) => {
                const url = toRawUrl(mirror, path);
                const content = await fetchWithRetry(url);
                return { content, mirror };
            })
    );

    for (const result of results) {
        if (result.status === 'fulfilled') {
            return result.value;
        }
    }

    throw new Error('All mirrors failed');
}

// ═══════════════════════════════════════════════════════════════════════════
// 版本检查
// ═══════════════════════════════════════════════════════════════════════════

export interface UpdateCheckResult {
    available: boolean;
    currentVersion: string;
    remoteVersion: string;
    requiresCliUpgrade: boolean;
    minCliVersion?: string;
}

export async function checkIndexUpdate(): Promise<UpdateCheckResult> {
    const meta = loadUpdateMeta();
    const currentVersion = meta?.indexVersion || getBuiltinIndexVersion();

    try {
        const prefs = loadPreferences();
        const { content, mirror } = await fetchFromMirrors('registry/index.yaml', prefs.preferredMirror || meta?.bestMirror);
        const remote = parseYaml(content) as IndexData;
        const remoteVersion = remote.index_version || '0.0.0';
        const minCliVersion = remote.min_cli_version;

        const requiresCliUpgrade = minCliVersion ? isVersionLower(CLI_VERSION, minCliVersion) : false;

        // 更新 bestMirror
        const newMeta: UpdateMeta = {
            lastCheck: Date.now(),
            indexVersion: meta?.indexVersion || currentVersion,
            bestMirror: mirror,
        };
        saveUpdateMeta(newMeta);

        return {
            available: remoteVersion !== currentVersion,
            currentVersion,
            remoteVersion,
            requiresCliUpgrade,
            minCliVersion,
        };
    } catch {
        return {
            available: false,
            currentVersion,
            remoteVersion: currentVersion,
            requiresCliUpgrade: false,
        };
    }
}

function getBuiltinIndexVersion(): string {
    try {
        const builtinDir = findBuiltinRegistryDir();
        const content = readFileSync(join(builtinDir, 'index.yaml'), 'utf-8');
        const data = parseYaml(content) as IndexData;
        return data.index_version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 执行更新
// ═══════════════════════════════════════════════════════════════════════════

export interface UpdateResult {
    success: boolean;
    version?: string;
    error?: string;
    requiresCliUpgrade?: boolean;
    minCliVersion?: string;
}

export async function updateIndex(): Promise<UpdateResult> {
    try {
        const meta = loadUpdateMeta();
        const prefs = loadPreferences();

        // 获取远程索引
        const { content: indexContent, mirror } = await fetchFromMirrors(
            'registry/index.yaml',
            prefs.preferredMirror || meta?.bestMirror
        );
        const remoteIndex = parseYaml(indexContent) as IndexData;

        // 检查 CLI 兼容性
        const minCliVersion = remoteIndex.min_cli_version;
        if (minCliVersion && isVersionLower(CLI_VERSION, minCliVersion)) {
            return {
                success: false,
                requiresCliUpgrade: true,
                minCliVersion,
                error: `Index requires CLI >= ${minCliVersion}`,
            };
        }

        // 校验数据完整性
        if (!remoteIndex.index_version || !remoteIndex.skills?.length) {
            return {
                success: false,
                error: 'Invalid index data: missing required fields',
            };
        }

        // 确保用户目录存在
        if (!existsSync(USER_REGISTRY_DIR)) {
            mkdirSync(USER_REGISTRY_DIR, { recursive: true });
        }

        // 原子写入索引
        atomicWrite(join(USER_REGISTRY_DIR, 'index.yaml'), indexContent);

        // 尝试更新 i18n
        try {
            const { content: i18nContent } = await fetchFromMirrors(
                'registry/i18n/zh-CN.yaml',
                prefs.preferredMirror || mirror
            );
            const i18nDir = join(USER_REGISTRY_DIR, 'i18n');
            if (!existsSync(i18nDir)) mkdirSync(i18nDir, { recursive: true });
            atomicWrite(join(i18nDir, 'zh-CN.yaml'), i18nContent);
        } catch {
            // i18n 更新失败不阻塞
        }

        // 更新元信息
        saveUpdateMeta({
            lastCheck: Date.now(),
            indexVersion: remoteIndex.index_version,
            bestMirror: mirror,
        });

        return {
            success: true,
            version: remoteIndex.index_version,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function atomicWrite(targetPath: string, content: string): void {
    const tempPath = join(tmpdir(), `skillwisp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, targetPath);
}

// ═══════════════════════════════════════════════════════════════════════════
// 自动更新调度
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CHECK_INTERVAL = 24; // hours

export function shouldCheckUpdate(): boolean {
    const prefs = loadPreferences();

    // 用户禁用自动更新
    if (prefs.autoUpdate === false) return false;

    const meta = loadUpdateMeta();
    if (!meta) return true; // 从未检查过

    const interval = prefs.checkInterval || DEFAULT_CHECK_INTERVAL;
    const elapsed = Date.now() - meta.lastCheck;
    const intervalMs = interval * 60 * 60 * 1000;

    return elapsed >= intervalMs;
}

/**
 * 后台自动更新（非阻塞）
 * 返回更新结果 Promise，调用方可选择 await 或忽略
 */
export async function backgroundUpdate(): Promise<UpdateResult | null> {
    if (!shouldCheckUpdate()) return null;

    const checkResult = await checkIndexUpdate();

    if (!checkResult.available) return null;

    if (checkResult.requiresCliUpgrade) {
        // 不自动更新，但记录状态供后续提示
        return {
            success: false,
            requiresCliUpgrade: true,
            minCliVersion: checkResult.minCliVersion,
        };
    }

    return await updateIndex();
}
