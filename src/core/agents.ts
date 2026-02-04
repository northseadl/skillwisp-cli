/**
 * App/Target 配置与检测
 *
 * 注：内部使用 "agent" 作为 ID 保持兼容，用户界面统一使用 "app/target" 术语
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

import type { ResourceType } from './types.js';
import { RESOURCE_CONFIG } from './types.js';

export interface AgentConfig {
    id: string;
    name: string;
    baseDir: string;
    globalBaseDir: string;
    detectPaths: string[];
    priority: number;
}

export const PRIMARY_SOURCE: AgentConfig = {
    id: 'agent',
    name: '.agent',
    baseDir: '.agent',
    globalBaseDir: '.agent',
    detectPaths: ['.agent'],
    priority: 0,
};

export const TARGET_APPS: AgentConfig[] = [
    {
        id: 'claude',
        name: 'Claude Code',
        baseDir: '.claude',
        globalBaseDir: '.claude',
        detectPaths: ['.claude', '.claude/settings.json'],
        priority: 1,
    },
    {
        id: 'cursor',
        name: 'Cursor',
        baseDir: '.cursor',
        globalBaseDir: '',
        detectPaths: ['.cursor', '.cursorrules', '.cursor/rules', '.cursor/skills'],
        priority: 2,
    },
    {
        id: 'gemini',
        name: 'Gemini',
        baseDir: '.gemini',
        globalBaseDir: '.gemini',
        detectPaths: ['.gemini', '.gemini/skills'],
        priority: 3,
    },
    {
        id: 'codex',
        name: 'Codex',
        baseDir: '.codex',
        globalBaseDir: '.codex',
        detectPaths: ['.codex', '.codex/skills'],
        priority: 4,
    },
    {
        id: 'copilot',
        name: 'GitHub Copilot',
        baseDir: '.github',
        globalBaseDir: '.copilot',
        detectPaths: ['.github', '.github/copilot-instructions.md', '.github/skills', '.github/prompts'],
        priority: 5,
    },
    {
        id: 'trae',
        name: 'Trae',
        baseDir: '.trae',
        globalBaseDir: '.trae',
        detectPaths: ['.trae', '.trae/skills'],
        priority: 6,
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        baseDir: '.windsurf',
        globalBaseDir: '.codeium/windsurf',
        detectPaths: ['.windsurf', '.windsurf/skills', '.codeium/windsurf', '.codeium/windsurf/skills'],
        priority: 7,
    },
    {
        id: 'kiro',
        name: 'Kiro',
        baseDir: '.kiro',
        globalBaseDir: '',
        detectPaths: ['.kiro', '.kiro/steering', '.kiro/specs'],
        priority: 8,
    },
    {
        id: 'augment',
        name: 'Augment',
        baseDir: '.augment',
        globalBaseDir: '.augment',
        detectPaths: ['.augment', '.augment/skills', '.augment/rules', '.augment-guidelines'],
        priority: 9,
    },
    {
        // Antigravity (Google Gemini Agent)
        // 项目级目录 .agent 与 PRIMARY_SOURCE 重叠，不支持独立项目级安装
        // 全局级使用专属目录 ~/.gemini/antigravity/skills/
        id: 'antigravity',
        name: 'Antigravity',
        baseDir: '', // 空：项目级复用 PRIMARY_SOURCE (.agent)
        globalBaseDir: '.gemini/antigravity',
        detectPaths: ['.gemini/antigravity', '.agent/skills'],
        priority: 10,
    },
];

export const ALL_APPS: AgentConfig[] = [PRIMARY_SOURCE, ...TARGET_APPS];

export function getAppById(id: string): AgentConfig | undefined {
    return ALL_APPS.find((a) => a.id === id);
}

export function getAppsByIds(ids: string[]): AgentConfig[] {
    return ids
        .map((id) => getAppById(id))
        .filter((a): a is AgentConfig => a !== undefined);
}

export function getAppIds(): string[] {
    return ALL_APPS.map((a) => a.id);
}

export function detectApps(): AgentConfig[] {
    const detected: AgentConfig[] = [];

    for (const app of TARGET_APPS) {
        for (const detectPath of app.detectPaths) {
            const localPath = join(process.cwd(), detectPath);
            const globalPath = join(homedir(), detectPath);

            if (existsSync(localPath) || existsSync(globalPath)) {
                detected.push(app);
                break;
            }
        }
    }

    return detected;
}

export function getAppResourceDir(app: AgentConfig, resourceType: ResourceType): string {
    return join(app.baseDir, RESOURCE_CONFIG[resourceType].dirName);
}

export function getAppGlobalResourceDir(app: AgentConfig, resourceType: ResourceType): string {
    if (!app.globalBaseDir) return '';
    return join(app.globalBaseDir, RESOURCE_CONFIG[resourceType].dirName);
}
