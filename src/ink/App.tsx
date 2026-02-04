/**
 * SkillWisp CLI - Ink 主应用
 * 
 * 使用 Flexbox 布局实现：
 * - 固定顶部 Header
 * - 中间内容区域（自动扩展）
 * - 固定底部 Footer（操作提示栏）
 * 
 * 特性：
 * - 纯 Ink 实现（无 clack 依赖）
 * - Nord-style 配色
 * - 完整 i18n 支持
 * - 语言选择集成
 */

import { Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useState, useCallback, useEffect, type ReactNode } from 'react';
import {
    Header,
    Footer,
    SelectMenu,
    MultiSelectMenu,
    TextInput,
    InstallSummary,
    LanguageSelector,
    type MenuItem
} from './components/index.js';
import { colors, symbols } from './theme.js';

import {
    loadResources,
    localizeResource,
    searchResources,
    getIndexVersion,
} from '../core/registry.js';
import { installResource, detectApps, getAppsByIds } from '../core/installer.js';
import { getDefaultAgents } from '../core/preferences.js';
import { PRIMARY_SOURCE, TARGET_APPS } from '../core/agents.js';
import type { Resource } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { CLI_VERSION } from '../core/version.js';
import { needsLanguageSetup, setLocale, t, getLocaleData, type LocaleCode } from '../ui/i18n.js';

// ═══════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════

type Screen =
    | 'language-select'
    | 'main-menu'
    | 'browse-search'
    | 'browse-select'
    | 'install-scope'
    | 'install-targets'
    | 'installing'
    | 'install-complete'
    | 'quick-install'
    | 'installed-list'
    | 'help';

type InstallScope = 'local' | 'global';

interface InstallResult {
    successCount: number;
    failCount: number;
    installedNames: string[];
    targetApps: string[];
}

interface AppState {
    screen: Screen;
    searchQuery: string;
    searchResults: Resource[];
    selectedResources: string[];
    installScope: InstallScope;
    selectedTargets: string[];
    installResult: InstallResult | null;
    hint: string;
    isInstalling: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════

function formatResourceLabel(r: Resource): string {
    const typeConfig = RESOURCE_CONFIG[r.type];
    return `[${typeConfig.label}] ${r.name} @${r.source}`;
}

function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 1) + '…';
}

// ═══════════════════════════════════════════════════════════════════════════
// 主应用组件
// ═══════════════════════════════════════════════════════════════════════════

