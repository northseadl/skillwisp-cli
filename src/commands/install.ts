/**
 * install 命令
 *
 * 安装资源
 * - 支持全名 @source/id 或短名 id
 * - 询问是否使用上次偏好
 * - --dry-run/--force 安全选项
 */

import * as p from '@clack/prompts';

import { findResource, findResourceByFullName, searchResources, loadLocale, localizeResource } from '../core/registry.js';
import { installResource, checkExists } from '../core/installer.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE } from '../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, hasDefaultAgents } from '../core/preferences.js';
import type { ResourceType } from '../core/types.js';
import { colors, symbols, createSpinner } from '../ui/theme.js';
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
    const locale = loadLocale('zh-CN');

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

    // 解析目标 Agent（交互式确认）
    let agents: string[];

    if (options.target) {
        // 显式指定
        agents = [options.target];
    } else if (options.yes || !isTTY) {
        // 非交互模式：使用默认或自动检测
        agents = resolveTargetsNonInteractive();
    } else {
        // 交互模式：询问是否使用上次偏好
        const resolved = await resolveTargetsInteractive();
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

    // 检查是否已存在
    if (!options.force) {
        const existing = checkExists(resource.id, resourceType, agents, scope);
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
        const targetNames = getAppsByIds(agents).map((a) => a.name);

        if (options.json) {
            console.log(JSON.stringify({
                dryRun: true,
                resource: { fullName, id: resource.id, type: resourceType },
                targets: targetNames,
                scope,
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
            agents,
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
        const targetNames = getAppsByIds(agents).map((a) => a.name);
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
        const message = error instanceof Error ? error.message : String(error);
        spinner.stop(`Failed: ${message}`, 'error');
        process.exit(4);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 目标解析
// ═══════════════════════════════════════════════════════════════════════════

function resolveTargetsNonInteractive(): string[] {
    const saved = getDefaultAgents();
    if (saved && saved.length > 0) {
        return saved;
    }

    const detected = detectApps();
    if (detected.length > 0) {
        return detected.map((a) => a.id);
    }

    return [PRIMARY_SOURCE.id];
}

async function resolveTargetsInteractive(): Promise<string[] | null> {
    const detectedAgents = detectApps();

    if (detectedAgents.length === 0) {
        console.log(colors.muted(`Installing to primary source (.agent)`));
        return [PRIMARY_SOURCE.id];
    }

    // 已保存偏好时，询问是否复用
    if (hasDefaultAgents()) {
        const savedAgents = getDefaultAgents()!;
        const names = getAppsByIds(savedAgents).map((a) => a.name).join(', ');

        console.log();
        const useDefault = await p.select({
            message: `Install to previous targets?`,
            options: [
                { value: 'yes' as const, label: `Yes → ${names}` },
                { value: 'no' as const, label: 'No, select targets manually' },
            ],
        });

        if (p.isCancel(useDefault)) {
            return null;
        }

        if (useDefault === 'yes') {
            return savedAgents;
        }
    }

    // 选项：Primary (.agent) + 检测到的 Agents
    const targetOptions = [
        { value: PRIMARY_SOURCE.id, label: PRIMARY_SOURCE.name, hint: 'Primary source (.agent)' },
        ...detectedAgents.map((a) => ({
            value: a.id,
            label: a.name,
            hint: a.baseDir,
        })),
    ];

    // 默认选中检测到的 Agents
    const preselected = detectedAgents.map((a) => a.id);

    console.log();
    const selected = await p.multiselect({
        message: 'Select target apps (Space to select, Enter to confirm)',
        options: targetOptions,
        required: false,
        initialValues: preselected,
    });

    if (p.isCancel(selected)) {
        return null;
    }

    // 无选中时，回退到第一个选项
    let targets = selected as string[];
    if (targets.length === 0) {
        targets = [targetOptions[0].value];
        console.log(colors.muted(`No selection made, defaulting to ${targetOptions[0].label}`));
    }

    const savePreference = await p.confirm({
        message: 'Save as default for future installs?',
        initialValue: true,
    });

    if (!p.isCancel(savePreference) && savePreference) {
        saveDefaultAgents(targets);
        const names = getAppsByIds(targets).map((a) => a.name).join(', ');
        console.log(colors.success(`${symbols.success} Default saved: ${names}`));
    }

    return targets;
}

function printError(message: string, options: InstallOptions): void {
    if (options.json) {
        console.log(JSON.stringify({ error: message }));
    } else if (!options.quiet) {
        console.error();
        console.error(colors.error(`${symbols.error} ${message}`));
    }
}
