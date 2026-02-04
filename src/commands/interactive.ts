/**
 * 交互式主界面
 *
 * v2.1 优化：
 * - Scope 优先：先选择安装范围（本地/全局），再选择目标 App
 * - 术语统一：用户界面使用 App/Target，不使用 Agent
 * - 全局安装：.agent 作为源，不作为可选目标
 */

import * as p from '@clack/prompts';
import { homedir } from 'node:os';

import {
    loadResources,
    loadLocale,
    localizeResource,
    searchResources,
    getIndexVersion,
    clearCache,
} from '../core/registry.js';
import { installResource, detectApps, getAppsByIds } from '../core/installer.js';
import { hasDefaultAgents, getDefaultAgents, saveDefaultAgents } from '../core/preferences.js';
import { PRIMARY_SOURCE } from '../core/agents.js';
import { getInstallRoot } from '../core/installPaths.js';
import type { Resource } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols, createSpinner, truncate, getResourceColor } from '../ui/theme.js';
import { backgroundUpdate, type UpdateResult } from '../core/updater.js';
import { CLI_VERSION, checkCliUpdate, shouldPromptCliUpdate, type CliVersionInfo } from '../core/version.js';

type Action = 'browse' | 'install' | 'installed' | 'integrations' | 'help' | 'exit';
type InstallScope = 'local' | 'global';

// 后台更新结果（用于退出时提示）
let pendingUpdateResult: UpdateResult | null = null;
let pendingCliInfo: CliVersionInfo | null = null;

export async function main(): Promise<void> {
    console.log();
    console.log(colors.bold('SkillWisp CLI'));
    console.log(colors.muted(`v${CLI_VERSION} · Index ${getIndexVersion()}`));
    console.log();

    // 首次进入时触发后台检测（不阻塞）
    if (pendingUpdateResult === null && pendingCliInfo === null) {
        startBackgroundChecks();
    }

    const action = await p.select({
        message: 'What would you like to do?',
        options: [
            { value: 'browse' as const, label: 'Browse and install resources' },
            { value: 'install' as const, label: 'Quick install by ID' },
            { value: 'installed' as const, label: 'View installed resources' },
            { value: 'integrations' as const, label: 'Manage integrations (default targets)' },
            { value: 'help' as const, label: 'Help' },
            { value: 'exit' as const, label: 'Exit' },
        ],
    });

    if (p.isCancel(action) || action === 'exit') {
        showPendingNotifications();
        console.log(colors.muted('Goodbye.'));
        process.exit(0);
    }

    switch (action) {
        case 'browse':
            await browseResources();
            break;
        case 'install':
            await quickInstall();
            break;
        case 'installed':
            await viewInstalled();
            break;
        case 'integrations':
            await manageIntegrations();
            break;
        case 'help':
            await showHelp();
            break;
    }
}

/**
 * 启动后台检测（索引更新 + CLI 版本）
 */
function startBackgroundChecks(): void {
    // 索引自动更新
    backgroundUpdate()
        .then((result) => {
            if (result) {
                pendingUpdateResult = result;
                if (result.success) {
                    // 自动更新成功，清除缓存
                    clearCache();
                }
            }
        })
        .catch(() => {
            // 静默失败
        });

    // CLI 版本检查
    checkCliUpdate()
        .then((info) => {
            pendingCliInfo = info;
        })
        .catch(() => {
            // 静默失败
        });
}

/**
 * 显示待处理的通知（退出时）
 */
