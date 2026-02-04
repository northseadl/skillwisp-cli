/**
 * 交互式主界面
 *
 * v2.1 优化：
 * - Scope 优先：先选择安装范围（本地/全局），再选择目标 App
 * - 术语统一：用户界面使用 App/Target，不使用 Agent
 * - 全局安装：.agent 作为源，不作为可选目标
 * - i18n：支持多语言（首次运行时选择语言）
 */

import * as p from '@clack/prompts';
import { homedir } from 'node:os';

import {
    loadResources,
    localizeResource,
    searchResources,
    getIndexVersion,
    clearCache,
} from '../core/registry.js';
import { installResource, detectApps, getAppsByIds } from '../core/installer.js';
import { getDefaultAgents, saveDefaultAgents } from '../core/preferences.js';
import { PRIMARY_SOURCE, TARGET_APPS } from '../core/agents.js';

import type { Resource } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols, createSpinner, truncate, getResourceColor } from '../ui/theme.js';
import { backgroundUpdate, type UpdateResult } from '../core/updater.js';
import { CLI_VERSION, checkCliUpdate, shouldPromptCliUpdate, type CliVersionInfo } from '../core/version.js';
import {
    initI18n,
    needsLanguageSetup,
    setLocale,
    getLocaleData,
    t,
    SUPPORTED_LOCALES,
    type LocaleCode,
} from '../ui/i18n.js';

type Action = 'browse' | 'install' | 'installed' | 'language' | 'help' | 'exit';
type InstallScope = 'local' | 'global';

// 后台更新结果（用于退出时提示）
let pendingUpdateResult: UpdateResult | null = null;
let pendingCliInfo: CliVersionInfo | null = null;

