/**
 * SkillWisp CLI - Ink 主题配置
 * 
 * Nord-style 配色方案，用于高级 CLI 界面
 */

// ═══════════════════════════════════════════════════════════════════════════
// 颜色系统
// ═══════════════════════════════════════════════════════════════════════════

export const colors = {
    // 主色调 - 青色 (Nord Frost)
    primary: '#88c0d0',
    primaryBright: '#8fbcbb',
    primaryDim: '#5e81ac',

    // 成功/错误/警告 (Nord Aurora)
    success: '#a3be8c',
    error: '#bf616a',
    warning: '#ebcb8b',
    info: '#81a1c1',

    // 文本 (优化对比度)
    text: '#eceff4',           // Nord Snow Storm - 主文本
    textDim: '#d8dee9',        // 次要文本
    textMuted: '#8394a8',      // 提示文本 (从 #4c566a 提亮)
    textSubtle: '#6b7b8c',     // 更淡的提示

    // 背景 (Nord Polar Night)
    bgDark: '#2e3440',
    bgLight: '#3b4252',
    bgHighlight: '#434c5e',

    // 边框
    border: '#5c6b7a',         // 提亮边框
    borderActive: '#88c0d0',

    // 渐变色 (用于特殊效果)
    gradient: {
        frost: ['#8fbcbb', '#88c0d0', '#81a1c1'],
        aurora: ['#bf616a', '#d08770', '#ebcb8b', '#a3be8c'],
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// 符号
// ═══════════════════════════════════════════════════════════════════════════

export const symbols = {
    // 状态
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',

    // 导航
    pointer: '❯',
    pointerSmall: '›',

    // 选择
    radioOn: '●',
    radioOff: '○',
    checkboxOn: '◼',
    checkboxOff: '◻',

    // 品牌
    diamond: '◆',

    // 边框
    bar: '│',
    barEnd: '└',
    corner: '┌',
    line: '─',

    // 箭头
    arrow: {
        up: '↑',
        down: '↓',
        left: '←',
        right: '→',
    },

    // 加载
    spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

// ═══════════════════════════════════════════════════════════════════════════
// 品牌
// ═══════════════════════════════════════════════════════════════════════════

export const brand = {
    name: 'SkillWisp',
    tagline: 'AI Agent Skill Distribution',
    logo: '◆ SkillWisp',
    logoAscii: `
   ╭─────────────────────────╮
   │  ◆  S k i l l W i s p  │
   ╰─────────────────────────╯
`,
};
