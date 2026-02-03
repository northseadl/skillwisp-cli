/**
 * 国际化 (i18n) 工具模块
 *
 * 提供 UI 字符串翻译和语言偏好管理
 */

import { loadLocale } from '../core/registry.js';
import { loadPreferences, savePreferences } from '../core/preferences.js';
import type { LocaleData } from '../core/types.js';

// 支持的语言列表
export const SUPPORTED_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'zh-CN', name: '简体中文' },
] as const;

export type LocaleCode = typeof SUPPORTED_LOCALES[number]['code'];

// 缓存当前语言数据
let currentLocale: LocaleData | null = null;
let currentLocaleCode: LocaleCode = 'en';

/**
 * 初始化 i18n 系统
 * 从偏好加载语言设置，如果没有则返回 false 表示需要首次设置
 */
export function initI18n(): boolean {
    const prefs = loadPreferences();

    if (prefs.locale) {
        currentLocaleCode = prefs.locale as LocaleCode;
        currentLocale = loadLocale(currentLocaleCode);
        return true;
    }

    // 没有语言偏好，使用默认英文
    currentLocaleCode = 'en';
    currentLocale = loadLocale('en');
    return false;
}

/**
 * 设置并持久化语言偏好
 */
export function setLocale(code: LocaleCode): void {
    currentLocaleCode = code;
    currentLocale = loadLocale(code);

    const prefs = loadPreferences();
    prefs.locale = code;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

/**
 * 获取当前语言代码
 */
export function getLocaleCode(): LocaleCode {
    return currentLocaleCode;
}

/**
 * 获取当前语言数据（用于资源本地化）
 */
export function getLocaleData(): LocaleData | null {
    return currentLocale;
}

/**
 * 获取 UI 字符串
 * @param key UI 字符串键名
 * @param fallback 回退值（默认使用 key 本身）
 */
export function t(key: string, fallback?: string): string {
    const value = currentLocale?.ui[key];
    if (value) return value;

    // 回退到英文
    if (currentLocaleCode !== 'en') {
        const enLocale = loadLocale('en');
        const enValue = enLocale?.ui[key];
        if (enValue) return enValue;
    }

    return fallback ?? key;
}

/**
 * 检查是否需要语言设置（首次运行）
 */
export function needsLanguageSetup(): boolean {
    const prefs = loadPreferences();
    return !prefs.locale;
}
