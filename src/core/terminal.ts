/**
 * 终端工具层
 *
 * 纯终端相关的着色、符号和工具函数
 * 独立于 Ink 渲染层，供 CLI 命令层使用
 */

import pc from 'picocolors';
import type { ResourceType } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// 语义色映射
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    // 主色调
    primary: pc.cyan,

    // 语义色
    success: pc.green,
    error: pc.red,
    warning: pc.yellow,
    info: pc.blue,

    // 文本层级
    text: (s: string) => s,
    dim: pc.dim,
    muted: pc.dim,

    // 强调
    bold: pc.bold,
    underline: pc.underline,

    // 资源类型色
    skill: pc.cyan,
    rule: pc.magenta,
    workflow: pc.yellow,

    // 组合
    highlight: (s: string) => pc.bold(pc.cyan(s)),
};

// ═══════════════════════════════════════════════════════════════════════════
// 符号系统
// ═══════════════════════════════════════════════════════════════════════════

export const symbols = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',

    bullet: '›',
    arrow: '→',
    pointer: '❯',

    // 资源类型图标
    skill: '◆',
    rule: '▣',
    workflow: '⚡',

    // 品牌
    wisp: '✦',
};

// ═══════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 根据资源类型获取颜色函数
 */
export function getResourceColor(type: ResourceType): (s: string) => string {
    return colors[type];
}

/**
 * 截断文本并添加省略号
 */
export function truncate(text: string, maxLen: number): string {
    if (maxLen <= 0) return '';
    if (text.length <= maxLen) return text;
    if (maxLen === 1) return '…';
    return text.slice(0, maxLen - 1) + '…';
}

// ═══════════════════════════════════════════════════════════════════════════
// Spinner
// ═══════════════════════════════════════════════════════════════════════════

export interface Spinner {
    start: (message: string) => void;
    update: (message: string) => void;
    stop: (message: string, status?: 'success' | 'error' | 'warning') => void;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80;

export function createSpinner(): Spinner {
    let frameIndex = 0;
    let timer: NodeJS.Timeout | null = null;
    let currentMessage = '';
    const isTTY = Boolean(process.stdout.isTTY);
    let cursorHidden = false;

    const render = () => {
        const frame = SPINNER_FRAMES[frameIndex];
        process.stdout.write(`\r${colors.primary(frame)} ${currentMessage}`);
        frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
    };

    return {
        start(message: string) {
            currentMessage = message;
            if (!isTTY) return;

            process.stdout.write('\x1B[?25l');
            cursorHidden = true;
            render();
            timer = setInterval(render, SPINNER_INTERVAL);
        },

        update(message: string) {
            currentMessage = message;
        },

        stop(message: string, status: 'success' | 'error' | 'warning' = 'success') {
            const statusColors = { success: colors.success, error: colors.error, warning: colors.warning };
            const statusSymbols = { success: symbols.success, error: symbols.error, warning: symbols.warning };

            const colorFn = statusColors[status];
            const symbol = statusSymbols[status];

            if (!isTTY) {
                console.log(`${colorFn(symbol)} ${message}`);
                return;
            }

            if (timer) {
                clearInterval(timer);
                timer = null;
            }

            process.stdout.write(`\r\x1B[K${colorFn(symbol)} ${message}\n`);
            if (cursorHidden) {
                process.stdout.write('\x1B[?25h');
                cursorHidden = false;
            }
        },
    };
}

