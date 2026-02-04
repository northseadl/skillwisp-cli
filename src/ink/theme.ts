/**
 * SkillWisp CLI - Ink 主题配置
 * 
 * Aurora Mist 配色方案
 * 以薄荷青绿为主色调，搭配琥珀暖色点缀的现代 CLI 设计语言
 * 
 * 设计原则：
 * - 高辨识度：摒弃通用配色，建立独特品牌视觉
 * - 高对比度：满足 WCAG AA 标准 (≥4.5:1)
 * - 语义清晰：状态色具有强烈的情感表达
 */

// ═══════════════════════════════════════════════════════════════════════════
// 颜色系统 - Aurora Mist Palette
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    // 主色调 - 薄荷青绿 (Mint Teal)
    primary: '#14b8a6',        // Teal-500: 主要强调色
    primaryBright: '#2dd4bf',  // Teal-400: 高亮/脉冲
    primaryDim: '#0d9488',     // Teal-600: 选中/按下

    // 点缀色 - 琥珀暖色 (Amber Accent)
    accent: '#f59e0b',         // Amber-500: 品牌亮点
    accentBright: '#fbbf24',   // Amber-400: 徽标脉冲

    // 语义状态色 (Aurora Semantic)
    success: '#22c55e',        // Green-500: 积极成功
    error: '#ef4444',          // Red-500: 错误警告
    warning: '#f97316',        // Orange-500: 需要注意
    info: '#38bdf8',           // Sky-400: 信息提示

    // 文本层级 (Zinc Scale - 优化暗色终端)
    text: '#f4f4f5',           // Zinc-100: 主文本
    textDim: '#d4d4d8',        // Zinc-300: 次要文本
    textMuted: '#a1a1aa',      // Zinc-400: 提示/禁用
    textSubtle: '#71717a',     // Zinc-500: 非常淡的提示

    // 背景层 (深空灰)
    bgDark: '#09090b',         // Zinc-950: 最深背景
    bgLight: '#18181b',        // Zinc-900: 容器背景
    bgHighlight: '#27272a',    // Zinc-800: 高亮/选中背景

    // 边框
    border: '#3f3f46',         // Zinc-700: 静态边框
    borderActive: '#14b8a6',   // Teal-500: 激活边框

    // 渐变梯度 (用于动画/特效)
    gradient: {
        aurora: ['#14b8a6', '#2dd4bf', '#5eead4'],      // 薄荷渐变
        sunset: ['#f97316', '#f59e0b', '#fbbf24'],      // 日落渐变
        cosmic: ['#14b8a6', '#38bdf8', '#a855f7'],      // 宇宙渐变
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// 符号系统
// ═══════════════════════════════════════════════════════════════════════════

export const symbols = {
    // 状态标记
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',

    // 导航指示器
    pointer: '❯',
    pointerSmall: '›',

    // 选择状态
    radioOn: '●',
    radioOff: '○',
    checkboxOn: '◼',
    checkboxOff: '◻',

    // 品牌符号
    wisp: '✦',             // 五角星：灵动之光
    spark: '⚡',            // 闪电：技能赋能

    // 边框绘制
    bar: '│',
    barEnd: '└',
    corner: '┌',
    line: '─',

    // 方向箭头
    arrow: {
        up: '↑',
        down: '↓',
        left: '←',
        right: '→',
    },

    // 方向箭头 (顶层快捷访问)
    arrowUp: '↑',
    arrowDown: '↓',

    // 加载动画帧 (Braille)
    spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

// ═══════════════════════════════════════════════════════════════════════════
// 品牌资产
// ═══════════════════════════════════════════════════════════════════════════

export const brand = {
    name: 'SkillWisp',
    tagline: 'AI Agent Skill Distribution',

    // 紧凑型 Logo (Header 使用)
    logo: '✦ SkillWisp',

    // 高保真 ASCII 徽标 (首次启动/欢迎页)
    logoAscii: `
    ╭───────────────────────────────╮
    │                               │
    │   ✦  S k i l l W i s p  ✦    │
    │                               │
    │   ░▒▓ Agent Skill Gateway ▓▒░ │
    │                               │
    ╰───────────────────────────────╯
`,

    // 最小化徽标 (加载动画)
    logoMini: '✦ SW',
};
