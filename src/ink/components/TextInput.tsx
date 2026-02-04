/**
 * SkillWisp CLI - 文本输入
 * 
 * 使用 ink-text-input 的交互式文本输入框
 */

import { Box, Text, useInput } from 'ink';
import TextInputComponent from 'ink-text-input';
import { useState, type ReactNode } from 'react';
import { colors, symbols } from '../theme.js';

interface TextInputProps {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    onSubmit: (value: string) => void;
    onCancel?: () => void;
}

export function TextInput({
    message,
    placeholder = '',
    defaultValue = '',
    onSubmit,
    onCancel,
}: TextInputProps): ReactNode {
    const [value, setValue] = useState(defaultValue);

    useInput((input, key) => {
        if (key.escape && onCancel) {
            onCancel();
        }
    });

    return (
        <Box flexDirection="column">
            {/* 提示消息 */}
            <Box marginBottom={1}>
                <Text color={colors.primary} bold>
                    {symbols.wisp}
                </Text>
                <Text> {message}</Text>
            </Box>

            {/* 输入框 */}
            <Box marginLeft={2}>
                <Text color={colors.textMuted}>{symbols.pointer} </Text>
                <TextInputComponent
                    value={value}
                    onChange={setValue}
                    onSubmit={onSubmit}
                    placeholder={placeholder}
                />
            </Box>
        </Box>
    );
}
