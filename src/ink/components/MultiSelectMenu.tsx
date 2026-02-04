/**
 * SkillWisp CLI - 多选菜单
 * 
 * 支持多选的交互式列表，带滚动视窗分页
 * 快捷键: 空格切换、a 全选、n 取消全选、j/k 导航
 * 
 * 分页特性:
 * - 默认视窗大小 10 项（可配置）
 * - 视窗随焦点自动滚动
 * - 显示位置指示器 [当前/总数]
 */

import { Box, Text, useInput } from 'ink';
import { useState, useMemo, type ReactNode } from 'react';
import { colors, symbols } from '../theme.js';
import { t } from '../../core/i18n.js';

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
    /** 视窗大小（可见项目数），默认 10 */
    pageSize?: number;
}

/** 默认视窗大小 */
const DEFAULT_PAGE_SIZE = 10;

export function MultiSelectMenu<T>({
    message,
    items,
    initialValues = [],
    required = false,
    onSubmit,
    onCancel,
    pageSize = DEFAULT_PAGE_SIZE,
}: MultiSelectMenuProps<T>): ReactNode {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedValues, setSelectedValues] = useState<Set<T>>(new Set(initialValues));

    // ═══════════════════════════════════════════════════════════════════════════
    // 滚动视窗计算
    // ═══════════════════════════════════════════════════════════════════════════

    const { visibleItems, startIndex, needsPagination } = useMemo(() => {
        const totalItems = items.length;
        const needsPaging = totalItems > pageSize;

        if (!needsPaging) {
            // 项目数小于等于视窗大小，无需分页
            return {
                visibleItems: items,
                startIndex: 0,
                needsPagination: false,
            };
        }

        // 计算视窗起始位置，确保焦点始终在视窗内
        // 策略：焦点尽量保持在视窗中间偏上的位置
        const halfPage = Math.floor(pageSize / 2);
        let start = selectedIndex - halfPage;

        // 边界处理
        if (start < 0) {
            start = 0;
        } else if (start + pageSize > totalItems) {
            start = totalItems - pageSize;
        }

        return {
            visibleItems: items.slice(start, start + pageSize),
            startIndex: start,
            needsPagination: true,
        };
    }, [items, selectedIndex, pageSize]);

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
    const totalCount = items.length;

    return (
        <Box flexDirection="column">
            {/* 提示消息 + 位置指示器 */}
            <Box marginBottom={1}>
                <Text color={colors.primary} bold>
                    {symbols.wisp}
                </Text>
                <Text> {message}</Text>
                <Text color={colors.textMuted}>
                    {' '}({selectedCount} {t('multi_selected')})
                </Text>
                {/* 分页位置指示器 */}
                {needsPagination && (
                    <Text color={colors.textSubtle}>
                        {' '}[{selectedIndex + 1}/{totalCount}]
                    </Text>
                )}
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

            {/* 滚动指示器（上方） */}
            {needsPagination && startIndex > 0 && (
                <Box marginLeft={2}>
                    <Text color={colors.textMuted}>
                        {symbols.arrowUp} {startIndex} {t('scroll_more_above', 'more above')}
                    </Text>
                </Box>
            )}

            {/* 选项列表（仅显示视窗内的项目） */}
            <Box flexDirection="column" marginLeft={2}>
                {visibleItems.map((item, visibleIndex) => {
                    const actualIndex = startIndex + visibleIndex;
                    const isFocused = actualIndex === selectedIndex;
                    const isChecked = selectedValues.has(item.value);
                    return (
                        <Box key={actualIndex}>
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

            {/* 滚动指示器（下方） */}
            {needsPagination && startIndex + pageSize < totalCount && (
                <Box marginLeft={2}>
                    <Text color={colors.textMuted}>
                        {symbols.arrowDown} {totalCount - startIndex - pageSize} {t('scroll_more_below', 'more below')}
                    </Text>
                </Box>
            )}
        </Box>
    );
}
