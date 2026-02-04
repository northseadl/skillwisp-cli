/**
 * Config 流程 - Ink 交互式配置
 * 
 * 设计原则：
 * - **完全统一**：使用与主 App 完全相同的 Header/Footer 布局
 */

import { render, Box, Text, useApp, useInput } from 'ink';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { SelectMenu } from '../components/SelectMenu.js';
import { MultiSelectMenu } from '../components/MultiSelectMenu.js';
import { colors, symbols } from '../theme.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE, type AgentConfig } from '../../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, resetPreferences, loadPreferences } from '../../core/preferences.js';
import { t, initI18n } from '../../core/i18n.js';
import { CLI_VERSION } from '../../core/version.js';
import { getIndexVersion } from '../../core/registry.js';

type ConfigAction = 'targets' | 'reset' | 'exit';
type FlowPhase = 'menu' | 'targets' | 'reset-confirm' | 'done';

interface ConfigFlowProps {
    onComplete: () => void;
}

interface FlowState {
    phase: FlowPhase;
    message: string | null;
    hint: string;
}

function ConfigFlowApp({ onComplete }: ConfigFlowProps): ReactNode {
    const { exit } = useApp();

    const [state, setState] = useState<FlowState>({
        phase: 'menu',
        message: null,
        hint: t('hint_navigation'),
    });

    const prefs = loadPreferences();
    const detectedApps = detectApps();

    // 构建可选应用列表：PRIMARY_SOURCE + 检测到的应用
    const availableApps: AgentConfig[] = [PRIMARY_SOURCE, ...detectedApps];

    // 全局退出处理
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            onComplete();
            exit();
        }
    });

    // 完成时回调
    useEffect(() => {
        if (state.phase === 'done') {
            if (state.message) {
                console.log(`\n${colors.success}${symbols.success} ${state.message}\n`);
            }
            onComplete();
        }
    }, [state.phase, state.message, onComplete]);

    // 渲染内容区域
    const renderContent = useCallback((): ReactNode => {
        // 主菜单
        if (state.phase === 'menu') {
            return (
                <Box flexDirection="column" paddingX={2}>
                    {/* 当前设置 */}
                    <Box flexDirection="column" marginBottom={1}>
                        <Text color={colors.textMuted}>
                            {t('current_settings')}:
                        </Text>
                        <Box marginLeft={2}>
                            <Text>
                                {t('default_targets')}: {
                                    prefs.defaultAgents?.length
                                        ? getAppsByIds(prefs.defaultAgents).map(a => a.name).join(', ')
                                        : <Text color={colors.textMuted}>{t('auto_detect')}</Text>
                                }
                            </Text>
                        </Box>
                    </Box>

                    <SelectMenu<ConfigAction>
                        message={t('what_to_configure')}
                        items={[
                            { value: 'targets', label: t('default_targets') },
                            { value: 'reset', label: t('reset_prefs') },
                            { value: 'exit', label: t('exit') },
                        ]}
                        onSelect={(action) => {
                            if (action === 'exit') {
                                onComplete();
                            } else if (action === 'reset') {
                                setState(prev => ({ ...prev, phase: 'reset-confirm' }));
                            } else if (action === 'targets') {
                                setState(prev => ({ ...prev, phase: 'targets' }));
                            }
                        }}
                        onCancel={onComplete}
                        showNumbers={false}
                    />
                </Box>
            );
        }

        // 选择默认目标
        if (state.phase === 'targets') {
            const existingDefault = getDefaultAgents();
            const initialValues = existingDefault?.length
                ? existingDefault
                : availableApps.map(a => a.id);

            const items = availableApps.map(app => ({
                label: app.id === PRIMARY_SOURCE.id
                    ? `${app.name} (${t('primary_source')})`
                    : app.name,
                value: app.id,
                hint: app.baseDir,
            }));

            return (
                <Box flexDirection="column" paddingX={2}>
                    <MultiSelectMenu
                        message={t('select_default_targets')}
                        items={items}
                        initialValues={initialValues}
                        onSubmit={(selected: string[]) => {
                            if (selected.length === 0) {
                                setState(prev => ({ ...prev, hint: t('select_at_least_one') }));
                                return;
                            }
                            saveDefaultAgents(selected);
                            const names = getAppsByIds(selected).map(a => a.name).join(', ');
                            setState({
                                phase: 'done',
                                message: `${t('default_saved')}: ${names}`,
                                hint: '',
                            });
                        }}
                        onCancel={() => setState(prev => ({ ...prev, phase: 'menu', hint: t('hint_navigation') }))}
                    />
                </Box>
            );
        }

        // 确认重置
        if (state.phase === 'reset-confirm') {
            return (
                <Box flexDirection="column" paddingX={2}>
                    <SelectMenu<'yes' | 'no'>
                        message={t('confirm_reset')}
                        items={[
                            { value: 'no', label: t('no') },
                            { value: 'yes', label: t('yes') },
                        ]}
                        onSelect={(value) => {
                            if (value === 'yes') {
                                resetPreferences();
                                setState({
                                    phase: 'done',
                                    message: t('prefs_reset'),
                                    hint: '',
                                });
                            } else {
                                setState(prev => ({ ...prev, phase: 'menu', hint: t('hint_navigation') }));
                            }
                        }}
                        onCancel={() => setState(prev => ({ ...prev, phase: 'menu', hint: t('hint_navigation') }))}
                        showNumbers={false}
                    />
                </Box>
            );
        }

        return null;
    }, [state, prefs, availableApps, onComplete]);

    // 完整布局：Header + Content + Footer（与主 App 完全一致）
    return (
        <Box flexDirection="column" minHeight={15}>
            {/* 固定顶部 Header（带 ASCII Logo） */}
            <Header version={CLI_VERSION} indexVersion={getIndexVersion()} />

            {/* 中间内容区域 */}
            <Box flexGrow={1} flexDirection="column">
                {renderContent()}
            </Box>

            {/* 固定底部 Footer */}
            <Footer hint={state.hint} />
        </Box>
    );
}

/**
 * 启动 Ink 交互式配置流程
 */
export function runConfigFlow(): Promise<void> {
    // 确保 i18n 已初始化
    initI18n();

    return new Promise((resolve) => {
        const { unmount, waitUntilExit } = render(
            <ConfigFlowApp onComplete={() => {
                unmount();
                resolve();
            }} />
        );

        waitUntilExit().then(() => {
            resolve();
        });
    });
}
