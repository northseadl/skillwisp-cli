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

import { Box, useApp, useInput } from 'ink';
import { useState, useCallback, type ReactNode } from 'react';
import {
    Header,
    Footer,
    type MenuItem
} from './components/index.js';

import {
    loadResources,
    localizeResource,
    searchResources,
    getIndexVersion,
} from '../core/registry.js';
import { installResource } from '../core/installer.js';
import { uninstallResource } from '../core/manager.js';
import { PRIMARY_SOURCE } from '../core/agents.js';
import type { Resource } from '../core/types.js';
import { CLI_VERSION } from '../core/version.js';
import { needsLanguageSetup, setLocale, t, getLocaleData, type LocaleCode } from '../core/i18n.js';
import {
    type Screen,
    type AppState,
    type InstallScope,
    type InstallResult,
    loadInstalledItems,
    renderCurrentScreen,
} from './app/index.js';
import { createInstallResult } from './app/installResult.js';

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
        targetSort: 'default',
        selectedTargets: [],
        installResult: null,
        installedItems: [],
        hint: t('hint_navigation'),
        isInstalling: false,
        managedItem: null,
        manageMessage: '',
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
                navigate('installed-list', { installedItems: loadInstalledItems() });
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

    const handleQuickInstallSubmit = useCallback((query: string) => {
        if (!query) {
            navigate('quick-install', { hint: t('resource_id_required') });
            return;
        }

        const matches = searchResources(query)
            .map((r) => localizeResource(r, locale));

        if (matches.length === 0) {
            navigate('quick-install', { hint: t('no_results') });
            return;
        }

        if (matches.length === 1) {
            navigate('install-scope', {
                searchQuery: query,
                searchResults: matches,
                selectedResources: [matches[0].id],
            });
            return;
        }

        navigate('quick-install-select', {
            searchQuery: query,
            searchResults: matches.slice(0, 5),
        });
    }, [navigate, locale]);

    const handleQuickInstallSelect = useCallback((id: string) => {
        navigate('install-scope', { selectedResources: [id] });
    }, [navigate]);

    // ═══════════════════════════════════════════════════════════════════════
    // 搜索处理
    // ═══════════════════════════════════════════════════════════════════════

    const handleSearchSubmit = useCallback((query: string) => {
        let resources: Resource[];
        if (query) {
            // 有关键词：直接进入搜索结果列表
            resources = searchResources(query);
            resources = resources.map((r) => localizeResource(r, locale));

            if (resources.length === 0) {
                navigate('browse-search', { hint: t('no_results') });
                return;
            }

            navigate('browse-select', {
                searchQuery: query,
                searchResults: resources,
            });
        } else {
            // 空搜索：进入分类浏览，按 source 分组展示
            resources = loadResources();
            resources = resources.map((r) => localizeResource(r, locale));

            navigate('browse-category', {
                searchQuery: '',
                searchResults: resources,
            });
        }
    }, [navigate, locale]);

    const handleCategorySelect = useCallback((source: string) => {
        if (source === '__all__') {
            navigate('browse-select', {
                searchQuery: '',
                searchResults: state.searchResults,
            });
            return;
        }

        const filtered = state.searchResults.filter((r) => r.source === source);
        navigate('browse-select', {
            searchQuery: `@${source}`,
            searchResults: filtered,
        });
    }, [navigate, state.searchResults]);

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
        navigate('install-targets-sort', {
            installScope: scope as InstallScope,
            targetSort: 'default',
        });
    }, [navigate]);

    // ═══════════════════════════════════════════════════════════════════════
    // 目标应用选择
    // ═══════════════════════════════════════════════════════════════════════

    const handleTargetsSubmit = useCallback((targets: string[]) => {
        if (targets.length === 0) {
            navigate('main-menu');
            return;
        }

        // 自动添加 PRIMARY_SOURCE 作为隐式主源
        // 用户选择的应用将创建符号链接指向主源
        const allTargets = [PRIMARY_SOURCE.id, ...targets.filter(t => t !== PRIMARY_SOURCE.id)];

        navigate('installing', { selectedTargets: allTargets, isInstalling: true });

        // 异步执行安装
        setTimeout(() => {
            const resources = state.searchResults.filter(
                (r) => state.selectedResources.includes(r.id)
            );

            let successCount = 0;
            let failCount = 0;
            const installedNames = new Set<string>();
            const compatNotes = new Set<string>();

            for (const resource of resources) {
                const result = installResource(resource, {
                    agents: allTargets,
                    scope: state.installScope,
                });

                if (result.success) {
                    successCount++;
                    installedNames.add(resource.name);
                    if (result.compat && result.compat.length > 0) {
                        for (const notice of result.compat) {
                            const note = notice.note ? `${notice.name} → ${notice.note}` : notice.name;
                            compatNotes.add(note);
                        }
                    }
                } else {
                    failCount++;
                }
            }

            const result: InstallResult = createInstallResult({
                successCount,
                failCount,
                installedNames,
                compatNotes,
                targetApps: targets,
            });

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
        // 管理结果页：任意键返回已安装列表（而非主菜单），方便用户继续管理
        if (state.screen === 'manage-result' && (key.return || key.escape)) {
            navigate('installed-list', { installedItems: loadInstalledItems() });
        }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 管理操作处理
    // ═══════════════════════════════════════════════════════════════════════

    const handleManageItemSelect = useCallback((value: string) => {
        const item = state.installedItems.find(
            (i) => `${i.scope}:${i.type}:${i.id}` === value
        );
        if (item) {
            navigate('manage-actions', { managedItem: item });
        }
    }, [navigate, state.installedItems]);

    const handleManageAction = useCallback((action: string) => {
        if (!state.managedItem) return;

        if (action === 'back') {
            navigate('installed-list', { installedItems: loadInstalledItems() });
            return;
        }

        if (action === 'uninstall') {
            navigate('manage-confirm', { hint: '' });
            return;
        }
    }, [navigate, state.managedItem]);

    const handleManageConfirm = useCallback((value: string) => {
        if (value === 'cancel' || !state.managedItem) {
            navigate('manage-actions');
            return;
        }

        const { id, type, scope } = state.managedItem;
        const result = uninstallResource(id, type, scope);
        const msg = result.success
            ? `✓ ${id} 已完全卸载（清理了 ${result.removedPaths.length} 个位置）`
            : `✗ 卸载失败: ${result.error}`;
        navigate('manage-result', {
            manageMessage: msg,
            managedItem: null,
            installedItems: loadInstalledItems(),
        });
    }, [navigate, state.managedItem]);

    const renderContent = (): ReactNode => renderCurrentScreen({
        state,
        mainMenuItems,
        handlers: {
            handleLanguageSelect,
            handleMainMenuSelect,
            handleSearchSubmit,
            handleCategorySelect,
            handleQuickInstallSubmit,
            handleQuickInstallSelect,
            handleResourceSelect,
            handleScopeSelect,
            handleTargetsSubmit,
            handlePostInstallSelect,
            handleManageItemSelect,
            handleManageAction,
            handleManageConfirm,
            navigate,
        },
    });

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
