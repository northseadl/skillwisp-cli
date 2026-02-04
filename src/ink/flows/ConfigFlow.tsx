/**
 * Config 流程 - Ink 交互式配置
 */

import { render, Box, Text } from 'ink';
import { useState, useEffect, type ReactNode } from 'react';
import { SelectMenu } from '../components/SelectMenu.js';
import { MultiSelectMenu } from '../components/MultiSelectMenu.js';
import { colors, symbols } from '../theme.js';
import { detectApps, getAppsByIds } from '../../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, resetPreferences, loadPreferences } from '../../core/preferences.js';
import { t } from '../../core/i18n.js';

type ConfigAction = 'targets' | 'reset' | 'exit';
type FlowPhase = 'menu' | 'targets' | 'reset-confirm' | 'done';

interface ConfigFlowProps {
    onComplete: () => void;
}

interface FlowState {
    phase: FlowPhase;
    message: string | null;
}

function ConfigFlow({ onComplete }: ConfigFlowProps): ReactNode {
    const [state, setState] = useState<FlowState>({
        phase: 'menu',
        message: null,
    });

    const prefs = loadPreferences();
    const detectedApps = detectApps();

    useEffect(() => {
        if (state.phase === 'done') {
            if (state.message) {
                console.log(`\n${colors.success}${symbols.success} ${state.message}\n`);
            }
            onComplete();
        }
    }, [state.phase, state.message, onComplete]);

    // 显示当前配置信息
    const CurrentSettings = (): ReactNode => (
        <Box flexDirection="column" marginBottom={1}>
            <Text color={colors.textMuted}>
                {t('current_settings', 'Current settings')}:
            </Text>
            <Box marginLeft={2}>
                <Text>
                    {t('default_targets', 'Default targets')}: {
                        prefs.defaultAgents?.length
                            ? getAppsByIds(prefs.defaultAgents).map(a => a.name).join(', ')
                            : <Text color={colors.textMuted}>(auto-detect)</Text>
                    }
                </Text>
            </Box>
        </Box>
    );

    // 主菜单
    if (state.phase === 'menu') {
        return (
            <Box flexDirection="column">
                <CurrentSettings />
                <SelectMenu<ConfigAction>
                    message={t('what_to_configure', 'What would you like to configure?')}
                    items={[
                        { value: 'targets', label: t('default_targets', 'Default installation targets') },
                        { value: 'reset', label: t('reset_prefs', 'Reset all preferences') },
                        { value: 'exit', label: t('exit', 'Exit') },
                    ]}
                    onSelect={(action) => {
                        if (action === 'exit') {
                            onComplete();
                        } else if (action === 'reset') {
                            setState({ phase: 'reset-confirm', message: null });
                        } else if (action === 'targets') {
                            setState({ phase: 'targets', message: null });
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
            : detectedApps.map(a => a.id);

        const items = detectedApps.map(app => ({
            label: app.name,
            value: app.id,
            hint: app.baseDir,
        }));

        return (
            <Box flexDirection="column">
                <MultiSelectMenu
                    message={t('select_default_targets', 'Select default installation targets')}
                    items={items}
                    initialValues={initialValues}
                    onSubmit={(selected: string[]) => {
                        saveDefaultAgents(selected);
                        const names = getAppsByIds(selected).map(a => a.name).join(', ');
                        setState({
                            phase: 'done',
                            message: `${t('default_saved', 'Default targets saved')}: ${names}`,
                        });
                    }}
                    onCancel={() => setState({ phase: 'menu', message: null })}
                />
            </Box>
        );
    }

    // 确认重置
    if (state.phase === 'reset-confirm') {
        return (
            <Box flexDirection="column">
                <SelectMenu<'yes' | 'no'>
                    message={t('confirm_reset', 'Reset all preferences?')}
                    items={[
                        { value: 'no', label: t('no', 'No') },
                        { value: 'yes', label: t('yes', 'Yes') },
                    ]}
                    onSelect={(value) => {
                        if (value === 'yes') {
                            resetPreferences();
                            setState({
                                phase: 'done',
                                message: t('prefs_reset', 'Preferences reset'),
                            });
                        } else {
                            setState({ phase: 'menu', message: null });
                        }
                    }}
                    onCancel={() => setState({ phase: 'menu', message: null })}
                    showNumbers={false}
                />
            </Box>
        );
    }

    return null;
}

/**
 * 启动 Ink 交互式配置流程
 */
export function runConfigFlow(): Promise<void> {
    return new Promise((resolve) => {
        const { unmount, waitUntilExit } = render(
            <ConfigFlow onComplete={() => {
                unmount();
                resolve();
            }} />
        );

        waitUntilExit().then(() => {
            resolve();
        });
    });
}
