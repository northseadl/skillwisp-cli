/**
 * install 命令
 *
 * PRIMARY_SOURCE (.agents) 自动作为隐式主源，用户选择的应用创建符号链接
 */

import { findResource, findResourceByFullName, searchResources, localizeResource } from '../core/registry.js';
import { installResource, checkExists, resolveInstallTargets, type InstallCompatNotice } from '../core/installer.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE } from '../core/agents.js';
import { getInstallRoot } from '../core/installPaths.js';
import { getDefaultAgents, hasDefaultAgents } from '../core/preferences.js';
import type { ResourceType } from '../core/types.js';
import { getLocaleData } from '../core/i18n.js';
import { colors, symbols, createSpinner } from '../core/terminal.js';
import { runInstallFlow } from '../ink/flows/index.js';
import { getFullName } from './search.js';

interface InstallOptions {
    type?: string;
    global?: boolean;
    target?: string;
    symlink?: boolean;
    verbose?: boolean;
    json?: boolean;
    quiet?: boolean;
    dryRun?: boolean;
    force?: boolean;
    yes?: boolean;
    rule?: boolean;
    workflow?: boolean;
}

export async function install(resourceId: string, options: InstallOptions = {}): Promise<void> {
    const isTTY = Boolean(process.stdout.isTTY);
    const locale = getLocaleData();

    // 解析资源类型
    let resourceType: ResourceType = 'skill';
    if (options.rule) resourceType = 'rule';
    else if (options.workflow) resourceType = 'workflow';
    else if (options.type && ['skill', 'rule', 'workflow'].includes(options.type)) {
        resourceType = options.type as ResourceType;
    }

    // 查找资源（支持全名 @source/id 或短名 id）
    let resource = findResourceByFullName(resourceId) || findResource(resourceId, resourceType);

    if (!resource) {
        const candidates = searchResources(resourceId);

        if (candidates.length === 0) {
            printError(`Resource not found: ${resourceId}`, options);
            if (!options.json) {
                console.error(colors.muted(`  Run: skillwisp search ${resourceId}`));
            }
            process.exit(3);
        }

        if (candidates.length === 1) {
            resource = candidates[0];
            if (!options.quiet && !options.json && isTTY) {
                console.log(colors.muted(`Matched: ${getFullName(resource)}`));
            }
        } else {
            printError(`Ambiguous resource: ${resourceId}`, options);
            if (!options.json) {
                console.error(colors.muted(`  ${candidates.length} candidates found:`));
                for (const c of candidates.slice(0, 5)) {
                    console.error(colors.muted(`    - ${getFullName(c)}`));
                }
                if (candidates.length > 5) {
                    console.error(colors.muted(`    ... and ${candidates.length - 5} more`));
                }
                console.error(colors.muted(`  Use full name: skillwisp install @source/id`));
            }
            process.exit(3);
        }
    }

    const fullName = getFullName(resource);
    const scope = options.global ? 'global' : 'local';

    // 解析目标 Agent
    let agents: string[];

    if (options.target) {
        // 显式指定
        agents = [options.target];
    } else if (options.yes || !isTTY) {
        // 非交互模式：使用默认或自动检测
        agents = resolveTargetsNonInteractive();
    } else {
        // 交互模式：使用 Ink 流程
        const resolved = await runInstallFlow(fullName);
        if (!resolved) {
            process.exit(0);
        }
        agents = resolved;
    }

    if (agents.length === 0) {
        printError('No installation targets found', options);
        if (!options.json) {
            console.error(colors.muted(`  Run: skillwisp config to set default targets`));
        }
        process.exit(2);
    }

    const selectedAgents = [...agents];

    // 兼容处理：部分 App 与主源目录复用（不创建独立目录）
    const resolved = resolveInstallTargets(selectedAgents, resourceType, scope);
    const compatNotices = resolved.compat;
    const installAgents = resolved.agentIds;

    if (installAgents.length === 0) {
        printError('No installation targets found', options);
        process.exit(2);
    }

    // 显示兼容提示
    printCompatNotices(compatNotices, options);

    // 全局安装：过滤/校验不支持 global 的目标（例如缺少 globalBaseDir 的工具）
    if (scope === 'global') {
        const unsupported = getAppsByIds(installAgents)
            .filter((a) => getInstallRoot(a, resourceType, 'global') === null)
            .map((a) => a.id);

        if (unsupported.length > 0) {
            printError(`Targets do not support global install: ${unsupported.join(', ')}`, options);
            process.exit(2);
        }
    }

    // 检查是否已存在
    if (!options.force) {
        const existing = checkExists(resource.id, resourceType, installAgents, scope);
        if (existing.length > 0) {
            printError(`Resource already exists: ${fullName}`, options);
            if (!options.json) {
                console.error(colors.muted(`  Existing at: ${existing.join(', ')}`));
                console.error(colors.muted(`  Use --force to overwrite`));
            }
            process.exit(5);
        }
    }

    // --dry-run
    if (options.dryRun) {
        const targetNames = getAppsByIds(selectedAgents).map((a) => a.name);

        if (options.json) {
            console.log(JSON.stringify({
                dryRun: true,
                resource: { fullName, id: resource.id, type: resourceType },
                targets: targetNames,
                scope,
                ...(compatNotices.length > 0 ? { compat: compatNotices } : {}),
            }, null, 2));
        } else {
            console.log();
            console.log(colors.warning(`${symbols.warning} Dry run (no changes made)`));
            console.log();
            console.log(`  Resource: ${colors.bold(fullName)} (${resourceType})`);
            console.log(`  Targets:  ${targetNames.join(', ')}`);
            console.log(`  Scope:    ${scope}`);
            console.log(`  Symlinks: ${options.symlink !== false ? 'yes' : 'no'}`);
            console.log();
        }
        return;
    }

    // 执行安装
    const spinner = createSpinner();
    spinner.start(`Installing ${fullName}…`);

    try {
        const result = installResource(resource, {
            agents: installAgents,
            useSymlinks: options.symlink !== false,
            scope,
            resourceType,
        });

        if (!result.success) {
            spinner.stop(`Failed to install ${fullName}`, 'error');
            if (!options.json) {
                console.error(colors.muted(`  ${result.error || 'Unknown error'}`));
            }
            process.exit(5);
        }

        // --json
        if (options.json) {
            spinner.stop('', 'success');
            const output = {
                resource: {
                    fullName,
                    id: resource.id,
                    type: resourceType,
                    name: localizeResource(resource, locale).name,
                },
                installations: result.targets.map((t) => ({
                    agent: t.agent,
                    path: t.path,
                    type: t.type,
                })),
                ...(result.compat && result.compat.length > 0 ? { compat: result.compat } : {}),
            };
            console.log(JSON.stringify(output, null, 2));
            return;
        }

        // --quiet
        if (options.quiet) {
            spinner.stop(fullName, 'success');
            return;
        }

        // 默认输出
        const targetNames = getAppsByIds(selectedAgents).map((a) => a.name);
        const summary = `${fullName} → ${targetNames.join(', ')}`;
        spinner.stop(summary, 'success');

        // --verbose
        if (options.verbose) {
            console.log();
            console.log(colors.muted('  Installation paths:'));
            for (const t of result.targets) {
                const typeHint = t.type === 'link' ? ' (symlink)' : '';
                console.log(colors.muted(`    ${t.agent}: ${t.path}${typeHint}`));
            }
            if (result.primaryPath) {
                console.log(colors.muted(`    Primary: ${result.primaryPath}`));
            }
        }

        console.log();
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('process.exit:')) {
            throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        spinner.stop(`Failed: ${message}`, 'error');
        process.exit(4);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 目标解析（非交互模式）
// ═══════════════════════════════════════════════════════════════════════════

function resolveTargetsNonInteractive(): string[] {
    const saved = getDefaultAgents();
    // 自动添加 PRIMARY_SOURCE 作为隐式主源
    if (saved && saved.length > 0) {
        const filteredSaved = saved.filter(id => id !== PRIMARY_SOURCE.id);
        return [PRIMARY_SOURCE.id, ...filteredSaved];
    }

    const detected = detectApps();
    if (detected.length > 0) {
        return [PRIMARY_SOURCE.id, ...detected.map((a) => a.id)];
    }

    // 如果没有检测到任何应用，仅安装到 PRIMARY_SOURCE
    return [PRIMARY_SOURCE.id];
}

function printError(message: string, options: InstallOptions): void {
    if (options.json) {
        console.log(JSON.stringify({ error: message }));
    } else if (!options.quiet) {
        console.error();
        console.error(colors.error(`${symbols.error} ${message}`));
    }
}

function formatCompatNotice(notice: InstallCompatNotice): string {
    const note = notice.note ? ` ${notice.note}` : '';
    return `${notice.name} 兼容${note}（已使用主源目录，无需单独安装）`;
}

function printCompatNotices(notices: InstallCompatNotice[], options: InstallOptions): void {
    if (notices.length === 0) return;
    if (options.json || options.quiet) return;

    console.error();
    for (const notice of notices) {
        console.error(colors.warning(`${symbols.warning} ${formatCompatNotice(notice)}`));
    }
    console.error();
}
