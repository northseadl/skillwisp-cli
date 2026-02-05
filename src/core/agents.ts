/**
 * App/Target 配置与检测
 *
 * 注：内部使用 "agents" 作为主源 ID，用户界面统一使用 "app/target" 术语
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
    /**
     * Compatibility hints for installs.
     * Example: some tools reuse PRIMARY_SOURCE for local skills.
     */
    compat?: {
        /** Local skill installs should reuse PRIMARY_SOURCE (no separate dir). */
        localSkillUsesPrimary?: boolean;
        /** Optional note for user-facing prompts. */
        note?: string;
    };
}

export const PRIMARY_SOURCE: AgentConfig = {
    id: 'agents',
    name: '.agents',
    baseDir: '.agents',
    globalBaseDir: '.agents',
    detectPaths: ['.agents'],
    priority: 0,
};

export const TARGET_APPS: AgentConfig[] = [
    {
        id: 'amp',
        name: 'Amp',
        baseDir: '.agents',
        globalBaseDir: '.config/agents',
        detectPaths: ['.config/agents'],
        priority: 1,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'kimi-cli',
        name: 'Kimi Code CLI',
        baseDir: '.agents',
        globalBaseDir: '.config/agents',
        detectPaths: ['.config/agents'],
        priority: 2,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'antigravity',
        name: 'Antigravity',
        baseDir: '.agent',
        globalBaseDir: '.gemini/antigravity',
        detectPaths: ['.agent', '.gemini/antigravity'],
        priority: 3,
    },
    {
        id: 'augment',
        name: 'Augment',
        baseDir: '.augment',
        globalBaseDir: '.augment',
        detectPaths: ['.augment', '.augment/skills'],
        priority: 4,
    },
    {
        id: 'claude-code',
        name: 'Claude Code',
        baseDir: '.claude',
        globalBaseDir: '.claude',
        detectPaths: ['.claude', '.claude/skills'],
        priority: 5,
    },
    {
        id: 'openclaw',
        name: 'OpenClaw',
        baseDir: '',
        globalBaseDir: '.moltbot',
        detectPaths: ['.moltbot'],
        priority: 6,
    },
    {
        id: 'cline',
        name: 'Cline',
        baseDir: '.cline',
        globalBaseDir: '.cline',
        detectPaths: ['.cline', '.cline/skills'],
        priority: 7,
    },
    {
        id: 'codebuddy',
        name: 'CodeBuddy',
        baseDir: '.codebuddy',
        globalBaseDir: '.codebuddy',
        detectPaths: ['.codebuddy', '.codebuddy/skills'],
        priority: 8,
    },
    {
        id: 'codex',
        name: 'Codex',
        baseDir: '.agents',
        globalBaseDir: '.codex',
        detectPaths: ['.codex', '.codex/skills'],
        priority: 9,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'command-code',
        name: 'Command Code',
        baseDir: '.commandcode',
        globalBaseDir: '.commandcode',
        detectPaths: ['.commandcode', '.commandcode/skills'],
        priority: 10,
    },
    {
        id: 'continue',
        name: 'Continue',
        baseDir: '.continue',
        globalBaseDir: '.continue',
        detectPaths: ['.continue', '.continue/skills'],
        priority: 11,
    },
    {
        id: 'crush',
        name: 'Crush',
        baseDir: '.crush',
        globalBaseDir: '.config/crush',
        detectPaths: ['.crush', '.config/crush'],
        priority: 12,
    },
    {
        id: 'cursor',
        name: 'Cursor',
        baseDir: '.cursor',
        globalBaseDir: '.cursor',
        detectPaths: ['.cursor', '.cursor/skills'],
        priority: 13,
    },
    {
        id: 'droid',
        name: 'Droid',
        baseDir: '.factory',
        globalBaseDir: '.factory',
        detectPaths: ['.factory', '.factory/skills'],
        priority: 14,
    },
    {
        id: 'gemini-cli',
        name: 'Gemini CLI',
        baseDir: '.agents',
        globalBaseDir: '.gemini',
        detectPaths: ['.gemini', '.gemini/skills'],
        priority: 15,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        baseDir: '.agents',
        globalBaseDir: '.copilot',
        detectPaths: ['.copilot', '.github/copilot-instructions.md'],
        priority: 16,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'goose',
        name: 'Goose',
        baseDir: '.goose',
        globalBaseDir: '.config/goose',
        detectPaths: ['.goose', '.config/goose'],
        priority: 17,
    },
    {
        id: 'junie',
        name: 'Junie',
        baseDir: '.junie',
        globalBaseDir: '.junie',
        detectPaths: ['.junie', '.junie/skills'],
        priority: 18,
    },
    {
        id: 'iflow-cli',
        name: 'iFlow CLI',
        baseDir: '.iflow',
        globalBaseDir: '.iflow',
        detectPaths: ['.iflow', '.iflow/skills'],
        priority: 19,
    },
    {
        id: 'kilo',
        name: 'Kilo Code',
        baseDir: '.kilocode',
        globalBaseDir: '.kilocode',
        detectPaths: ['.kilocode', '.kilocode/skills'],
        priority: 20,
    },
    {
        id: 'krio',
        name: 'Krio',
        baseDir: '.kiro',
        globalBaseDir: '.kiro',
        detectPaths: ['.kiro', '.kiro/skills'],
        priority: 21,
    },
    {
        id: 'kode',
        name: 'Kode',
        baseDir: '.kode',
        globalBaseDir: '.kode',
        detectPaths: ['.kode', '.kode/skills'],
        priority: 22,
    },
    {
        id: 'mcpjam',
        name: 'MCPJam',
        baseDir: '.mcpjam',
        globalBaseDir: '.mcpjam',
        detectPaths: ['.mcpjam', '.mcpjam/skills'],
        priority: 23,
    },
    {
        id: 'mistral-vibe',
        name: 'Mistral Vibe',
        baseDir: '.vibe',
        globalBaseDir: '.vibe',
        detectPaths: ['.vibe', '.vibe/skills'],
        priority: 24,
    },
    {
        id: 'mux',
        name: 'Mux',
        baseDir: '.mux',
        globalBaseDir: '.mux',
        detectPaths: ['.mux', '.mux/skills'],
        priority: 25,
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        baseDir: '.agents',
        globalBaseDir: '.config/opencode',
        detectPaths: ['.config/opencode'],
        priority: 26,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'openhands',
        name: 'OpenHands',
        baseDir: '.openhands',
        globalBaseDir: '.openhands',
        detectPaths: ['.openhands', '.openhands/skills'],
        priority: 27,
    },
    {
        id: 'pi',
        name: 'Pi',
        baseDir: '.pi',
        globalBaseDir: '.pi/agent',
        detectPaths: ['.pi', '.pi/agent'],
        priority: 28,
    },
    {
        id: 'qoder',
        name: 'Qoder',
        baseDir: '.qoder',
        globalBaseDir: '.qoder',
        detectPaths: ['.qoder', '.qoder/skills'],
        priority: 29,
    },
    {
        id: 'qwen-code',
        name: 'Qwen Code',
        baseDir: '.qwen',
        globalBaseDir: '.qwen',
        detectPaths: ['.qwen', '.qwen/skills'],
        priority: 30,
    },
    {
        id: 'replit',
        name: 'Replit',
        baseDir: '.agents',
        globalBaseDir: '',
        detectPaths: [],
        priority: 31,
        compat: {
            localSkillUsesPrimary: true,
            note: '.agents/skills',
        },
    },
    {
        id: 'roo',
        name: 'Roo Code',
        baseDir: '.roo',
        globalBaseDir: '.roo',
        detectPaths: ['.roo', '.roo/skills'],
        priority: 32,
    },
    {
        id: 'trae',
        name: 'Trae',
        baseDir: '.trae',
        globalBaseDir: '.trae',
        detectPaths: ['.trae', '.trae/skills'],
        priority: 33,
    },
    {
        id: 'trae-cn',
        name: 'Trae CN',
        baseDir: '.trae',
        globalBaseDir: '.trae-cn',
        detectPaths: ['.trae-cn'],
        priority: 34,
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        baseDir: '.windsurf',
        globalBaseDir: '.codeium/windsurf',
        detectPaths: ['.windsurf', '.windsurf/skills', '.codeium/windsurf'],
        priority: 35,
    },
    {
        id: 'zencoder',
        name: 'Zencoder',
        baseDir: '.zencoder',
        globalBaseDir: '.zencoder',
        detectPaths: ['.zencoder', '.zencoder/skills'],
        priority: 36,
    },
    {
        id: 'neovate',
        name: 'Neovate',
        baseDir: '.neovate',
        globalBaseDir: '.neovate',
        detectPaths: ['.neovate', '.neovate/skills'],
        priority: 37,
    },
    {
        id: 'pochi',
        name: 'Pochi',
        baseDir: '.pochi',
        globalBaseDir: '.pochi',
        detectPaths: ['.pochi', '.pochi/skills'],
        priority: 38,
    },
    {
        id: 'adal',
        name: 'AdaL',
        baseDir: '.adal',
        globalBaseDir: '.adal',
        detectPaths: ['.adal', '.adal/skills'],
        priority: 39,
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

export type TargetSort = 'default' | 'az';

// 默认排序：优先展示最常见/最常见被提及的工具，剩余按名称字母序
// 该顺序为启发式（基于公开的使用度/下载量/知名度信号），非实时统计。
const DEFAULT_TARGET_PRIORITY: string[] = [
    'github-copilot',
    'claude-code',
    'cursor',
    'gemini-cli',
    'codex',
    'continue',
    'cline',
    'windsurf',
    'opencode',
    'openhands',
    'replit',
    'augment',
    'amp',
];

const DEFAULT_TARGET_RANK = new Map(DEFAULT_TARGET_PRIORITY.map((id, index) => [id, index]));

export function sortTargetApps(apps: AgentConfig[], sort: TargetSort = 'default'): AgentConfig[] {
    const sorted = [...apps];
    const collator = new Intl.Collator('en', { sensitivity: 'base' });

    if (sort === 'az') {
        return sorted.sort((a, b) => collator.compare(a.name, b.name));
    }

    return sorted.sort((a, b) => {
        const rankA = DEFAULT_TARGET_RANK.get(a.id);
        const rankB = DEFAULT_TARGET_RANK.get(b.id);

        if (rankA !== undefined || rankB !== undefined) {
            if (rankA === undefined) return 1;
            if (rankB === undefined) return -1;
            if (rankA !== rankB) return rankA - rankB;
        }

        return collator.compare(a.name, b.name);
    });
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
