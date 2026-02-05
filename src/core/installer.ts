/**
 * 资源安装器
 *
 * 策略：Primary Source + Symlink
 * - 主源 (.agents) 存储实际文件
 * - 其他 App 通过符号链接指向主源
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import type { Resource, ResourceType } from './types.js';
import { RESOURCE_CONFIG } from './types.js';
import type { AgentConfig } from './agents.js';
import {
    PRIMARY_SOURCE,
    getAppsByIds,
    detectApps,
} from './agents.js';
import { getDistributionUrl } from './registry.js';
import { getInstallRoot, getInstallPathForResource } from './installPaths.js';
import type { InstallRoot, InstallScope } from './installPaths.js';

// ═══════════════════════════════════════════════════════════════════════════
// 安装选项与结果
// ═══════════════════════════════════════════════════════════════════════════

export interface InstallOptions {
    /** 目标 App ID 列表 */
    agents?: string[];
    /** 禁用 symlink */
    useSymlinks?: boolean;
    /** 安装范围 */
    scope?: 'local' | 'global';
    /** 资源类型 */
    resourceType?: ResourceType;
}

export interface InstallTarget {
    agent: string;
    path: string;
    type: 'copy' | 'link';
}

export interface InstallCompatNotice {
    agent: string;
    name: string;
    note: string;
}