export async function main(): Promise<void> {
    // 初始化 i18n
    initI18n();

    // 首次运行：让用户选择语言
    if (needsLanguageSetup()) {
        const selectedLocale = await p.select({
            message: 'Select your language / 选择语言',
            options: SUPPORTED_LOCALES.map((l) => ({
                value: l.code as LocaleCode,
                label: l.name,
            })),
        });

        if (!p.isCancel(selectedLocale)) {
            setLocale(selectedLocale);
        }
    }

    console.log();
    console.log(colors.bold(t('welcome')));
    console.log(colors.muted(`v${CLI_VERSION} · Index ${getIndexVersion()}`));
    console.log();

    // 首次进入时触发后台检测（不阻塞）
    if (pendingUpdateResult === null && pendingCliInfo === null) {
        startBackgroundChecks();
    }

    const action = await p.select({
        message: t('what_would_you_like'),
        options: [
            { value: 'browse' as const, label: t('menu_browse') },
            { value: 'install' as const, label: t('menu_install') },
            { value: 'installed' as const, label: t('menu_installed') },
            { value: 'language' as const, label: t('menu_language') },
            { value: 'help' as const, label: t('menu_help') },
            { value: 'exit' as const, label: t('menu_exit') },
        ],
    });

    if (p.isCancel(action) || action === 'exit') {
        showPendingNotifications();
        console.log(colors.muted(t('goodbye')));
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
        case 'language':
            await changeLanguage();
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
            console.log(colors.success(`${symbols.success} ${t('index_updated')} ${pendingUpdateResult.version}`));
        } else if (pendingUpdateResult.requiresCliUpgrade) {
            console.log();
            console.log(colors.warning(
                `${symbols.warning} ${t('index_update_requires_cli')} ${pendingUpdateResult.minCliVersion}\n` +
                `   ${t('run_to_upgrade')}: ${colors.info('npm install -g skillwisp')}`
            ));
        }
    }

    // CLI 版本通知
    if (pendingCliInfo && shouldPromptCliUpdate(pendingCliInfo)) {
        console.log();
        console.log(colors.info(
            `📦 ${t('cli_update_available')}: ${colors.bold(`v${pendingCliInfo.latest}`)}\n` +
            `   ${t('run_to_upgrade')}: ${colors.info('npm install -g skillwisp')}`
        ));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Browse：合并搜索 + 类型过滤
// ═══════════════════════════════════════════════════════════════════════════

async function browseResources(): Promise<void> {
    const locale = getLocaleData();

    // 合并搜索和类型选择为一步
    const query = await p.text({
        message: t('search_prompt'),
        placeholder: t('search_placeholder'),
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
        console.log(colors.warning(`${symbols.warning} ${t('no_results')}`));
        return main();
    }

    // 选择资源（显示来源）
    const selected = await p.multiselect({
        message: `${t('select_resources')} (${resources.length} ${t('available_count')})`,
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
    const locale = getLocaleData();

    const resourceId = await p.text({
        message: t('enter_resource_id'),
        placeholder: t('resource_id_placeholder'),
        validate: (value) => {
            if (!value) return t('resource_id_required');
            return undefined;
        },
    });

    if (p.isCancel(resourceId)) {
        return main();
    }

    const matches = searchResources(resourceId);

    if (matches.length === 0) {
        console.log();
        console.log(colors.error(`${symbols.error} ${t('resource_not_found')}: ${resourceId}`));
        console.log(colors.muted(`  ${t('try_search')} ${resourceId}`));
        return main();
    }

    let resource: Resource;

    if (matches.length === 1) {
        resource = matches[0];
        console.log(colors.muted(`${t('matched')}: ${resource.id} @${resource.source}`));
    } else {
        const choice = await p.select({
            message: t('found_matches'),
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

// ═════════════════════════════════════════════════════════════════════════════
// Help & Language
// ═════════════════════════════════════════════════════════════════════════════

async function showHelp(): Promise<void> {
    console.log();
    console.log(colors.bold(t('help_title')));
    console.log(colors.muted(t('help_subtitle')));
    console.log();

    console.log(colors.bold(t('help_interactive')));
    console.log('  skillwisp');
    console.log(colors.muted('  Browse → Select → Install'));
    console.log();

    console.log(colors.bold(t('help_commands')));
    console.log('  skillwisp search <keyword>    ' + colors.muted('# search registry'));
    console.log('  skillwisp catalog             ' + colors.muted('# list all'));
    console.log('  skillwisp install <id>        ' + colors.muted('# install (add is alias)'));
    console.log('  skillwisp add <id> --type rule' + colors.muted('# install as rule'));
    console.log('  skillwisp list                ' + colors.muted('# list installed'));
    console.log('  skillwisp info <id>           ' + colors.muted('# show details'));
    console.log('  skillwisp config              ' + colors.muted('# manage preferences'));
    console.log();

    console.log(colors.bold(t('help_flags')));
    console.log('  --json      ' + colors.muted('# JSON output'));
    console.log('  --verbose   ' + colors.muted('# detailed output'));
    console.log('  --dry-run   ' + colors.muted('# preview install'));
    console.log();

    await p.select({
        message: t('back'),
        options: [{ value: 'back' as const, label: t('back_to_menu') }],
    });

    await main();
}

async function changeLanguage(): Promise<void> {
    const selectedLocale = await p.select({
        message: t('select_language'),
        options: SUPPORTED_LOCALES.map((l) => ({
            value: l.code as LocaleCode,
            label: l.name,
        })),
    });

    if (!p.isCancel(selectedLocale)) {
        setLocale(selectedLocale);
        console.log();
        console.log(colors.success(`${symbols.success} ${t('language_saved')}`));
    }

    await main();
}

// ═══════════════════════════════════════════════════════════════════════════
// Scope 选择
// ═══════════════════════════════════════════════════════════════════════════

async function selectInstallScope(): Promise<InstallScope | null> {
    const cwd = process.cwd();
    const home = homedir();

    const scope = await p.select({
        message: t('installation_scope'),
        options: [
            { value: 'local' as const, label: t('scope_local'), hint: cwd },
            { value: 'global' as const, label: t('scope_global'), hint: home },
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
    const detectedSet = new Set(detectApps().map((a) => a.id));
    const savedDefaults = getDefaultAgents();

    // 构建完整选项列表（全部 10 个工具）- Opt-in 模式
    const options = [
        // Primary Source (.agent) 始终第一个，并说明 symlink 机制
        {
            value: PRIMARY_SOURCE.id,
            label: PRIMARY_SOURCE.name,
            hint: isGlobal
                ? `~/.agent (${t('primary_source')}) - ${t('primary_source_hint')}`
                : `.agent (${t('primary_source')}) - ${t('primary_source_hint')}`,
        },
        // 其他 9 个工具
        ...TARGET_APPS.map((a) => {
            const dir = isGlobal ? `~/${a.globalBaseDir || a.baseDir}` : a.baseDir;
            const detected = detectedSet.has(a.id) ? t('detected_mark') : '';
            return {
                value: a.id,
                label: `${a.name}${detected}`,
                hint: dir,
            };
        }),
    ];

    // initialValues: 从上次保存的偏好读取，无偏好则为空
    const initialValues = savedDefaults && savedDefaults.length > 0
        ? savedDefaults
        : [];

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
        spinner.start(`${t('installing')} ${resource.name}…`);

        const result = installResource(resource, { agents: apps, scope });

        if (result.success) {
            const appList = result.targets.map((t) => t.agent).join(', ');
            spinner.stop(
                `${typeColor(`[${typeLabel}]`)} ${resource.name} ${colors.muted(`-> ${appList}`)}`,
                'success'
            );
        } else {
            spinner.stop(`${resource.name}: ${result.error || t('unknown_error')}`, 'error');
        }
    }

    console.log();
}
