/**
 * 用户偏好管理
 *
 * 持久化存储用户的 Agent 选择偏好
 * 存储位置: ~/.skillwisp/preferences.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import type { UserPreferences } from './types.js';

const PREFERENCES_VERSION = 1;
const CONFIG_DIR = join(homedir(), '.agent', '.skillwisp');
const PREFERENCES_FILE = join(CONFIG_DIR, 'preferences.json');

// ═══════════════════════════════════════════════════════════════════════════
// 偏好读取
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 加载用户偏好（容错处理，损坏时返回默认值）
 */
export function loadPreferences(): UserPreferences {
    try {
        if (!existsSync(PREFERENCES_FILE)) {
            return createDefaultPreferences();
        }

        const content = readFileSync(PREFERENCES_FILE, 'utf-8');
        const prefs = JSON.parse(content) as UserPreferences;

        // 版本迁移检查
        if (prefs.version !== PREFERENCES_VERSION) {
            return migratePreferences(prefs);
        }

        return prefs;
    } catch {
        // 文件损坏或解析失败，静默回退
        return createDefaultPreferences();
    }
}

/**
 * 获取默认 Agent 选择（如果已保存）
 */
export function getDefaultAgents(): string[] | undefined {
    const prefs = loadPreferences();
    return prefs.defaultAgents;
}

/**
 * 检查是否有已保存的默认 Agent
 */
export function hasDefaultAgents(): boolean {
    const agents = getDefaultAgents();
    return agents !== undefined && agents.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 偏好写入
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 保存默认 Agent 选择
 */
export function saveDefaultAgents(agents: string[]): void {
    const prefs = loadPreferences();
    prefs.defaultAgents = agents;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

/**
 * 清除默认 Agent 选择
 */
export function clearDefaultAgents(): void {
    const prefs = loadPreferences();
    delete prefs.defaultAgents;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

/**
 * 重置全部偏好设置
 */
export function resetPreferences(): void {
    const prefs = createDefaultPreferences();
    savePreferences(prefs);
}

/**
 * 获取自动更新设置
 */
export function getAutoUpdate(): boolean {
    const prefs = loadPreferences();
    return prefs.autoUpdate !== false; // 默认开启
}

/**
 * 设置自动更新
 */
export function setAutoUpdate(enabled: boolean): void {
    const prefs = loadPreferences();
    prefs.autoUpdate = enabled;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

/**
 * 获取检测间隔（小时）
 */
export function getCheckInterval(): number {
    const prefs = loadPreferences();
    return prefs.checkInterval || 24; // 默认 24 小时
}

/**
 * 设置检测间隔（小时）
 */
export function setCheckInterval(hours: number): void {
    const prefs = loadPreferences();
    prefs.checkInterval = hours;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

/**
 * 获取首选镜像
 */
export function getPreferredMirror(): string | undefined {
    const prefs = loadPreferences();
    return prefs.preferredMirror;
}

/**
 * 设置首选镜像
 */
export function setPreferredMirror(mirror: string | undefined): void {
    const prefs = loadPreferences();
    prefs.preferredMirror = mirror;
    prefs.lastUpdated = new Date().toISOString();
    savePreferences(prefs);
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部函数
// ═══════════════════════════════════════════════════════════════════════════

function createDefaultPreferences(): UserPreferences {
    return {
        version: PREFERENCES_VERSION,
    };
}

function savePreferences(prefs: UserPreferences): void {
    // 确保配置目录存在
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(PREFERENCES_FILE, JSON.stringify(prefs, null, 2), 'utf-8');
}

function migratePreferences(oldPrefs: UserPreferences): UserPreferences {
    // 未来版本迁移逻辑
    // 当前仅重置为默认值
    return createDefaultPreferences();
}
