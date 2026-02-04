/**
 * UI 系统
 *
 * 2025 现代 CLI 设计规范
 * - Nord 低饱和护眼配色
 * - Braille spinner 动画
 * - Box 边框结构
 * - 无 emoji
 */

import pc from 'picocolors';

// ═══════════════════════════════════════════════════════════════════════════
// 配色系统 (Nord 风格)
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    // 文本层级
    primary: pc.cyan,           // 标题/强调
    secondary: pc.white,        // 正文
    muted: pc.dim,              // 次要说明

    // 语义色
    success: pc.green,          // 成功
    error: pc.red,              // 错误
    warning: pc.yellow,         // 警告
    info: pc.blue,              // 信息

    // 资源类型色彩（规划式指令高亮）
    skill: pc.cyan,             // Skill = 主色调
    rule: pc.magenta,           // Rule = 洋红（区分于 Skill）
    workflow: pc.yellow,        // Workflow = 金黄

    // 交互高亮
    highlight: (text: string) => pc.bold(pc.cyan(text)),
    accent: pc.magenta,         // 次要强调色

    // 强调
    bold: pc.bold,
    underline: pc.underline,
};

/**
 * 根据资源类型获取对应颜色
 */
export function getResourceColor(type: 'skill' | 'rule' | 'workflow'): (text: string) => string {
    return colors[type];
}

// ═══════════════════════════════════════════════════════════════════════════
// 符号系统 (纯 ASCII/Unicode，无 emoji)
// ═══════════════════════════════════════════════════════════════════════════

export const symbols = {
    // 状态
    success: '[ok]',
    error: '[!!]',
    warning: '[!]',
    info: '[i]',

    // 列表
    bullet: '-',
    arrow: '>',
    link: '~>',

    // 边框
    boxTopLeft: '+',
    boxTopRight: '+',
    boxBottomLeft: '+',
    boxBottomRight: '+',
    boxHorizontal: '-',
    boxVertical: '|',
    boxDivider: '+',
};

// ═══════════════════════════════════════════════════════════════════════════
// Spinner 动画 (Braille dots)
// ═══════════════════════════════════════════════════════════════════════════

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80;

