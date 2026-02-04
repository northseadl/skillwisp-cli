/**
 * SkillWisp CLI - 选择菜单
 * 
 * 高级交互式选择菜单
 * 支持: 键盘导航、数字快捷键、vim 风格 (j/k)
 */

import { Box, Text, useInput } from 'ink';
import { useState, type ReactNode } from 'react';
import { colors, symbols } from '../theme.js';

export interface MenuItem<T> {
    label: string;
    value: T;
    hint?: string;
}

interface SelectMenuProps<T> {
    message: string;
    items: MenuItem<T>[];
    onSelect: (value: T) => void;
    showNumbers?: boolean; // 是否显示数字快捷键
}

export function SelectMenu<T>({
    message,
    items,
    onSelect,
    showNumbers = true,
}: SelectMenuProps<T>): ReactNode {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        // 方向键导航
        if (key.upArrow || input === 'k') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        } else if (key.downArrow || input === 'j') {
            setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        } else if (key.return) {
            onSelect(items[selectedIndex].value);
        }

        // 数字快捷键 (1-9)
        const num = parseInt(input);
        if (num >= 1 && num <= Math.min(items.length, 9)) {
            onSelect(items[num - 1].value);
        }

        // 快捷键
        if (input === 'q') {
            // 找到 exit 选项
            const exitItem = items.find(
                (item) =>
                    String(item.value).toLowerCase() === 'exit' ||
                    item.label.toLowerCase().includes('exit') ||
                    item.label.includes('退出')
            );
            if (exitItem) {
                onSelect(exitItem.value);
            }
        }
    });

    return (
        <Box flexDirection="column">
            {/* 提示消息 */}
            <Box marginBottom={1}>
                <Text color={colors.primary} bold>
                    {symbols.diamond}
                </Text>
                <Text> {message}</Text>
            </Box>

            {/* 选项列表 */}
            <Box flexDirection="column" marginLeft={2}>
                {items.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    const showNum = showNumbers && index < 9;
                    return (
                        <Box key={index}>
                            {/* 数字快捷键 */}
                            {showNum && (
                                <Text color={colors.textSubtle}>{index + 1}. </Text>
                            )}
                            {/* 选择指示器 */}
                            <Text color={isSelected ? colors.primary : colors.textMuted}>
                                {isSelected ? symbols.radioOn : symbols.radioOff}
                            </Text>
                            {/* 标签 */}
                            <Text color={isSelected ? colors.text : colors.textDim}>
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
