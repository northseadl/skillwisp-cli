/**
 * SkillWisp CLI - 安装结果摘要
 * 
 * 显示安装操作的详细结果
 */

import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { colors, symbols } from '../theme.js';

export interface SummaryItem {
    label: string;
    value: string;
    status: 'success' | 'error' | 'info';
}

interface InstallSummaryProps {
    title: string;
    items: SummaryItem[];
    footer?: string;
}

export function InstallSummary({ title, items, footer }: InstallSummaryProps): ReactNode {
    const getStatusIcon = (status: 'success' | 'error' | 'info') => {
        switch (status) {
            case 'success':
                return <Text color={colors.success}>{symbols.success}</Text>;
            case 'error':
                return <Text color={colors.error}>{symbols.error}</Text>;
            case 'info':
                return <Text color={colors.info}>{symbols.info}</Text>;
        }
    };

    return (
        <Box flexDirection="column" marginY={1}>
            {/* 标题栏 */}
            <Box>
                <Text color={colors.primary}>{symbols.corner}{symbols.line} </Text>
                <Text color={colors.text} bold>{title}</Text>
                <Text color={colors.primary}> {symbols.line}</Text>
            </Box>

            {/* 内容项 */}
            <Box flexDirection="column" marginLeft={1}>
                <Text color={colors.primary}>{symbols.bar}</Text>
                {items.map((item, index) => (
                    <Box key={index}>
                        <Text color={colors.primary}>{symbols.bar}  </Text>
                        {getStatusIcon(item.status)}
                        <Text color={colors.text} bold> {item.label}: </Text>
                        <Text color={colors.textDim}>{item.value}</Text>
                    </Box>
                ))}
                <Text color={colors.primary}>{symbols.bar}</Text>
            </Box>

            {/* 底部 */}
            <Box>
                <Text color={colors.primary}>
                    {symbols.barEnd}{symbols.line}
                </Text>
                {footer && (
                    <Text color={colors.textMuted}> {footer}</Text>
                )}
            </Box>
        </Box>
    );
}
