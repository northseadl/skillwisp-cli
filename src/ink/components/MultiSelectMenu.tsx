/**
 * SkillWisp CLI - 多选菜单
 * 
 * 支持多选的交互式列表
 * 快捷键: 空格切换、a 全选、n 取消全选、j/k 导航
 */

import { Box, Text, useInput } from 'ink';
import { useState, type ReactNode } from 'react';
import { colors, symbols } from '../theme.js';
import { t } from '../../ui/i18n.js';

export interface MultiSelectItem<T> {
    label: string;
    value: T;
    hint?: string;
}

interface MultiSelectMenuProps<T> {
    message: string;
    items: MultiSelectItem<T>[];
    initialValues?: T[];
    required?: boolean;
    onSubmit: (values: T[]) => void;
    onCancel?: () => void;
}

export function MultiSelectMenu<T>({
    message,
    items,
    initialValues = [],
    required = false,
    onSubmit,
    onCancel,
}: MultiSelectMenuProps<T>): ReactNode {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedValues, setSelectedValues] = useState<Set<T>>(new Set(initialValues));

    useInput((input, key) => {
        // 导航 (支持 vim 风格)
        if (key.upArrow || input === 'k') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        } else if (key.downArrow || input === 'j') {
            setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        }
        // 空格切换选择
        else if (input === ' ') {
            const value = items[selectedIndex].value;
            setSelectedValues((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(value)) {
                    newSet.delete(value);
                } else {
                    newSet.add(value);
                }
                return newSet;
            });
        }
        // 全选
        else if (input === 'a') {
            setSelectedValues(new Set(items.map((item) => item.value)));
        }
        // 取消全选
        else if (input === 'n') {
            setSelectedValues(new Set());
        }
        // 反选
        else if (input === 'i') {
            setSelectedValues((prev) => {
                const newSet = new Set<T>();
                items.forEach((item) => {
                    if (!prev.has(item.value)) {
                        newSet.add(item.value);
                    }
                });
                return newSet;
            });
        }
        // 提交
        else if (key.return) {
            const values = Array.from(selectedValues);
            if (required && values.length === 0) {
                return; // 必选但未选择，不提交
            }
            onSubmit(values);
        }
        // 取消
        else if (key.escape && onCancel) {
            onCancel();
        }
    });

    const selectedCount = selectedValues.size;

    return (
        <Box flexDirection="column">
            {/* 提示消息 */}
            <Box marginBottom={1}>
                <Text color={colors.primary} bold>
                    {symbols.diamond}
                </Text>
                <Text> {message}</Text>
                <Text color={colors.textMuted}>
                    {' '}({selectedCount} {t('multi_selected')})
                </Text>
            </Box>

            {/* 快捷键提示 */}
            <Box marginBottom={1} marginLeft={2}>
                <Text color={colors.textSubtle}>
                    {t('multi_shortcut_space_toggle')} ·
                    <Text color={colors.primaryBright}> a</Text> {t('multi_shortcut_all')} ·
                    <Text color={colors.primaryBright}> n</Text> {t('multi_shortcut_none')} ·
                    <Text color={colors.primaryBright}> i</Text> {t('multi_shortcut_invert')} ·
                    {t('multi_shortcut_enter_confirm')}
                </Text>
            </Box>

            {/* 选项列表 */}
            <Box flexDirection="column" marginLeft={2}>
                {items.map((item, index) => {
                    const isFocused = index === selectedIndex;
                    const isChecked = selectedValues.has(item.value);
                    return (
                        <Box key={index}>
                            {/* 选择框 */}
                            <Text color={isChecked ? colors.success : (isFocused ? colors.primary : colors.textMuted)}>
                                {isChecked ? symbols.checkboxOn : symbols.checkboxOff}
                            </Text>
                            {/* 标签 */}
                            <Text color={isFocused ? colors.text : colors.textDim}>
                                {' '}{item.label}
                            </Text>
                            {/* 提示 */}
                            {item.hint && (
                                <Text color={colors.textMuted}>
                                    {' '}({item.hint})
                                </Text>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
