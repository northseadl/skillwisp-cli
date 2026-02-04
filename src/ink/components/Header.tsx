/**
 * SkillWisp CLI - 品牌 Header
 * 
 * 显示品牌标识、版本号和索引版本
 * 支持脉冲动画效果
 */

import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { colors, symbols, brand } from '../theme.js';
import { usePulse } from '../hooks/index.js';

interface HeaderProps {
    version: string;
    indexVersion: string;
    animated?: boolean;
}

export function Header({
    version,
    indexVersion,
    animated = true,
}: HeaderProps): ReactNode {
    // 钻石脉冲效果
    const pulse = usePulse(1000);
    const diamondColor = animated && pulse ? colors.primaryBright : colors.primary;

    return (
        <Box flexDirection="column" marginBottom={1}>
            {/* 品牌 Logo */}
            <Box>
                <Text color={diamondColor} bold>
                    {symbols.wisp}
                </Text>
                <Text color={colors.primary} bold>
                    {' '}{brand.name}
                </Text>
            </Box>

            {/* 版本信息 */}
            <Box>
                <Text color={colors.textMuted}>
                    {'  '}v{version}
                </Text>
                <Text color={colors.textSubtle}>
                    {' '}·{' '}
                </Text>
                <Text color={colors.textMuted}>
                    Index {indexVersion}
                </Text>
            </Box>
        </Box>
    );
}
