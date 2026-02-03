/**
 * 交互式主界面
 *
 * v2.3 优化:
 * - 多语言支持 (i18n)，首次运行询问语言偏好
 * - Opt-in 模式：展示全部 10 个工具
 * - 初始选中从偏好读取，静默保存
 */

import * as p from '@clack/prompts';
import { homedir } from 'node:os';

import {
    loadResources,
    localizeResource,
    searchResources,
} from '../core/registry.js';
import { installResource, detectApps, getAppsByIds } from '../core/installer.js';
import { getDefaultAgents, saveDefaultAgents } from '../core/preferences.js';
import { PRIMARY_SOURCE, TARGET_APPS } from '../core/agents.js';
import type { Resource } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols, createSpinner, truncate, getResourceColor } from '../ui/theme.js';
import { initI18n, t, setLocale, needsLanguageSetup, SUPPORTED_LOCALES, getLocaleData, type LocaleCode } from '../ui/i18n.js';

type Action = 'browse' | 'install' | 'installed' | 'integrations' | 'language' | 'help' | 'exit';
type InstallScope = 'local' | 'global';

export async function main(): Promise<void> {
    // 初始化 i18n
    initI18n();

    // 首次运行：询问语言偏好
    if (needsLanguageSetup()) {
        await selectLanguage();
    }

    console.log();
    console.log(colors.bold(t('welcome')));
    console.log(colors.muted(t('welcome_subtitle')));
    console.log();

    const action = await p.select({
        message: t('what_would_you_like'),
        options: [
            { value: 'browse' as const, label: t('menu_browse') },
            { value: 'install' as const, label: t('menu_install') },
            { value: 'installed' as const, label: t('menu_installed') },
            { value: 'integrations' as const, label: t('menu_integrations') },
            { value: 'language' as const, label: '🌐 Language / 语言' },
            { value: 'help' as const, label: t('menu_help') },
            { value: 'exit' as const, label: t('menu_exit') },
        ],
    });

    if (p.isCancel(action) || action === 'exit') {
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
        case 'integrations':
            await manageIntegrations();
            break;
        case 'language':
            await selectLanguage();
            await main();
            break;
        case 'help':
            await showHelp();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 语言选择
// ═══════════════════════════════════════════════════════════════════════════

async function selectLanguage(): Promise<void> {
    console.log();

    const locale = await p.select({
        message: 'Select your language / 选择你的语言',
        options: SUPPORTED_LOCALES.map((l) => ({
            value: l.code as LocaleCode,
            label: l.name,
        })),
    });

    if (p.isCancel(locale)) {
        return;
    }

    setLocale(locale);
    console.log(colors.success(`${symbols.success} ${t('language_saved')}`));
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
        console.log(colors.error(`${symbols.error} ${t('no_results')}: ${resourceId}`));
        console.log(colors.muted(`  Try: skillwisp search ${resourceId}`));
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

// ═══════════════════════════════════════════════════════════════════════════
// Help
// ═══════════════════════════════════════════════════════════════════════════

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

async function manageIntegrations(): Promise<void> {
    console.log();
    console.log(colors.bold(t('integrations_title')));
    console.log(colors.muted(t('integrations_subtitle')));
    console.log();

    const detectedSet = new Set(detectApps().map((a) => a.id));
    const savedDefaults = getDefaultAgents();

    // 构建完整选项列表（全部 10 个工具）
    const options = [
        {
            value: PRIMARY_SOURCE.id,
            label: PRIMARY_SOURCE.name,
            hint: '.agent (primary source)',
        },
        ...TARGET_APPS.map((a) => {
            const detected = detectedSet.has(a.id) ? ' ✓' : '';
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

    const selected = await p.multiselect({
        message: t('default_targets'),
        options,
        required: true,
        initialValues,
    });

    if (p.isCancel(selected)) {
        return main();
    }

    // 静默保存
    saveDefaultAgents(selected as string[]);
    const names = getAppsByIds(selected as string[]).map((a) => a.name).join(', ');
    console.log();
    console.log(colors.success(`${symbols.success} ${t('saved')}: ${names}`));
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
// Target App 选择 (Opt-in 模式)
// ═══════════════════════════════════════════════════════════════════════════

async function selectTargetApps(scope: InstallScope): Promise<string[] | null> {
    const isGlobal = scope === 'global';
    const detectedSet = new Set(detectApps().map((a) => a.id));
    const savedDefaults = getDefaultAgents();

    // 构建完整选项列表（全部 10 个工具）
    const options = [
        // Primary Source (.agent) 始终第一个
        {
            value: PRIMARY_SOURCE.id,
            label: PRIMARY_SOURCE.name,
            hint: isGlobal ? `~/.agent (${t('primary_source')})` : `.agent (${t('primary_source')})`,
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