export interface Spinner {
    start: (message: string) => void;
    update: (message: string) => void;
    stop: (message: string, status?: 'success' | 'error' | 'warning') => void;
}

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

            process.stdout.write('\x1B[?25l'); // 隐藏光标
            cursorHidden = true;
            render();
            timer = setInterval(render, SPINNER_INTERVAL);
        },

        update(message: string) {
            currentMessage = message;
        },

        stop(message: string, status: 'success' | 'error' | 'warning' = 'success') {
            if (!isTTY) {
                const statusSymbol = status === 'success'
                    ? colors.success(symbols.success)
                    : status === 'error'
                        ? colors.error(symbols.error)
                        : colors.warning(symbols.warning);
                console.log(`${statusSymbol} ${message}`);
                return;
            }

            if (timer) {
                clearInterval(timer);
                timer = null;
            }

            const statusSymbol = status === 'success'
                ? colors.success(symbols.success)
                : status === 'error'
                    ? colors.error(symbols.error)
                    : colors.warning(symbols.warning);

            process.stdout.write(`\r\x1B[K${statusSymbol} ${message}\n`);
            if (cursorHidden) {
                process.stdout.write('\x1B[?25h'); // 恢复光标
                cursorHidden = false;
            }
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Box 边框
// ═══════════════════════════════════════════════════════════════════════════

export function box(title: string, content: string[], width: number = 50): string {
    const lines: string[] = [];

    // 标题行
    const titlePadding = width - title.length - 4;
    lines.push(
        `${symbols.boxTopLeft}${symbols.boxHorizontal} ${title} ${symbols.boxHorizontal.repeat(Math.max(0, titlePadding))}${symbols.boxTopRight}`
    );

    // 空行
    lines.push(`${symbols.boxVertical}${' '.repeat(width)}${symbols.boxVertical}`);

    // 内容
    for (const line of content) {
        const padding = width - stripAnsi(line).length;
        lines.push(`${symbols.boxVertical} ${line}${' '.repeat(Math.max(0, padding - 1))}${symbols.boxVertical}`);
    }

    // 空行
    lines.push(`${symbols.boxVertical}${' '.repeat(width)}${symbols.boxVertical}`);

    // 底部
    lines.push(
        `${symbols.boxBottomLeft}${symbols.boxHorizontal.repeat(width)}${symbols.boxBottomRight}`
    );

    return lines.join('\n');
}

export function divider(width: number = 50): string {
    return colors.muted(symbols.boxHorizontal.repeat(width));
}

// ═══════════════════════════════════════════════════════════════════════════
// 格式化输出
// ═══════════════════════════════════════════════════════════════════════════

export function header(text: string): void {
    console.log();
    console.log(colors.bold(colors.primary(text)));
    console.log(divider(text.length + 4));
}

export function item(primary: string, secondary?: string): void {
    if (secondary) {
        console.log(`  ${symbols.bullet} ${colors.bold(primary)}`);
        console.log(`    ${colors.muted(secondary)}`);
    } else {
        console.log(`  ${symbols.bullet} ${primary}`);
    }
}

export function success(message: string): void {
    console.log(`${colors.success(symbols.success)} ${message}`);
}

export function error(message: string): void {
    console.log(`${colors.error(symbols.error)} ${message}`);
}

export function warning(message: string): void {
    console.log(`${colors.warning(symbols.warning)} ${message}`);
}

export function info(message: string): void {
    console.log(`${colors.info(symbols.info)} ${message}`);
}

export function muted(message: string): void {
    console.log(colors.muted(message));
}

// ═══════════════════════════════════════════════════════════════════════════
// 表格
// ═══════════════════════════════════════════════════════════════════════════

export function table(
    headers: string[],
    rows: string[][],
    colWidths?: number[]
): void {
    // 计算列宽
    const widths = colWidths || headers.map((h, i) => {
        const dataMax = Math.max(...rows.map((r) => stripAnsi(r[i] || '').length));
        return Math.max(h.length, dataMax);
    });

    // 打印表头
    const headerLine = headers
        .map((h, i) => padRight(h, widths[i]))
        .join('  ');
    console.log(colors.bold(headerLine));
    console.log(colors.muted(widths.map((w) => '-'.repeat(w)).join('  ')));

    // 打印数据
    for (const row of rows) {
        const line = row
            .map((cell, i) => padRight(cell || '', widths[i]))
            .join('  ');
        console.log(line);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════

function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function padRight(text: string, width: number): string {
    const len = stripAnsi(text).length;
    return text + ' '.repeat(Math.max(0, width - len));
}

export function truncate(text: string, maxLen: number): string {
    if (maxLen <= 0) return '';
    if (text.length <= maxLen) return text;
    if (maxLen === 1) return '…';
    return text.slice(0, maxLen - 1) + '…';
}

// ═══════════════════════════════════════════════════════════════════════════
// 品牌 Logo (ASCII Art)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 渲染 SkillWisp 品牌 Logo
 * 简约现代风格，类似 Next.js/Vite CLI
 */
export function brandLogo(): void {
    // 简洁的品牌标识 + 渐变效果
    console.log();
    console.log(`  ${colors.primary('◆')} ${colors.bold(colors.primary('Skill'))}${colors.bold('Wisp')}`);
}

/**
 * 渲染简化版品牌标识（单行）
 */
export function brandMark(): string {
    return `${colors.primary('◆')} ${colors.bold('SkillWisp')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 操作结果摘要
// ═══════════════════════════════════════════════════════════════════════════

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

/**
 * 渲染操作成功提示
 */
export function operationSuccess(message: string, details?: string[]): void {
    console.log();
    console.log(colors.success(`${symbols.success} ${colors.bold(message)}`));
    if (details && details.length > 0) {
        for (const detail of details) {
            console.log(colors.muted(`   ${symbols.arrow} ${detail}`));
        }
    }
    console.log();
}
