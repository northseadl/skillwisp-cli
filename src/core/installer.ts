/**
 * 资源安装器
 *
 * 策略：Primary Source + Symlink
 * - 主源 (.agent) 存储实际文件
 * - 其他 App 通过符号链接指向主源
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync, symlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { homedir, tmpdir, platform } from 'node:os';

import type { Resource, ResourceType } from './types.js';
import { RESOURCE_CONFIG } from './types.js';
import type { AgentConfig } from './agents.js';
import {
    PRIMARY_SOURCE,
    getAppsByIds,
    detectApps,
    getAppResourceDir,
} from './agents.js';
import { getDistributionUrl } from './registry.js';

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

export interface InstallResult {
    success: boolean;
    error?: string;
    targets: InstallTarget[];
    primaryPath?: string;
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
    const tempDir = join(tmpdir(), `skillwisp-${Date.now()}`);
    const useSymlinks = options.useSymlinks !== false;
    const scope = options.scope || 'local';

    try {
        // Clone with sparse checkout
        execSync(
            `git clone --depth 1 --filter=blob:none --sparse ${distributionUrl}.git ${tempDir}`,
            { stdio: 'pipe' }
        );
        execSync(`git sparse-checkout set ${typeConfig.dirName}/${resource.path}`, {
            cwd: tempDir,
            stdio: 'pipe',
        });

        const sourceDir = join(tempDir, typeConfig.dirName, resource.path);

        if (!existsSync(join(sourceDir, typeConfig.entryFile))) {
            return {
                success: false,
                error: `Invalid ${resourceType}: missing ${typeConfig.entryFile} in ${resource.path}`,
                targets: [],
            };
        }

        const baseDir = scope === 'global' ? homedir() : process.cwd();
        const result: InstallResult = { success: true, targets: [] };

        // 解析目标 App
        const targetApps = resolveTargetApps(options);

        if (targetApps.length === 0) {
            return {
                success: false,
                error: 'No installation targets found',
                targets: [],
            };
        }

        // 单一 App（非 PRIMARY）：直接复制
        if (targetApps.length === 1 && targetApps[0].id !== PRIMARY_SOURCE.id) {
            const app = targetApps[0];
            const targetDir = join(baseDir, getAppResourceDir(app, resourceType), resource.id);

            if (existsSync(targetDir)) {
                rmSync(targetDir, { recursive: true, force: true });
            }

            mkdirSync(targetDir, { recursive: true });
            cpSync(sourceDir, targetDir, { recursive: true });
            cleanGit(targetDir);

            result.targets.push({ agent: app.id, path: targetDir, type: 'copy' });
            return result;
        }

        // 多 App 或包含 PRIMARY：主源 + Symlink
        const primaryDir = join(baseDir, getAppResourceDir(PRIMARY_SOURCE, resourceType), resource.id);

        if (existsSync(primaryDir)) {
            rmSync(primaryDir, { recursive: true, force: true });
        }

        mkdirSync(primaryDir, { recursive: true });
        cpSync(sourceDir, primaryDir, { recursive: true });
        cleanGit(primaryDir);

        result.primaryPath = primaryDir;
        result.targets.push({ agent: PRIMARY_SOURCE.id, path: primaryDir, type: 'copy' });

        // 为其他 App 创建 Symlink
        for (const app of targetApps) {
            if (app.id === PRIMARY_SOURCE.id) continue;
            if (scope === 'global' && !app.globalBaseDir) continue;

            const appDir = getAppResourceDir(app, resourceType);
            const targetDir = join(baseDir, appDir, resource.id);

            if (existsSync(targetDir)) {
                rmSync(targetDir, { recursive: true, force: true });
            }

            mkdirSync(join(baseDir, appDir), { recursive: true });

            if (!useSymlinks) {
                cpSync(sourceDir, targetDir, { recursive: true });
                cleanGit(targetDir);
                result.targets.push({ agent: app.id, path: targetDir, type: 'copy' });
            } else {
                try {
                    const relativePath = relative(join(baseDir, appDir), primaryDir);
                    symlinkSync(relativePath, targetDir);
                    result.targets.push({ agent: app.id, path: targetDir, type: 'link' });
                } catch {
                    // Windows 回退
                    if (platform() === 'win32') {
                        cpSync(sourceDir, targetDir, { recursive: true });
                        cleanGit(targetDir);
                        result.targets.push({ agent: app.id, path: targetDir, type: 'copy' });
                    }
                }
            }
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

function cleanGit(dir: string): void {
    const gitDir = join(dir, '.git');
    if (existsSync(gitDir)) {
        rmSync(gitDir, { recursive: true, force: true });
    }
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
    const baseDir = scope === 'global' ? homedir() : process.cwd();
    const apps = getAppsByIds(appIds);

    for (const app of apps) {
        const appDir = getAppResourceDir(app, resourceType);
        const targetDir = join(baseDir, appDir, resourceId);

        if (existsSync(targetDir)) {
            existing.push(app.name);
        }
    }

    // 检查 PRIMARY_SOURCE
    const primaryDir = join(baseDir, getAppResourceDir(PRIMARY_SOURCE, resourceType), resourceId);
    if (existsSync(primaryDir) && !existing.includes(PRIMARY_SOURCE.name)) {
        existing.push(PRIMARY_SOURCE.name);
    }

    return existing;
}

// ═══════════════════════════════════════════════════════════════════════════
// 导出 App 工具（便于命令层使用）
// ═══════════════════════════════════════════════════════════════════════════

export { detectApps, getAppsByIds } from './agents.js';
