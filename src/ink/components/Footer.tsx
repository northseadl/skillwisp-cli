/**
 * SkillWisp CLI - 固定底部提示栏
 * 
 * 始终显示在交互界面底部的操作提示
 * 支持动态显示不同的快捷键提示
 */

import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { colors, symbols } from '../theme.js';

interface FooterProps {
    hint?: string;
    showShortcuts?: boolean;
}

export function Footer({ hint, showShortcuts = true }: FooterProps): ReactNode {
    const defaultHint = '↑↓ or j/k navigate · 1-9 quick select · q exit';

    return (
        <Box
            borderStyle="single"
            borderColor={colors.border}
            paddingX={1}
            marginTop={1}
        >
            <Box flexGrow={1}>
                <Text color={colors.info}>
                    {symbols.info}
                </Text>
                <Text color={colors.textMuted}>
                    {' '}{hint || defaultHint}
                </Text>
            </Box>
            {showShortcuts && (
                <Box>
                    <Text color={colors.textSubtle}>
                        <Text color={colors.primaryBright}>Ctrl+C</Text> exit
                    </Text>
                </Box>
            )}
        </Box>
    );
}
