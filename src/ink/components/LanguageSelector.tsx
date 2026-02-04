/**
 * SkillWisp CLI - 语言选择器
 * 
 * 首次运行时的语言选择界面（带动画效果）
 */

import { Box, Text, useInput } from 'ink';
import { useState, type ReactNode } from 'react';
import { colors, symbols, brand } from '../theme.js';
import { useTypewriter, useFadeIn } from '../hooks/index.js';
import { SUPPORTED_LOCALES, type LocaleCode } from '../../core/i18n.js';

interface LanguageSelectorProps {
    onSelect: (locale: LocaleCode) => void;
}

export function LanguageSelector({ onSelect }: LanguageSelectorProps): ReactNode {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // 动画效果
    const welcomeText = useTypewriter('Welcome to SkillWisp', 40);
    const showOptions = useFadeIn(800);

    useInput((input, key) => {
        if (key.upArrow || input === 'k') {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SUPPORTED_LOCALES.length - 1));
        } else if (key.downArrow || input === 'j') {
            setSelectedIndex((prev) => (prev < SUPPORTED_LOCALES.length - 1 ? prev + 1 : 0));
        } else if (key.return) {
            onSelect(SUPPORTED_LOCALES[selectedIndex].code);
        }
        // 数字快捷键
        const num = parseInt(input);
        if (num >= 1 && num <= SUPPORTED_LOCALES.length) {
            setSelectedIndex(num - 1);
            onSelect(SUPPORTED_LOCALES[num - 1].code);
        }
    });

    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center">
            {/* 品牌 Logo */}
            <Box marginBottom={2}>
                <Text color={colors.primary} bold>
                    {brand.logo}
                </Text>
            </Box>

            {/* 欢迎语（打字机效果） */}
            <Box marginBottom={1}>
                <Text color={colors.text}>{welcomeText}</Text>
            </Box>

            {/* 提示 */}
            <Box marginBottom={1}>
                <Text color={colors.textMuted}>Select your language / 选择语言</Text>
            </Box>

            {/* 语言选项（渐入） */}
            {showOptions && (
                <Box flexDirection="column" marginTop={1}>
                    {SUPPORTED_LOCALES.map((locale, index) => {
                        const isFocused = index === selectedIndex;
                        return (
                            <Box key={locale.code}>
                                <Text color={colors.textSubtle}>{index + 1}. </Text>
                                <Text color={isFocused ? colors.primary : colors.textMuted}>
                                    {isFocused ? symbols.radioOn : symbols.radioOff}
                                </Text>
                                <Text color={isFocused ? colors.text : colors.textDim}>
                                    {' '}{locale.label}
                                </Text>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* 底部提示 */}
            <Box marginTop={2}>
                <Text color={colors.textMuted}>
                    {symbols.arrow.up}{symbols.arrow.down} <Text color={colors.textSubtle}>or</Text> j/k navigate ·
                    <Text color={colors.primaryBright}> 1-{SUPPORTED_LOCALES.length}</Text> quick select ·
                    Enter confirm
                </Text>
            </Box>
        </Box>
    );
}
