/**
 * SkillWisp CLI - Ink 交互式入口
 * 
 * 使用纯 Ink 框架渲染高级 CLI 界面（无 clack 依赖）
 */

import { render } from 'ink';
import { App } from './App.js';
import { initI18n } from '../ui/i18n.js';

export async function main(): Promise<void> {
    // 初始化 i18n（从偏好加载，如果没有则使用默认值）
    initI18n();

    // 使用 ink 渲染主应用（语言选择在 App 内部处理）
    render(<App />);
}
