/**
 * Console 着色工具
 * 
 * 将 Ink 主题的 Hex 颜色转换为 picocolors 输出
 * 用于非 Ink 模式（如 --json, --quiet, 管道输出）
 */

import pc from 'picocolors';
import { colors as inkColors } from '../theme.js';

// 语义色映射 - 使用 picocolors 内置色彩
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

// 符号系统 - 与 Ink 主题保持一致
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

/**
 * 根据资源类型获取颜色函数
 */
export function getResourceColor(type: 'skill' | 'rule' | 'workflow'): (s: string) => string {
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

/**
 * 构建带色彩的品牌 Logo
 */
export function brandLogo(): string {
    return `${colors.primary(symbols.wisp)} ${colors.bold('SkillWisp')}`;
}

/**
 * 创建控制台 Spinner
 */
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

/**
 * 操作结果摘要选项
 */
export interface ResultSummaryOptions {
    title: string;
    items: Array<{
        label: string;
        value: string;
        status?: 'success' | 'error' | 'info';
    }>;
    footer?: string;
}

/**
 * 渲染操作结果摘要（高亮 Box）
 */
export function resultSummary(options: ResultSummaryOptions): void {
    const { title, items, footer } = options;

    console.log();
    console.log(colors.bold(colors.primary(`┌─ ${title} ─`)));
    console.log(colors.primary('│'));

    for (const item of items) {
        const statusIcon = item.status === 'success'
            ? colors.success(symbols.success)
            : item.status === 'error'
                ? colors.error(symbols.error)
                : colors.info(symbols.info);

        console.log(colors.primary('│  ') + `${statusIcon} ${colors.bold(item.label)}: ${item.value}`);
    }

    console.log(colors.primary('│'));

    if (footer) {
        console.log(colors.primary('└─ ') + colors.muted(footer));
    } else {
        console.log(colors.primary('└─────'));
    }
    console.log();
}