export function App(): ReactNode {
    const { exit } = useApp();
    const locale = getLocaleData();

    // 判断是否需要语言选择
    const initialScreen: Screen = needsLanguageSetup() ? 'language-select' : 'main-menu';

    const [state, setState] = useState<AppState>({
        screen: initialScreen,
        searchQuery: '',
        searchResults: [],
        selectedResources: [],
        installScope: 'local',
        selectedTargets: [],
        installResult: null,
        hint: t('hint_navigation'),
        isInstalling: false,
    });

    // 全局退出处理
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            console.log('\n' + t('goodbye'));
            exit();
        }
    });

    // 导航到不同屏幕
    const navigate = useCallback((screen: Screen, updates?: Partial<AppState>) => {
        setState((prev) => ({ ...prev, screen, ...updates }));
    }, []);

    // ═══════════════════════════════════════════════════════════════════════
    // 语言选择处理
    // ═══════════════════════════════════════════════════════════════════════

    const handleLanguageSelect = useCallback((localeCode: LocaleCode) => {
        setLocale(localeCode);
        navigate('main-menu', { hint: t('hint_navigation') });
    }, [navigate]);

    // ═══════════════════════════════════════════════════════════════════════
    // 主菜单逻辑
    // ═══════════════════════════════════════════════════════════════════════

    const mainMenuItems: MenuItem<string>[] = [
        { label: t('menu_browse'), value: 'browse', hint: t('menu_browse_hint') },
        { label: t('menu_install'), value: 'install', hint: t('menu_install_hint') },
        { label: t('menu_installed'), value: 'installed', hint: t('menu_installed_hint') },
        { label: t('menu_help'), value: 'help' },
        { label: t('menu_exit'), value: 'exit' },
    ];

    const handleMainMenuSelect = useCallback((value: string) => {
        switch (value) {
            case 'browse':
                navigate('browse-search');
                break;
            case 'install':
                navigate('quick-install');
                break;
            case 'installed':
                navigate('installed-list');
                break;
            case 'help':
                navigate('help');
                break;
            case 'exit':
                console.log('\n' + t('goodbye'));
                exit();
                break;
        }
    }, [navigate, exit]);

    // ═══════════════════════════════════════════════════════════════════════
    // 搜索处理
    // ═══════════════════════════════════════════════════════════════════════

    const handleSearchSubmit = useCallback((query: string) => {
        let resources: Resource[];
        if (query) {
            resources = searchResources(query);
        } else {
            resources = loadResources();
        }
        resources = resources.map((r) => localizeResource(r, locale));

        if (resources.length === 0) {
            navigate('main-menu');
            return;
        }

        navigate('browse-select', {
            searchQuery: query,
            searchResults: resources,
        });
    }, [navigate, locale]);

    // ═══════════════════════════════════════════════════════════════════════
    // 资源选择处理
    // ═══════════════════════════════════════════════════════════════════════

    const handleResourceSelect = useCallback((ids: string[]) => {
        if (ids.length === 0) {
            navigate('main-menu');
            return;
        }
        navigate('install-scope', { selectedResources: ids });
    }, [navigate]);

    // ═══════════════════════════════════════════════════════════════════════
    // 安装范围选择
    // ═══════════════════════════════════════════════════════════════════════

    const handleScopeSelect = useCallback((scope: string) => {
        navigate('install-targets', { installScope: scope as InstallScope });
    }, [navigate]);

    // ═══════════════════════════════════════════════════════════════════════
    // 目标应用选择
    // ═══════════════════════════════════════════════════════════════════════

    const handleTargetsSubmit = useCallback((targets: string[]) => {
        if (targets.length === 0) {
            navigate('main-menu');
            return;
        }

        navigate('installing', { selectedTargets: targets, isInstalling: true });

        // 异步执行安装
        setTimeout(() => {
            const resources = state.searchResults.filter(
                (r) => state.selectedResources.includes(r.id)
            );
            const apps = getAppsByIds(targets);
            const isGlobal = state.installScope === 'global';

            let successCount = 0;
            let failCount = 0;
            const installedNames: string[] = [];

            for (const resource of resources) {
                for (const app of apps) {
                    try {
                        installResource(resource, {
                            agents: [app.id],
                            scope: isGlobal ? 'global' : 'local',
                        });
                        successCount++;
                        if (!installedNames.includes(resource.name)) {
                            installedNames.push(resource.name);
                        }
                    } catch {
                        failCount++;
                    }
                }
            }

            const result: InstallResult = {
                successCount,
                failCount,
                installedNames,
                targetApps: targets,
            };

            navigate('install-complete', { installResult: result, isInstalling: false });
        }, 100);
    }, [navigate, state.searchResults, state.selectedResources, state.installScope]);

    // ═══════════════════════════════════════════════════════════════════════
    // 安装完成后导航
    // ═══════════════════════════════════════════════════════════════════════

    const handlePostInstallSelect = useCallback((value: string) => {
        if (value === 'home') {
            navigate('main-menu');
        } else {
            console.log('\n' + t('goodbye'));
            exit();
        }
    }, [navigate, exit]);

    // ═══════════════════════════════════════════════════════════════════════
    // Help 返回处理
    // ═══════════════════════════════════════════════════════════════════════

    useInput((input, key) => {
        if (state.screen === 'help' && (key.return || key.escape)) {
            navigate('main-menu');
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 渲染当前屏幕
    // ═══════════════════════════════════════════════════════════════════════

    const renderContent = (): ReactNode => {
        switch (state.screen) {
            case 'language-select':
                return <LanguageSelector onSelect={handleLanguageSelect} />;

            case 'main-menu':
                return (
                    <SelectMenu
                        message={t('what_would_you_like')}
                        items={mainMenuItems}
                        onSelect={handleMainMenuSelect}
                    />
                );

            case 'browse-search':
                return (
                    <TextInput
                        message={t('search_prompt')}
                        placeholder={t('search_placeholder')}
                        onSubmit={handleSearchSubmit}
                        onCancel={() => navigate('main-menu')}
                    />
                );

            case 'browse-select':
                return (
                    <MultiSelectMenu
                        message={`${t('select_resources')} (${state.searchResults.length} ${t('available_count')})`}
                        items={state.searchResults.map((r) => ({
                            label: formatResourceLabel(r),
                            value: r.id,
                            hint: truncate(r.description, 40),
                        }))}
                        onSubmit={handleResourceSelect}
                        onCancel={() => navigate('main-menu')}
                    />
                );

            case 'install-scope':
                return (
                    <SelectMenu
                        message={t('installation_scope')}
                        items={[
                            { label: t('scope_local'), value: 'local', hint: process.cwd() },
                            { label: t('scope_global'), value: 'global', hint: '~/' },
                        ]}
                        onSelect={handleScopeSelect}
                    />
                );

            case 'install-targets': {
                const isGlobal = state.installScope === 'global';
                const detectedSet = new Set(detectApps().map((a) => a.id));
                const options = [
                    {
                        label: PRIMARY_SOURCE.name,
                        value: PRIMARY_SOURCE.id,
                        hint: isGlobal ? '~/.agent' : '.agent',
                    },
                    ...TARGET_APPS.map((app) => ({
                        label: `${app.name}${detectedSet.has(app.id) ? ' ✓' : ''}`,
                        value: app.id,
                        hint: isGlobal ? `~/${app.globalBaseDir || app.baseDir}` : app.baseDir,
                    })),
                ];

                return (
                    <MultiSelectMenu
                        message={t('select_targets')}
                        items={options}
                        initialValues={getDefaultAgents() || []}
                        required={true}
                        onSubmit={handleTargetsSubmit}
                        onCancel={() => navigate('main-menu')}
                    />
                );
            }

            case 'installing':
                return (
                    <Box flexDirection="column" alignItems="center" marginTop={2}>
                        <Box>
                            <Text color={colors.primary}>
                                <Spinner type="dots" />
                            </Text>
                            <Text> {t('installing')}...</Text>
                        </Box>
                        <Box marginTop={1}>
                            <Text color={colors.textMuted}>
                                {t('please_wait')}
                            </Text>
                        </Box>
                    </Box>
                );

            case 'install-complete':
                return (
                    <Box flexDirection="column">
                        {state.installResult && (
                            <InstallSummary
                                title={t('install_summary')}
                                items={[
                                    {
                                        label: t('resources_installed'),
                                        value: state.installResult.installedNames.join(', ') || '-',
                                        status: state.installResult.successCount > 0 ? 'success' : 'info',
                                    },
                                    {
                                        label: t('target_apps'),
                                        value: state.installResult.targetApps.join(', '),
                                        status: 'info',
                                    },
                                ]}
                                footer={state.installResult.failCount > 0
                                    ? `${state.installResult.failCount} ${t('install_failed')}`
                                    : undefined
                                }
                            />
                        )}
                        <SelectMenu
                            message={t('what_next')}
                            items={[
                                { label: t('go_home'), value: 'home' },
                                { label: t('exit_now'), value: 'exit' },
                            ]}
                            onSelect={handlePostInstallSelect}
                        />
                    </Box>
                );

            case 'help':
                return (
                    <Box flexDirection="column" paddingX={2}>
                        <Box marginBottom={1}>
                            <Text color={colors.primary} bold>{symbols.info} {t('menu_help')}</Text>
                        </Box>
                        <Box flexDirection="column" marginLeft={2}>
                            <Text color={colors.textDim}>• {t('menu_browse')} - {t('menu_browse_hint')}</Text>
                            <Text color={colors.textDim}>• {t('menu_install')} - {t('menu_install_hint')}</Text>
                            <Text color={colors.textDim}>• {t('menu_installed')} - {t('menu_installed_hint')}</Text>
                        </Box>
                        <Box marginTop={2}>
                            <Text color={colors.textMuted}>{t('press_any_key_back')}</Text>
                        </Box>
                    </Box>
                );

            default:
                return <Text>Unknown screen</Text>;
        }
    };

    // 语言选择页面不显示 Header/Footer
    if (state.screen === 'language-select') {
        return (
            <Box flexDirection="column" minHeight={10} justifyContent="center">
                {renderContent()}
            </Box>
        );
    }

    return (
        <Box flexDirection="column" minHeight={15}>
            {/* 固定顶部 Header */}
            <Header version={CLI_VERSION} indexVersion={getIndexVersion()} />

            {/* 中间内容区域 - 自动扩展 */}
            <Box flexGrow={1} flexDirection="column">
                {renderContent()}
            </Box>

            {/* 固定底部 Footer */}
            <Footer hint={state.hint} />
        </Box>
    );
}
