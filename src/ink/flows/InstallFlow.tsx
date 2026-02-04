/**
 * Install 流程 - Ink 交互式目标选择
 * 
 * 当用户运行 `skillwisp install <resource>` 时，
 * 在 TTY 环境下启动此组件进行目标选择
 */

import { render, Box, Text } from 'ink';
import { useState, useEffect, type ReactNode } from 'react';
import { SelectMenu } from '../components/SelectMenu.js';
import { MultiSelectMenu } from '../components/MultiSelectMenu.js';
import { colors, symbols } from '../theme.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE, type AgentConfig } from '../../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, hasDefaultAgents } from '../../core/preferences.js';
import { t } from '../../core/i18n.js';

type FlowPhase = 'check-default' | 'select-targets' | 'confirm-save' | 'done';

interface InstallFlowProps {
    onComplete: (targets: string[] | null) => void;
}

interface FlowState {
    phase: FlowPhase;
    selectedTargets: string[];
    detectedApps: AgentConfig[];
    savedAgents: string[] | null;
}

function InstallFlow({ onComplete }: InstallFlowProps): ReactNode {
    const [state, setState] = useState<FlowState>(() => {
        const detectedApps = detectApps();
        const savedAgents = hasDefaultAgents() ? getDefaultAgents() : null;

        // 没有检测到应用，直接完成
        if (detectedApps.length === 0) {
            return {
                phase: 'done' as FlowPhase,
                selectedTargets: [PRIMARY_SOURCE.id],
                detectedApps: [],
                savedAgents: null,
            };
        }

        // 有保存的偏好，询问是否使用
        if (savedAgents && savedAgents.length > 0) {
            return {
                phase: 'check-default' as FlowPhase,
                selectedTargets: [],
                detectedApps,
                savedAgents,
            };
        }

        // 没有保存的偏好，直接进入选择
        return {
            phase: 'select-targets' as FlowPhase,
            selectedTargets: [],
            detectedApps,
            savedAgents: null,
        };
    });

    // 完成时回调
    useEffect(() => {
        if (state.phase === 'done') {
            onComplete(state.selectedTargets.length > 0 ? state.selectedTargets : null);
        }
    }, [state.phase, state.selectedTargets, onComplete]);

    // 阶段 1: 询问是否使用上次的目标
    if (state.phase === 'check-default') {
        const userApps = state.savedAgents!.filter(id => id !== PRIMARY_SOURCE.id);
        const names = getAppsByIds(userApps).map(a => a.name).join(', ') || 'all detected apps';

        return (
            <Box flexDirection="column">
                <SelectMenu
                    message={t('use_saved_targets', 'Install to previous targets?')}
                    items={[
                        { value: 'yes', label: `${t('yes', 'Yes')} → ${names}` },
                        { value: 'no', label: t('select_manually', 'No, select targets manually') },
                    ]}
                    onSelect={(value) => {
                        if (value === 'yes') {
                            setState(prev => ({
                                ...prev,
                                phase: 'done',
                                selectedTargets: [PRIMARY_SOURCE.id, ...userApps],
                            }));
                        } else {
                            setState(prev => ({
                                ...prev,
                                phase: 'select-targets',
                            }));
                        }
                    }}
                    onCancel={() => onComplete(null)}
                    showNumbers={false}
                />
            </Box>
        );
    }

    // 阶段 2: 选择目标应用
    if (state.phase === 'select-targets') {
        const items = state.detectedApps.map(app => ({
            label: app.name,
            value: app.id,
            hint: app.baseDir,
        }));
        const initialValues = state.detectedApps.map(a => a.id);

        return (
            <Box flexDirection="column">
                <MultiSelectMenu
                    message={t('select_targets', 'Select target apps')}
                    items={items}
                    initialValues={initialValues}
                    onSubmit={(selected: string[]) => {
                        setState(prev => ({
                            ...prev,
                            phase: 'confirm-save',
                            selectedTargets: selected,
                        }));
                    }}
                    onCancel={() => onComplete(null)}
                />
            </Box>
        );
    }

    // 阶段 3: 确认是否保存为默认
    if (state.phase === 'confirm-save') {
        return (
            <Box flexDirection="column">
                <SelectMenu
                    message={t('save_as_default', 'Save as default for future installs?')}
                    items={[
                        { value: 'yes', label: t('yes', 'Yes') },
                        { value: 'no', label: t('no', 'No') },
                    ]}
                    onSelect={(value) => {
                        if (value === 'yes') {
                            saveDefaultAgents(state.selectedTargets);
                            const names = getAppsByIds(state.selectedTargets).map(a => a.name).join(', ');
                            console.log(`\n${colors.success}${symbols.success} ${t('default_saved', 'Default saved')}: ${names}`);
                        }
                        setState(prev => ({
                            ...prev,
                            phase: 'done',
                            selectedTargets: [PRIMARY_SOURCE.id, ...prev.selectedTargets],
                        }));
                    }}
                    onCancel={() => {
                        setState(prev => ({
                            ...prev,
                            phase: 'done',
                            selectedTargets: [PRIMARY_SOURCE.id, ...prev.selectedTargets],
                        }));
                    }}
                    showNumbers={false}
                />
            </Box>
        );
    }

    // 阶段 done: 显示完成消息（仅当没有检测到应用时）
    if (state.phase === 'done' && state.detectedApps.length === 0) {
        return (
            <Box>
                <Text color={colors.textMuted}>
                    {t('no_apps_detected', 'No AI apps detected, installing to primary source (.agents)')}
                </Text>
            </Box>
        );
    }

    return null;
}

/**
 * 启动 Ink 交互式目标选择流程
 * @returns Promise<string[] | null> - 选中的目标列表，取消时返回 null
 */
export function runInstallFlow(): Promise<string[] | null> {
    return new Promise((resolve) => {
        const { unmount, waitUntilExit } = render(
            <InstallFlow onComplete={(targets) => {
                unmount();
                resolve(targets);
            }} />
        );

        waitUntilExit().then(() => {
            resolve(null);
        });
    });
}
