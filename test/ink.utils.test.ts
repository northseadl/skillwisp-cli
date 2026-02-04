/**
 * ink/utils/colorize 单元测试
 * 
 * 测试统一着色工具的核心功能
 */

import { describe, it, expect } from 'vitest';
import {
    colors,
    symbols,
    truncate,
    getResourceColor,
    brandLogo
} from '../src/ink/utils/index.js';

describe('ink/utils/colorize', () => {
    describe('truncate', () => {
        it('returns original text when shorter than maxLen', () => {
            expect(truncate('hello', 10)).toBe('hello');
        });

        it('truncates and adds ellipsis when text exceeds maxLen', () => {
            expect(truncate('hello world', 5)).toBe('hell…');
        });

        it('returns empty string when maxLen is 0', () => {
            expect(truncate('hello', 0)).toBe('');
        });

        it('returns empty string when maxLen is negative', () => {
            expect(truncate('hello', -1)).toBe('');
        });

        it('returns ellipsis when maxLen is 1', () => {
            expect(truncate('hello', 1)).toBe('…');
        });

        it('handles exact length correctly', () => {
            expect(truncate('hello', 5)).toBe('hello');
        });

        it('handles empty string', () => {
            expect(truncate('', 5)).toBe('');
        });
    });

    describe('getResourceColor', () => {
        it('returns cyan color function for skill type', () => {
            const colorFn = getResourceColor('skill');
            expect(typeof colorFn).toBe('function');
            // 验证是否应用了颜色（输出包含 ANSI 码或原文）
            const result = colorFn('test');
            expect(result).toContain('test');
        });

        it('returns magenta color function for rule type', () => {
            const colorFn = getResourceColor('rule');
            expect(typeof colorFn).toBe('function');
        });

        it('returns yellow color function for workflow type', () => {
            const colorFn = getResourceColor('workflow');
            expect(typeof colorFn).toBe('function');
        });
    });

    describe('colors', () => {
        it('has all required color functions', () => {
            expect(typeof colors.primary).toBe('function');
            expect(typeof colors.success).toBe('function');
            expect(typeof colors.error).toBe('function');
            expect(typeof colors.warning).toBe('function');
            expect(typeof colors.info).toBe('function');
            expect(typeof colors.dim).toBe('function');
            expect(typeof colors.muted).toBe('function');
            expect(typeof colors.bold).toBe('function');
        });

        it('applies color to text', () => {
            const result = colors.primary('test');
            expect(result).toContain('test');
        });
    });

    describe('symbols', () => {
        it('has all required symbols', () => {
            expect(symbols.success).toBe('✓');
            expect(symbols.error).toBe('✗');
            expect(symbols.warning).toBe('⚠');
            expect(symbols.info).toBe('ℹ');
            expect(symbols.pointer).toBe('❯');
            expect(symbols.wisp).toBe('✦');
        });
    });

    describe('brandLogo', () => {
        it('returns a string containing SkillWisp', () => {
            const logo = brandLogo();
            expect(logo).toContain('SkillWisp');
        });

        it('returns a string containing wisp symbol', () => {
            const logo = brandLogo();
            expect(logo).toContain('✦');
        });
    });
});
