/**
 * SkillWisp CLI - 品牌 Header
 * 
 * ASCII Art Logo + 版本信息
 * 支持渐变色和脉冲动画效果
 */

import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { colors } from '../theme.js';
import { usePulse } from '../hooks/index.js';

interface HeaderProps {
    version: string;
    indexVersion: string;
    animated?: boolean;
}

// ASCII Art Logo - SkillWisp (手工对齐优化版)
const BANNER_LOGO = [
    '',
    '  ███████╗██╗  ██╗██╗██╗     ██╗    ██╗    ██╗██╗███████╗██████╗ ',
    '  ██╔════╝██║ ██╔╝██║██║     ██║    ██║    ██║██║██╔════╝██╔══██╗',
    '  ███████╗█████╔╝ ██║██║     ██║    ██║ █╗ ██║██║███████╗██████╔╝',
    '  ╚════██║██╔═██╗ ██║██║     ██║    ██║███╗██║██║╚════██║██╔═══╝ ',
    '  ███████║██║  ██╗██║███████╗███████╗╚███╔███╔╝██║███████║██║    ',
    '  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚═╝╚══════╝╚═╝    ',
    '',
];

// 渐变色组（从青色到紫色）
const GRADIENT_COLORS = [
    '#5eead4', // teal-300
    '#2dd4bf', // teal-400 
    '#14b8a6', // teal-500
    '#0d9488', // teal-600
    '#0891b2', // cyan-600
    '#0284c7', // sky-600
    '#6366f1', // indigo-500
    '#8b5cf6', // violet-500
];

export function Header({
    version,
    indexVersion,
    animated = true,
}: HeaderProps): ReactNode {
    // 脉冲效果
    const pulse = usePulse(800);

    // 渐变色渲染每一行
    const renderGradientLine = (line: string, lineIndex: number): ReactNode => {
        // 跳过空行
        if (!line.trim()) {
            return <Text key={lineIndex}>{line}</Text>;
        }

        // 根据行索引选择渐变色
        const colorIndex = (lineIndex - 1) % GRADIENT_COLORS.length;
        const primaryColor = GRADIENT_COLORS[colorIndex];
        const secondaryColor = GRADIENT_COLORS[(colorIndex + 3) % GRADIENT_COLORS.length];

        // 脉冲时交替颜色
        const finalColor = (animated && pulse) ? secondaryColor : primaryColor;

        return (
            <Text key={lineIndex} color={finalColor}>
                {line}
            </Text>
        );
    };

    return (
        <Box flexDirection="column" marginBottom={1}>
            {/* ASCII Art Logo */}
            <Box flexDirection="column">
                {BANNER_LOGO.map((line, i) => renderGradientLine(line, i))}
            </Box>

            {/* 版本信息条 */}
            <Box marginTop={0}>
                <Text color={colors.textMuted}>
                    {'  '}◆ v{version}
                </Text>
                <Text color={colors.textSubtle}>
                    {' '}·{' '}
                </Text>
                <Text color={colors.textMuted}>
                    Index {indexVersion}
                </Text>
                <Text color={colors.textSubtle}>
                    {' '}·{' '}
                </Text>
                <Text color={colors.accent}>
                    AI Agent Skills
                </Text>
            </Box>
        </Box>
    );
}