function showPendingNotifications(): void {
    // 索引更新通知
    if (pendingUpdateResult) {
        if (pendingUpdateResult.success && pendingUpdateResult.version) {
            console.log();
            console.log(colors.success(`${symbols.success} 索引已自动更新到 ${pendingUpdateResult.version}`));
        } else if (pendingUpdateResult.requiresCliUpgrade) {
            console.log();
            console.log(colors.warning(
                `${symbols.warning} 新索引需要 CLI >= ${pendingUpdateResult.minCliVersion}\n` +
                `   运行 ${colors.info('npm install -g skillwisp')} 升级`
            ));
        }
    }

    // CLI 版本通知
    if (pendingCliInfo && shouldPromptCliUpdate(pendingCliInfo)) {
        console.log();
        console.log(colors.info(
            `📦 CLI 新版本 ${colors.bold(`v${pendingCliInfo.latest}`)} 可用\n` +
            `   运行 ${colors.info('npm install -g skillwisp')} 更新`
        ));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Browse：合并搜索 + 类型过滤
// ═══════════════════════════════════════════════════════════════════════════

async function browseResources(): Promise<void> {
    const locale = loadLocale('zh-CN');

    // 合并搜索和类型选择为一步
    const query = await p.text({
        message: 'Search resources (leave empty to show all)',
        placeholder: 'e.g. pdf, docx, git',
    });

    if (p.isCancel(query)) {
        return main();
    }

    // 获取资源
    let resources: Resource[];
    if (query) {
        resources = searchResources(query);
    } else {
        resources = loadResources();
    }

    // 本地化
    resources = resources.map((r) => localizeResource(r, locale));

    if (resources.length === 0) {
        console.log();
        console.log(colors.warning(`${symbols.warning} No resources found`));
        return main();
    }

    // 选择资源（显示来源）
    const selected = await p.multiselect({
        message: `Select resources to install (${resources.length} available)`,
        options: resources.map((r) => ({
            value: r.id,
            label: formatResourceLabel(r),
            hint: truncate(r.description, 35),
        })),
        required: false,
    });

    if (p.isCancel(selected) || selected.length === 0) {
        return main();
    }

    // 选择安装范围
    const scope = await selectInstallScope();
    if (!scope) {
        return main();
    }

    // 选择目标 App
    const targetApps = await selectTargetApps(scope);
    if (!targetApps) {
        return main();
    }

    // 安装
    await installResources(selected as string[], resources, targetApps, scope);

    await main();
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Install：快速安装
// ═══════════════════════════════════════════════════════════════════════════

async function quickInstall(): Promise<void> {
    const locale = loadLocale('zh-CN');

    const resourceId = await p.text({
        message: 'Enter resource ID',
        placeholder: 'e.g. pdf, docx, mcp-builder',
        validate: (value) => {
            if (!value) return 'Resource ID is required';
            return undefined;
        },
    });

    if (p.isCancel(resourceId)) {
        return main();
    }

    const matches = searchResources(resourceId);

    if (matches.length === 0) {
        console.log();
        console.log(colors.error(`${symbols.error} Resource not found: ${resourceId}`));
        console.log(colors.muted(`  Try: skillwisp search ${resourceId}`));
        return main();
    }

    let resource: Resource;

    if (matches.length === 1) {
        resource = matches[0];
        console.log(colors.muted(`Matched: ${resource.id} @${resource.source}`));
    } else {
        const choice = await p.select({
            message: `Found ${matches.length} matching resources`,
            options: matches.slice(0, 5).map((r) => ({
                value: r.id,
                label: formatResourceLabel(r),
                hint: r.id,
            })),
        });

        if (p.isCancel(choice)) {
            return main();
        }

        resource = matches.find((r) => r.id === choice)!;
    }

    // 选择安装范围
    const scope = await selectInstallScope();
    if (!scope) {
        return main();
    }

    // 选择目标 App
    const targetApps = await selectTargetApps(scope);
    if (!targetApps) {
        return main();
    }

    await installResources([resource.id], [localizeResource(resource, locale)], targetApps, scope);
    await main();
}

async function viewInstalled(): Promise<void> {
    const { list } = await import('./list.js');
    await list();
    await main();
}

// ═══════════════════════════════════════════════════════════════════════════
// Help & Integrations
// ═══════════════════════════════════════════════════════════════════════════

async function showHelp(): Promise<void> {
    console.log();
    console.log(colors.bold('Help'));
    console.log(colors.muted('Start here, learn commands gradually.'));
    console.log();

    console.log(colors.bold('Interactive'));
    console.log('  skillwisp');
    console.log(colors.muted('  Browse → Select → Install'));
    console.log();

    console.log(colors.bold('Commands'));
    console.log('  skillwisp search <keyword>    ' + colors.muted('# search registry'));
    console.log('  skillwisp catalog             ' + colors.muted('# list all'));
    console.log('  skillwisp install <id>        ' + colors.muted('# install (add is alias)'));
    console.log('  skillwisp add <id> --type rule' + colors.muted('# install as rule'));
    console.log('  skillwisp list                ' + colors.muted('# list installed'));
    console.log('  skillwisp info <id>           ' + colors.muted('# show details'));
    console.log('  skillwisp config              ' + colors.muted('# manage preferences'));
    console.log();

    console.log(colors.bold('Flags'));
    console.log('  --json      ' + colors.muted('# JSON output'));
    console.log('  --verbose   ' + colors.muted('# detailed output'));
    console.log('  --dry-run   ' + colors.muted('# preview install'));
    console.log();

    await p.select({
        message: 'Back',
        options: [{ value: 'back' as const, label: 'Back to menu' }],
    });

    await main();
}

async function manageIntegrations(): Promise<void> {
    console.log();
    console.log(colors.bold('Integrations'));
    console.log(colors.muted('Set default installation targets.'));
    console.log();

    const detectedApps = detectApps();

    if (detectedApps.length === 0) {
        console.log(colors.warning(`${symbols.warning} No apps detected`));
        console.log(colors.muted('  Tip: open a project with .claude/.cursor/.gemini/.codex'));
        console.log();
        await p.select({
            message: 'Back',
            options: [{ value: 'back' as const, label: 'Back to menu' }],
        });
        return main();
    }

    const existingDefault = getDefaultAgents();
    const initialValues = existingDefault?.length ? existingDefault : detectedApps.map((a) => a.id);

    const selected = await p.multiselect({
        message: 'Default installation targets',
        options: [
            { value: PRIMARY_SOURCE.id, label: PRIMARY_SOURCE.name, hint: 'Primary source (.agent)' },
            ...detectedApps.map((a) => ({ value: a.id, label: a.name, hint: a.baseDir })),
        ],
        required: true,
        initialValues,
    });

    if (p.isCancel(selected)) {
        return main();
    }

    saveDefaultAgents(selected as string[]);
    const names = getAppsByIds(selected as string[]).map((a) => a.name).join(', ');
    console.log();
    console.log(colors.success(`${symbols.success} Default targets saved: ${names}`));
    console.log();

    await main();
}

// ═══════════════════════════════════════════════════════════════════════════
// Scope 选择
// ═══════════════════════════════════════════════════════════════════════════

async function selectInstallScope(): Promise<InstallScope | null> {
    const cwd = process.cwd();
    const home = homedir();

    const scope = await p.select({
        message: 'Installation scope',
        options: [
            { value: 'local' as const, label: 'Current workspace', hint: cwd },
            { value: 'global' as const, label: 'Global (user-wide)', hint: home },
        ],
    });

    if (p.isCancel(scope)) {
        return null;
    }

    return scope;
}

// ═══════════════════════════════════════════════════════════════════════════
// Target App 选择
// ═══════════════════════════════════════════════════════════════════════════

async function selectTargetApps(scope: InstallScope): Promise<string[] | null> {
    const isGlobal = scope === 'global';
    const detectedApps = detectApps();
    const availableApps = isGlobal
        ? detectedApps.filter((a) => getInstallRoot(a, 'skill', 'global') !== null)
        : detectedApps;

    // 全局安装：.agent 是强制源，不显示为可选目标
    // 本地安装：.agent 可作为可选目标
    if (availableApps.length === 0) {
        if (isGlobal) {
            console.log(colors.muted(`Installing to ~/.agent (primary source)`));
        } else {
            console.log(colors.muted(`Installing to .agent (primary source)`));
        }
        return [PRIMARY_SOURCE.id];
    }

    // 已有默认 → 直接使用，不再询问
    if (hasDefaultAgents()) {
        const defaultApps = getDefaultAgents()!;
        // 全局安装时，过滤掉 agent，但确保安装器会使用它作为源
        let effectiveApps = isGlobal
            ? defaultApps.filter((id) => id !== PRIMARY_SOURCE.id)
            : defaultApps;

        if (isGlobal) {
            // 过滤掉不支持 global 的目标（例如 Cursor/Copilot/Kiro）
            effectiveApps = getAppsByIds(effectiveApps)
                .filter((a) => getInstallRoot(a, 'skill', 'global') !== null)
                .map((a) => a.id);
        }

        if (effectiveApps.length === 0 && isGlobal) {
            // 全局安装但默认只有 .agent，需要重新选择
        } else {
            const names = getAppsByIds(effectiveApps).map((a) => a.name).join(', ');
            console.log(colors.muted(`Targets: ${names}`));
            return effectiveApps.length > 0 ? effectiveApps : [PRIMARY_SOURCE.id];
        }
    }

    // 首次使用 → 选择并自动保存
    console.log();
    console.log(colors.bold('First time setup'));
    console.log(colors.muted('Select where to install resources. This will be saved.'));
    console.log();

    // 根据 scope 构建选项
    const options = isGlobal
        ? availableApps.map((a) => ({
            value: a.id,
            label: a.name,
            hint: `~/${a.globalBaseDir}`,
        }))
        : [
            { value: PRIMARY_SOURCE.id, label: PRIMARY_SOURCE.name, hint: 'Primary source (.agent)' },
            ...availableApps.map((a) => ({
                value: a.id,
                label: a.name,
                hint: a.baseDir,
            })),
        ];

    const selected = await p.multiselect({
        message: 'Select target apps',
        options,
        required: true,
        initialValues: availableApps.map((a) => a.id),
    });

    if (p.isCancel(selected)) {
        return null;
    }

    // 自动保存为默认
    saveDefaultAgents(selected as string[]);
    const names = getAppsByIds(selected as string[]).map((a) => a.name).join(', ');
    console.log(colors.success(`${symbols.success} Default targets saved: ${names}`));

    return selected as string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════

function formatResourceLabel(r: Resource): string {
    const typeConfig = RESOURCE_CONFIG[r.type];
    return `[${typeConfig.label}] ${r.name} ${colors.muted(`@${r.source}`)}`;
}

async function installResources(
    ids: string[],
    resources: Resource[],
    apps: string[],
    scope: InstallScope
): Promise<void> {
    console.log();

    for (const id of ids) {
        const resource = resources.find((r) => r.id === id);
        if (!resource) continue;

        const typeColor = getResourceColor(resource.type);
        const typeLabel = RESOURCE_CONFIG[resource.type].label;

        const spinner = createSpinner();
        spinner.start(`Installing ${resource.name}…`);

        const result = installResource(resource, { agents: apps, scope });

        if (result.success) {
            const appList = result.targets.map((t) => t.agent).join(', ');
            spinner.stop(
                `${typeColor(`[${typeLabel}]`)} ${resource.name} ${colors.muted(`-> ${appList}`)}`,
                'success'
            );
        } else {
            spinner.stop(`${resource.name}: ${result.error || 'Unknown error'}`, 'error');
        }
    }

    console.log();
}
