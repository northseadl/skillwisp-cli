/**
 * install 命令
 *
 * v2.3: Opt-in 模式 + i18n
 * - 展示全部 10 个工具，从偏好读取初始选中
 * - 静默保存选择，无确认步骤
 * - 检测到的工具显示 ✓ hint
 */

import * as p from '@clack/prompts';

import { findResource, findResourceByFullName, searchResources, localizeResource } from '../core/registry.js';
import { installResource, checkExists } from '../core/installer.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE, TARGET_APPS } from '../core/agents.js';
import { getDefaultAgents, saveDefaultAgents } from '../core/preferences.js';
import type { ResourceType } from '../core/types.js';
import { colors, symbols, createSpinner } from '../ui/theme.js';
import { getFullName } from './search.js';
import { initI18n, t, getLocaleData } from '../ui/i18n.js';

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
    initI18n();
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

    // 解析目标 App
    let agents: string[];

    if (options.target) {
        // 显式指定
        agents = [options.target];
    } else if (options.yes || !isTTY) {
        // 非交互模式：使用默认或自动检测
        agents = resolveTargetsNonInteractive();
    } else {
        // 交互模式：展示全部工具列表，静默保存
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
    const detectedSet = new Set(detectApps().map((a) => a.id));
    const savedDefaults = getDefaultAgents();

    // 构建完整选项列表（全部 10 个工具）
    const options = [
        // Primary Source (.agent) 始终第一个，并说明 symlink 机制
        {
            value: PRIMARY_SOURCE.id,
            label: PRIMARY_SOURCE.name,
            hint: `.agent (${t('primary_source')}) - ${t('primary_source_hint')}`,
        },
        // 其他 9 个工具
        ...TARGET_APPS.map((a) => {
            const detected = detectedSet.has(a.id) ? t('detected_mark') : '';
            return {
                value: a.id,
                label: `${a.name}${detected}`,
                hint: a.baseDir,
            };
        }),
    ];

    // initialValues: 从上次保存的偏好读取，无偏好则为空
    const initialValues = savedDefaults && savedDefaults.length > 0
        ? savedDefaults
        : [];

    console.log();
    // 显示操作提示
    console.log(colors.muted(`  ${t('select_targets_hint')}`));
    const selected = await p.multiselect({
        message: t('select_targets'),
        options,
        required: true,
        initialValues,
    });

    if (p.isCancel(selected)) {
        return null;
    }

    // 静默保存，无确认
    saveDefaultAgents(selected as string[]);

    return selected as string[];
}

function printError(message: string, options: InstallOptions): void {
    if (options.json) {
        console.log(JSON.stringify({ error: message }));
    } else if (!options.quiet) {
        console.error();
        console.error(colors.error(`${symbols.error} ${message}`));
    }
}
