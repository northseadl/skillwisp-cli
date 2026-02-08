/**
 * uninstall 命令
 *
 * 卸载已安装的资源
 * 支持按 scope 精确卸载，默认同时清理 local 和 global
 */

import { createInterface } from 'node:readline';
import { uninstallResource, getResourceDetail } from '../core/manager.js';
import type { ResourceType, InstallScope } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols } from '../core/terminal.js';

interface UninstallOptions {
    type?: string;
    global?: boolean;
    local?: boolean;
    json?: boolean;
    quiet?: boolean;
    force?: boolean;
}

/**
 * 通过 stdin readline 询问用户确认
 */
function askConfirm(question: string): Promise<boolean> {
    return new Promise((resolve) => {
        // 非 TTY 环境默认不确认（安全）
        if (!process.stdin.isTTY) {
            resolve(false);
            return;
        }

        const rl = createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

export async function uninstall(resourceId: string, options: UninstallOptions = {}): Promise<void> {
    const resourceType = (options.type || 'skill') as ResourceType;
    const typeConfig = RESOURCE_CONFIG[resourceType];

    if (!typeConfig) {
        console.error(colors.error(`${symbols.error} Unknown resource type: ${options.type}`));
        process.exit(2);
    }

    // 确定要清理的 scope
    const scopes: InstallScope[] = [];
    if (options.global) scopes.push('global');
    if (options.local) scopes.push('local');
    if (scopes.length === 0) scopes.push('local', 'global'); // 默认清理所有

    // --json 模式
    if (options.json) {
        const results = scopes.map((scope) => {
            const result = uninstallResource(resourceId, resourceType, scope);
            return { scope, ...result };
        });
        console.log(JSON.stringify(results, null, 2));
        return;
    }

    // 展示详情并确认（非 --force 时）
    if (!options.force) {
        let found = false;
        for (const scope of scopes) {
            const detail = getResourceDetail(resourceId, resourceType, scope);
            if (detail) {
                found = true;
                if (!options.quiet) {
                    console.log();
                    console.log(`${colors.bold(resourceId)} [${typeConfig.label}] (${scope})`);
                    if (detail.primaryPath) {
                        console.log(`  ${symbols.bullet} Primary: ${colors.muted(detail.primaryPath)}`);
                    }
                    for (const ap of detail.agentPaths) {
                        const linkHint = ap.isLink ? ' (symlink)' : '';
                        console.log(`  ${symbols.bullet} ${ap.agentName}: ${colors.muted(ap.path)}${linkHint}`);
                    }
                }
            }
        }

        if (!found) {
            if (!options.quiet) {
                console.log();
                console.log(colors.warning(`${symbols.warning} Resource "${resourceId}" (${resourceType}) not found`));
                console.log();
            }
            process.exit(3);
        }

        // 询问确认
        if (!options.quiet) {
            console.log();
            const confirmed = await askConfirm(
                colors.warning(`${symbols.warning} Are you sure you want to uninstall "${resourceId}"? (y/N) `)
            );
            if (!confirmed) {
                console.log(colors.muted('  Cancelled.'));
                console.log();
                return;
            }
        }
    }

    // 执行卸载
    let totalRemoved = 0;

    for (const scope of scopes) {
        const result = uninstallResource(resourceId, resourceType, scope);

        if (result.success) {
            totalRemoved += result.removedPaths.length;
            if (!options.quiet) {
                console.log();
                console.log(colors.success(`${symbols.success} Removed ${result.removedPaths.length} path(s) from ${scope}`));
                for (const p of result.removedPaths) {
                    console.log(`  ${colors.muted(p)}`);
                }
            }
        }
    }

    if (totalRemoved === 0 && !options.quiet) {
        console.log();
        console.log(colors.warning(`${symbols.warning} Nothing to remove`));
    }

    if (!options.quiet) {
        console.log();
    }
}