export interface InstallResult {
    success: boolean;
    error?: string;
    targets: InstallTarget[];
    primaryPath?: string;
    compat?: InstallCompatNotice[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 安装逻辑
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 安装资源
 */
export function installResource(resource: Resource, options: InstallOptions = {}): InstallResult {
    const resourceType = options.resourceType || resource.type;
    const typeConfig = RESOURCE_CONFIG[resourceType];
    const distributionUrl = getDistributionUrl();
    const tempDir = join(tmpdir(), `skillwisp-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const useSymlinks = options.useSymlinks !== false;
    const scope = options.scope || 'local';

    try {
        const { sourceDir } = materializeSource(
            distributionUrl,
            tempDir,
            typeConfig.dirName,
            resource.path,
            typeConfig.entryFile
        );

        const requestedApps = resolveTargetApps(options);
        if (requestedApps.length === 0) {
            return { success: false, error: 'No installation targets found', targets: [] };
        }

        const normalized = normalizeTargetApps(requestedApps, resourceType, scope);
        const targetApps = normalized.targets;

        // 验证所有目标是否支持该 scope/type
        for (const app of targetApps) {
            const root = getInstallRoot(app, resourceType, scope);
            if (!root) {
                return {
                    success: false,
                    error: `${app.name} does not support ${resourceType} (${scope}) installations`,
                    targets: [],
                };
            }
        }

        const result: InstallResult = {
            success: true,
            targets: [],
            ...(normalized.compat.length > 0 ? { compat: normalized.compat } : {}),
        };

        // 1) 安装到主源（始终安装）
        const primaryRoot = getInstallRoot(PRIMARY_SOURCE, resourceType, scope);
        if (!primaryRoot || primaryRoot.kind !== 'dir') {
            return { success: false, error: 'Primary source install root not available', targets: [] };
        }

        const primaryDir = join(primaryRoot.dir, resource.id);
        safeRemove(primaryDir);
        mkdirSync(primaryRoot.dir, { recursive: true });
        cpSync(sourceDir, primaryDir, { recursive: true });
        cleanGit(primaryDir);
        const primaryEntryPath = join(primaryDir, typeConfig.entryFile);

        result.primaryPath = primaryDir;
        result.targets.push({ agent: PRIMARY_SOURCE.id, path: primaryDir, type: 'copy' });

        // 2) 为其他目标创建链接/文件
        for (const app of targetApps) {
            if (app.id === PRIMARY_SOURCE.id) continue;

            const root = getInstallRoot(app, resourceType, scope);
            if (!root) continue;

            const installed = installToTarget(app, root, resource, resourceType, primaryDir, primaryEntryPath, useSymlinks);
            if (!installed.success) {
                return { success: false, error: installed.error, targets: [] };
            }

            result.targets.push(...installed.targets);
        }

        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            targets: [],
        };
    } finally {
        // 清理临时目录
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部函数
// ═══════════════════════════════════════════════════════════════════════════

function resolveTargetApps(options: InstallOptions): AgentConfig[] {
    if (options.agents && options.agents.length > 0) {
        return getAppsByIds(options.agents);
    }

    // 自动检测
    const detected = detectApps();
    if (detected.length > 0) {
        return detected;
    }

    // fallback
    return [PRIMARY_SOURCE];
}

function isPrimaryCompat(app: AgentConfig, resourceType: ResourceType, scope: InstallScope): boolean {
    return scope === 'local' && resourceType === 'skill' && app.compat?.localSkillUsesPrimary === true;
}

function buildCompatNotice(app: AgentConfig): InstallCompatNotice {
    const note = app.compat?.note || `${PRIMARY_SOURCE.name}/skills`;
    return { agent: app.id, name: app.name, note };
}

function normalizeTargetApps(
    apps: AgentConfig[],
    resourceType: ResourceType,
    scope: InstallScope
): { targets: AgentConfig[]; compat: InstallCompatNotice[] } {
    const compat: InstallCompatNotice[] = [];
    const filtered: AgentConfig[] = [];

    for (const app of apps) {
        if (isPrimaryCompat(app, resourceType, scope)) {
            compat.push(buildCompatNotice(app));
            continue;
        }
        filtered.push(app);
    }

    return {
        targets: ensurePrimaryTarget(filtered),
        compat,
    };
}

export function resolveInstallTargets(
    agentIds: string[],
    resourceType: ResourceType,
    scope: InstallScope
): { agentIds: string[]; compat: InstallCompatNotice[] } {
    if (!agentIds || agentIds.length === 0) {
        return { agentIds: [], compat: [] };
    }

    const apps = getAppsByIds(agentIds);
    if (apps.length === 0) {
        return { agentIds: [], compat: [] };
    }

    const normalized = normalizeTargetApps(apps, resourceType, scope);
    return { agentIds: normalized.targets.map((a) => a.id), compat: normalized.compat };
}

function cleanGit(dir: string): void {
    const gitDir = join(dir, '.git');
    if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true });
    }
}

function ensurePrimaryTarget(apps: AgentConfig[]): AgentConfig[] {
    const unique: AgentConfig[] = [];
    const seen = new Set<string>();

    // Primary first
    unique.push(PRIMARY_SOURCE);
    seen.add(PRIMARY_SOURCE.id);

    for (const app of apps) {
        if (seen.has(app.id)) continue;
        unique.push(app);
        seen.add(app.id);
    }

    return unique;
}

function safeRemove(path: string): void {
    if (!existsSync(path)) return;
    rmSync(path, { recursive: true, force: true });
}

function materializeSource(
    distributionUrl: string,
    tempDir: string,
    dirName: string,
    resourcePath: string,
    entryFile: string
): { sourceDir: string } {
    const repoUrl = `${distributionUrl}.git`;
    const sparsePath = `${dirName}/${resourcePath}`;

    // 预清理，避免之前的异常中断留下临时目录
    safeRemove(tempDir);

    // 基础可用性检查：git 必须存在
    runGit(['--version']);

    const attempts: Array<{ args: string[]; sparse: boolean }> = [
        { args: ['clone', '--depth', '1', '--filter=blob:none', '--sparse', repoUrl, tempDir], sparse: true },
        { args: ['clone', '--depth', '1', '--sparse', repoUrl, tempDir], sparse: true },
        { args: ['clone', '--depth', '1', repoUrl, tempDir], sparse: false },
    ];

    let cloned = false;
    let sparse = false;
    let lastError: Error | null = null;

    for (const attempt of attempts) {
        try {
            runGit(attempt.args);
            cloned = true;
            sparse = attempt.sparse;
            lastError = null;
            break;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    if (!cloned) {
        throw lastError || new Error('Failed to clone distribution repository');
    }

    if (sparse) {
        // clone --sparse 后必须设置 checkout 路径，否则工作区为空
        runGit(['sparse-checkout', 'set', sparsePath], { cwd: tempDir });
    } else {
        // 非 sparse 模式可尝试优化（失败则忽略）
        try {
            runGit(['sparse-checkout', 'set', sparsePath], { cwd: tempDir });
        } catch {
            // ignore
        }
    }

    const sourceDir = join(tempDir, dirName, resourcePath);
    const entryPath = join(sourceDir, entryFile);

    if (!existsSync(entryPath)) {
        throw new Error(`Invalid resource: missing ${entryFile} in ${resourcePath}`);
    }

    return { sourceDir };
}

function runGit(
    args: string[],
    options: { cwd?: string } = {}
): void {
    try {
        execFileSync('git', args, {
            cwd: options.cwd,
            stdio: 'pipe',
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
            },
        });
    } catch (error) {
        throw new Error(formatGitError(args, error));
    }
}

function formatGitError(args: string[], error: unknown): string {
    const e = error as NodeJS.ErrnoException & { stdout?: unknown; stderr?: unknown; status?: number };
    if (e.code === 'ENOENT') {
        return 'git is required but was not found in PATH';
    }

    const stdout = toText(e.stdout).trim();
    const stderr = toText(e.stderr).trim();
    const details = stderr || stdout;

    const cmd = `git ${args.join(' ')}`;
    return details ? `${cmd}: ${details}` : `${cmd} failed`;
}

function toText(value: unknown): string {
    if (!value) return '';
    if (value instanceof Uint8Array) {
        return new TextDecoder().decode(value);
    }
    return String(value);
}

function installToTarget(
    app: AgentConfig,
    root: InstallRoot,
    resource: Resource,
    resourceType: ResourceType,
    primaryDir: string,
    primaryEntryPath: string,
    useSymlinks: boolean
): { success: boolean; error?: string; targets: InstallTarget[] } {
    const out: InstallTarget[] = [];

    if (root.kind === 'dir') {
        const targetDir = join(root.dir, resource.id);
        safeRemove(targetDir);
        mkdirSync(root.dir, { recursive: true });

        if (!useSymlinks) {
            cpSync(primaryDir, targetDir, { recursive: true });
            out.push({ agent: app.id, path: targetDir, type: 'copy' });
            return { success: true, targets: out };
        }

        try {
            const rel = relative(root.dir, primaryDir);
            symlinkSync(rel, targetDir);
            out.push({ agent: app.id, path: targetDir, type: 'link' });
            return { success: true, targets: out };
        } catch (error) {
            // symlink 失败：跨平台回退到 copy
            try {
                cpSync(primaryDir, targetDir, { recursive: true });
                out.push({ agent: app.id, path: targetDir, type: 'copy' });
                return { success: true, targets: out };
            } catch (copyError) {
                const message = copyError instanceof Error ? copyError.message : String(copyError);
                const rootCause = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    error: `Failed to install to ${app.name}: ${rootCause}; fallback copy failed: ${message}`,
                    targets: [],
                };
            }
        }
    }

    if (root.kind === 'file') {
        if (!existsSync(primaryEntryPath)) {
            return { success: false, error: `Missing entry file: ${primaryEntryPath}`, targets: [] };
        }

        const filePath = join(root.dir, `${root.prefix}${resource.id}${root.ext}`);
        safeRemove(filePath);
        mkdirSync(root.dir, { recursive: true });

        const entry = readFileSync(primaryEntryPath, 'utf-8');
        const body = stripFrontmatter(entry);
        const content = renderSkillFile(app.id, resource, body);

        writeFileSync(filePath, content, 'utf-8');
        out.push({ agent: app.id, path: filePath, type: 'copy' });
        return { success: true, targets: out };
    }
}

function stripFrontmatter(markdown: string): string {
    if (!markdown.startsWith('---')) return markdown.trim();

    const match = markdown.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)$/);
    if (!match) return markdown.trim();

    return match[1].trim();
}

function renderSkillFile(targetId: string, resource: Resource, body: string): string {
    // 统一换行，避免某些工具对 CRLF/空行敏感
    const normalizedBody = body.replace(/\r\n/g, '\n').trim();
    const meta = `@${resource.source}/${resource.id}`;

    if (targetId === 'cursor') {
        const desc = yamlString(`SkillWisp: ${resource.name} (${meta})`);
        return [
            '---',
            `description: ${desc}`,
            '---',
            '',
            `# ${resource.name}`,
            '',
            normalizedBody,
            '',
        ].join('\n');
    }

    if (targetId === 'github-copilot') {
        return [
            `# ${resource.name}`,
            '',
            `Source: ${meta}`,
            '',
            normalizedBody,
            '',
        ].join('\n');
    }

    if (targetId === 'krio') {
        return [
            `# ${resource.name}`,
            '',
            `Source: ${meta}`,
            '',
            normalizedBody,
            '',
        ].join('\n');
    }

    if (targetId === 'augment') {
        return [
            `# ${resource.name}`,
            '',
            `Source: ${meta}`,
            '',
            normalizedBody,
            '',
        ].join('\n');
    }

    // 默认（兜底）
    return `${normalizedBody}\n`;
}

function yamlString(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 检查是否已存在
// ═══════════════════════════════════════════════════════════════════════════

export function checkExists(
    resourceId: string,
    resourceType: ResourceType,
    appIds: string[],
    scope: 'local' | 'global'
): string[] {
    const existing: string[] = [];
    const apps = getAppsByIds(appIds);

    for (const app of apps) {
        const install = getInstallPathForResource(app, resourceType, scope, resourceId);
        if (!install) continue;
        if (existsSync(install.path)) existing.push(app.name);
    }

    // 检查 PRIMARY_SOURCE
    const primaryInstall = getInstallPathForResource(PRIMARY_SOURCE, resourceType, scope, resourceId);
    if (primaryInstall?.kind === 'dir' && existsSync(primaryInstall.path) && !existing.includes(PRIMARY_SOURCE.name)) {
        existing.push(PRIMARY_SOURCE.name);
    }

    return existing;
}

// ═══════════════════════════════════════════════════════════════════════════
// 导出 App 工具（便于命令层使用）
// ═══════════════════════════════════════════════════════════════════════════

export { detectApps, getAppsByIds } from './agents.js';
