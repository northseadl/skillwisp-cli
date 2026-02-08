import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import {
    SelectMenu,
    MultiSelectMenu,
    TextInput,
    InstallSummary,
    LanguageSelector,
    type MenuItem,
} from '../components/index.js';
import { colors, symbols } from '../theme.js';
import { detectApps } from '../../core/installer.js';
import { getDefaultAgents } from '../../core/preferences.js';
import { PRIMARY_SOURCE, TARGET_APPS, sortTargetApps, type TargetSort } from '../../core/agents.js';
import type { Resource } from '../../core/types.js';
import { RESOURCE_CONFIG } from '../../core/types.js';
import { t, type LocaleCode } from '../../core/i18n.js';
import type { AppState, Screen, InstalledItem } from './screenState.js';
import { loadInstalledItems } from './installedItems.js';

function formatResourceLabel(resource: Resource): string {
    const typeConfig = RESOURCE_CONFIG[resource.type];
    return `[${typeConfig.label}] ${resource.name} @${resource.source}`;
}

function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1) + '…';
}

export interface ScreenHandlers {
    handleLanguageSelect: (localeCode: LocaleCode) => void;
    handleMainMenuSelect: (value: string) => void;
    handleSearchSubmit: (query: string) => void;
    handleCategorySelect: (source: string) => void;
    handleQuickInstallSubmit: (query: string) => void;
    handleQuickInstallSelect: (id: string) => void;
    handleResourceSelect: (ids: string[]) => void;
    handleScopeSelect: (scope: string) => void;
    handleTargetsSubmit: (targets: string[]) => void;
    handlePostInstallSelect: (value: string) => void;
    handleManageItemSelect: (value: string) => void;
    handleManageAction: (action: string) => void;
    handleManageConfirm: (value: string) => void;
    navigate: (screen: Screen, updates?: Partial<AppState>) => void;
}

interface RenderScreensArgs {
    state: AppState;
    mainMenuItems: MenuItem<string>[];
    handlers: ScreenHandlers;
}

