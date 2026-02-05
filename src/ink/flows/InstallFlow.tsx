/**
 * Install 流程 - Ink 交互式目标选择
 * 
 * 设计原则：
 * - **完全统一**：使用与主 App 完全相同的 Header/Footer 布局
 * - **始终交互**：不跳过任何交互步骤
 * - **明确选择**：用户必须明确选择安装目标
 * - **.agents 始终可选**：作为主源始终可见
 */

import { render, Box, useApp, useInput } from 'ink';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { SelectMenu } from '../components/SelectMenu.js';
import { MultiSelectMenu } from '../components/MultiSelectMenu.js';
import { colors, symbols } from '../theme.js';
import { detectApps, getAppsByIds, PRIMARY_SOURCE, sortTargetApps, type AgentConfig, type TargetSort } from '../../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, hasDefaultAgents } from '../../core/preferences.js';
import { t, initI18n } from '../../core/i18n.js';
import { CLI_VERSION } from '../../core/version.js';
import { getIndexVersion } from '../../core/registry.js';

type FlowPhase = 'select-sort' | 'select-targets' | 'confirm-save' | 'done';

interface InstallFlowProps {
    resourceName: string;
    onComplete: (targets: string[] | null) => void;
}

interface FlowState {
    phase: FlowPhase;
    selectedTargets: string[];
    availableApps: AgentConfig[];
    targetSort: TargetSort;
    hint: string;
}

function InstallFlowApp({ resourceName, onComplete }: InstallFlowProps): ReactNode {
    const { exit } = useApp();

    const [state, setState] = useState<FlowState>(() => {
        // 检测可用的应用
        const detectedApps = detectApps();

        // 构建选项列表：PRIMARY_SOURCE + 检测到的应用
        const availableApps: AgentConfig[] = [PRIMARY_SOURCE, ...detectedApps];

        // 获取已保存的默认值（如果有）
        const savedAgents = hasDefaultAgents() ? getDefaultAgents() : null;

        // 计算初始选中状态
        let initialSelected: string[];
        if (savedAgents && savedAgents.length > 0) {
            initialSelected = savedAgents;
        } else if (detectedApps.length > 0) {
            initialSelected = [PRIMARY_SOURCE.id, ...detectedApps.map(a => a.id)];
        } else {
            initialSelected = [PRIMARY_SOURCE.id];
        }

        return {
            phase: 'select-sort' as FlowPhase,
            selectedTargets: initialSelected,
            availableApps,
            targetSort: 'default',
            hint: t('hint_navigation'),
        };
    });

    // 全局退出处理
    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            onComplete(null);
            exit();
        }
    });

    // 完成时回调
    useEffect(() => {
        if (state.phase === 'done') {
            onComplete(state.selectedTargets.length > 0 ? state.selectedTargets : null);
        }
    }, [state.phase, state.selectedTargets, onComplete]);

    // 渲染内容区域
    const renderContent = useCallback((): ReactNode => {
        // 阶段 1: 选择目标应用
        if (state.phase === 'select-sort') {
            return (
                <Box flexDirection="column" paddingX={2}>
                    <SelectMenu
                        message={t('target_sort')}
                        items={[
                            { value: 'default', label: t('target_sort_default'), hint: t('target_sort_default_hint') },
                            { value: 'az', label: t('target_sort_az'), hint: t('target_sort_az_hint') },
                        ]}
                        onSelect={(value) => {
                            setState(prev => ({
                                ...prev,
                                phase: 'select-targets',
                                targetSort: value as TargetSort,
                                hint: t('hint_navigation'),
                            }));
                        }}
                        onCancel={() => onComplete(null)}
                        showNumbers={false}
                    />
                </Box>
            );
        }

        // 阶段 2: 选择目标应用
        if (state.phase === 'select-targets') {
            const primary = state.availableApps.find(app => app.id === PRIMARY_SOURCE.id);
            const rest = state.availableApps.filter(app => app.id !== PRIMARY_SOURCE.id);
            const orderedApps = primary
                ? [primary, ...sortTargetApps(rest, state.targetSort)]
                : sortTargetApps(rest, state.targetSort);

            const items = orderedApps.map(app => ({
                label: app.id === PRIMARY_SOURCE.id
                    ? `${app.name} (${t('primary_source')})`
                    : app.name,
                value: app.id,
                hint: app.baseDir,
            }));

            const initialValues = state.selectedTargets.filter(id =>
                state.availableApps.some(app => app.id === id)
            );

            return (
                <Box flexDirection="column" paddingX={2}>
                    <MultiSelectMenu
                        message={`${t('installing')}: ${resourceName}`}
                        items={items}
                        initialValues={initialValues}
                        onSubmit={(selected: string[]) => {
                            if (selected.length === 0) {
                                setState(prev => ({ ...prev, hint: t('select_at_least_one') }));
                                return;
                            }
                            setState(prev => ({
                                ...prev,
                                phase: 'confirm-save',
                                selectedTargets: selected,
                                hint: t('hint_navigation'),
                            }));
                        }}
                        onCancel={() => onComplete(null)}
                    />
                </Box>
            );
        }

        // 阶段 3: 确认是否保存为默认
        if (state.phase === 'confirm-save') {
            const targetNames = getAppsByIds(state.selectedTargets).map(a => a.name).join(', ');

            return (
                <Box flexDirection="column" paddingX={2}>
                    <SelectMenu
                        message={`${t('save_as_default')} (${targetNames})`}
                        items={[
                            { value: 'yes', label: t('yes') },
                            { value: 'no', label: t('no') },
                        ]}
                        onSelect={(value) => {
                            if (value === 'yes') {
                                saveDefaultAgents(state.selectedTargets);
                            }
                            setState(prev => ({
                                ...prev,
                                phase: 'done',
                            }));
                        }}
                        onCancel={() => {
                            setState(prev => ({
                                ...prev,
                                phase: 'done',
                            }));
                        }}
                        showNumbers={false}
                    />
                </Box>
            );
        }

        return null;
    }, [state, resourceName, onComplete]);

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
 * 启动 Ink 交互式目标选择流程
 * @param resourceName - 资源名称，用于显示
 * @returns Promise<string[] | null> - 选中的目标列表，取消时返回 null
 */
export function runInstallFlow(resourceName: string = ''): Promise<string[] | null> {
    // 确保 i18n 已初始化
    initI18n();

    return new Promise((resolve) => {
        const { unmount, waitUntilExit } = render(
            <InstallFlowApp
                resourceName={resourceName}
                onComplete={(targets) => {
                    unmount();
                    resolve(targets);
                }}
            />
        );

        waitUntilExit().then(() => {
            resolve(null);
        });
    });
}