export function renderCurrentScreen({ state, mainMenuItems, handlers }: RenderScreensArgs): React.ReactNode {
    const {
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
    } = handlers;

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

        case 'browse-category': {
            const sourceGroups = new Map<string, number>();
            for (const resource of state.searchResults) {
                sourceGroups.set(resource.source, (sourceGroups.get(resource.source) || 0) + 1);
            }
            const sortedSources = [...sourceGroups.entries()].sort((a, b) => b[1] - a[1]);

            return (
                <SelectMenu
                    message={`${t('select_resources')} — ${state.searchResults.length} 个资源，${sortedSources.length} 个来源`}
                    items={[
                        ...sortedSources.map(([source, count]) => ({
                            label: `@${source}`,
                            value: source,
                            hint: `${count} 个资源`,
                        })),
                        { label: `查看全部 (${state.searchResults.length})`, value: '__all__' },
                    ]}
                    onSelect={handleCategorySelect}
                    onCancel={() => navigate('main-menu')}
                />
            );
        }

        case 'quick-install':
            return (
                <TextInput
                    message={t('enter_resource_id')}
                    placeholder={t('resource_id_placeholder')}
                    onSubmit={handleQuickInstallSubmit}
                    onCancel={() => navigate('main-menu')}
                />
            );

        case 'quick-install-select':
            return (
                <SelectMenu
                    message={t('found_matches')}
                    items={state.searchResults.map((resource) => ({
                        label: formatResourceLabel(resource),
                        value: resource.id,
                        hint: truncate(resource.description, 40),
                    }))}
                    onSelect={handleQuickInstallSelect}
                    onCancel={() => navigate('quick-install')}
                />
            );

        case 'browse-select':
            return (
                <MultiSelectMenu
                    message={`${t('select_resources')} (${state.searchResults.length} ${t('available_count')})`}
                    items={state.searchResults.map((resource) => ({
                        label: formatResourceLabel(resource),
                        value: resource.id,
                        hint: truncate(resource.description, 60),
                    }))}
                    onSubmit={handleResourceSelect}
                    onCancel={() => {
                        if (!state.searchQuery || state.searchQuery.startsWith('@')) {
                            handleSearchSubmit('');
                        } else {
                            navigate('browse-search');
                        }
                    }}
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

        case 'install-targets-sort':
            return (
                <SelectMenu
                    message={t('target_sort')}
                    items={[
                        { label: t('target_sort_default'), value: 'default', hint: t('target_sort_default_hint') },
                        { label: t('target_sort_az'), value: 'az', hint: t('target_sort_az_hint') },
                    ]}
                    onSelect={(value) => navigate('install-targets', { targetSort: value as TargetSort })}
                    onCancel={() => navigate('install-scope')}
                    showNumbers={false}
                />
            );

        case 'install-targets': {
            const isGlobal = state.installScope === 'global';
            const detectedSet = new Set(detectApps().map((app) => app.id));
            const sortedApps = sortTargetApps(TARGET_APPS, state.targetSort);
            const options = sortedApps.map((app) => ({
                label: `${app.name}${detectedSet.has(app.id) ? ' ✓' : ''}`,
                value: app.id,
                hint: isGlobal ? `~/${app.globalBaseDir || app.baseDir}` : app.baseDir,
            }));

            return (
                <MultiSelectMenu
                    message={t('select_targets')}
                    items={options}
                    initialValues={getDefaultAgents()?.filter((id) => id !== PRIMARY_SOURCE.id) || []}
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
                        <Text color={colors.textMuted}>{t('please_wait')}</Text>
                    </Box>
                </Box>
            );

        case 'install-complete':
            return (
                <Box flexDirection="column">
                    {state.installResult && (() => {
                        const items: Array<{ label: string; value: string; status: 'success' | 'error' | 'info' }> = [
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
                        ];

                        if (state.installResult.compatNotes && state.installResult.compatNotes.length > 0) {
                            items.push({
                                label: t('compat_notice'),
                                value: state.installResult.compatNotes.join(', '),
                                status: 'info',
                            });
                        }

                        return (
                            <InstallSummary
                                title={t('install_summary')}
                                items={items}
                                footer={state.installResult.failCount > 0
                                    ? `${state.installResult.failCount} ${t('install_failed')}`
                                    : undefined}
                            />
                        );
                    })()}
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

        case 'installed-list': {
            const items = state.installedItems;

            if (items.length === 0) {
                return (
                    <Box flexDirection="column" paddingX={2}>
                        <Box marginBottom={1}>
                            <Text color={colors.primary} bold>{symbols.info} {t('menu_installed')}</Text>
                        </Box>
                        <Text color={colors.textMuted}>{t('no_results')}</Text>
                        <Box marginTop={2}>
                            <Text color={colors.textMuted}>{t('press_any_key_back')}</Text>
                        </Box>
                    </Box>
                );
            }

            return (
                <SelectMenu
                    message={`${t('menu_installed')} (${items.length})`}
                    items={[
                        ...items.map((item) => {
                            const typeLabel = RESOURCE_CONFIG[item.type].label;
                            const scopeHint = item.scope === 'global' ? 'global' : 'local';
                            return {
                                label: `[${typeLabel}] ${item.id}`,
                                value: `${item.scope}:${item.type}:${item.id}`,
                                hint: scopeHint,
                            };
                        }),
                        { label: t('go_home'), value: '__back__' },
                    ]}
                    onSelect={(value) => {
                        if (value === '__back__') {
                            navigate('main-menu');
                        } else {
                            handleManageItemSelect(value);
                        }
                    }}
                    onCancel={() => navigate('main-menu')}
                />
            );
        }

        case 'manage-actions': {
            if (!state.managedItem) return <Text>Error: no item selected</Text>;
            const { id, type, scope } = state.managedItem;
            const typeLabel = RESOURCE_CONFIG[type].label;

            return (
                <SelectMenu
                    message={`${id} [${typeLabel}] (${scope})`}
                    items={[
                        { label: '卸载 — 彻底删除此资源', value: 'uninstall' },
                        { label: '← 返回列表', value: 'back' },
                    ]}
                    onSelect={handleManageAction}
                    onCancel={() => navigate('installed-list', { installedItems: loadInstalledItems() })}
                    showNumbers={false}
                />
            );
        }

        case 'manage-confirm': {
            if (!state.managedItem) return <Text>Error: no item selected</Text>;
            const { id, type } = state.managedItem;
            const typeLabel = RESOURCE_CONFIG[type].label;

            return (
                <SelectMenu
                    message={`确定要卸载 ${id} [${typeLabel}] 吗？此操作不可撤销。`}
                    items={[
                        { label: '确认卸载', value: 'confirm' },
                        { label: '取消', value: 'cancel' },
                    ]}
                    onSelect={handleManageConfirm}
                    onCancel={() => navigate('manage-actions')}
                    showNumbers={false}
                />
            );
        }

        case 'manage-result':
            return (
                <Box flexDirection="column" paddingX={2}>
                    <Box marginBottom={1}>
                        <Text color={colors.primary} bold>{symbols.info} 操作结果</Text>
                    </Box>
                    <Text>{state.manageMessage}</Text>
                    <Box marginTop={2}>
                        <Text color={colors.textMuted}>按 Enter 返回已安装列表</Text>
                    </Box>
                </Box>
            );

        default:
            return <Text>Unknown screen</Text>;
    }
}

