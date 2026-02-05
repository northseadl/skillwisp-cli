/**
 * installPaths.ts 测试套件
 *
 * 验证所有支持工具的安装路径逻辑正确性
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

import {
    getInstallRoot,
    getInstallPathForResource,
    getScopeBaseDir,
    SKILLWISP_FILE_PREFIX,
    tryParseResourceIdFromFileName,
} from '../src/core/installPaths.js';
import { ALL_APPS, getAppById, PRIMARY_SOURCE } from '../src/core/agents.js';

const cwd = process.cwd();

interface SkillAppCase {
    id: string;
    name: string;
    baseDir: string;
    globalBaseDir: string;
    detectPaths: string[];
    localDir: string;
    globalDir: string | null;
}

const SKILL_APPS: SkillAppCase[] = [
    {
        id: 'amp',
        name: 'Amp',
        baseDir: '.agents',
        globalBaseDir: '.config/agents',
        detectPaths: ['.config/agents'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.config/agents', 'skills'),
    },
    {
        id: 'kimi-cli',
        name: 'Kimi Code CLI',
        baseDir: '.agents',
        globalBaseDir: '.config/agents',
        detectPaths: ['.config/agents'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.config/agents', 'skills'),
    },
    {
        id: 'antigravity',
        name: 'Antigravity',
        baseDir: '.agent',
        globalBaseDir: '.gemini/antigravity',
        detectPaths: ['.agent', '.gemini/antigravity'],
        localDir: join(cwd, '.agent', 'skills'),
        globalDir: join(homedir(), '.gemini/antigravity', 'skills'),
    },
    {
        id: 'augment',
        name: 'Augment',
        baseDir: '.augment',
        globalBaseDir: '.augment',
        detectPaths: ['.augment', '.augment/skills'],
        localDir: join(cwd, '.augment', 'skills'),
        globalDir: join(homedir(), '.augment', 'skills'),
    },
    {
        id: 'claude-code',
        name: 'Claude Code',
        baseDir: '.claude',
        globalBaseDir: '.claude',
        detectPaths: ['.claude', '.claude/skills'],
        localDir: join(cwd, '.claude', 'skills'),
        globalDir: join(homedir(), '.claude', 'skills'),
    },
    {
        id: 'openclaw',
        name: 'OpenClaw',
        baseDir: '',
        globalBaseDir: '.moltbot',
        detectPaths: ['.moltbot'],
        localDir: join(cwd, 'skills'),
        globalDir: join(homedir(), '.moltbot', 'skills'),
    },
    {
        id: 'cline',
        name: 'Cline',
        baseDir: '.cline',
        globalBaseDir: '.cline',
        detectPaths: ['.cline', '.cline/skills'],
        localDir: join(cwd, '.cline', 'skills'),
        globalDir: join(homedir(), '.cline', 'skills'),
    },
    {
        id: 'codebuddy',
        name: 'CodeBuddy',
        baseDir: '.codebuddy',
        globalBaseDir: '.codebuddy',
        detectPaths: ['.codebuddy', '.codebuddy/skills'],
        localDir: join(cwd, '.codebuddy', 'skills'),
        globalDir: join(homedir(), '.codebuddy', 'skills'),
    },
    {
        id: 'codex',
        name: 'Codex',
        baseDir: '.agents',
        globalBaseDir: '.codex',
        detectPaths: ['.codex', '.codex/skills'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.codex', 'skills'),
    },
    {
        id: 'command-code',
        name: 'Command Code',
        baseDir: '.commandcode',
        globalBaseDir: '.commandcode',
        detectPaths: ['.commandcode', '.commandcode/skills'],
        localDir: join(cwd, '.commandcode', 'skills'),
        globalDir: join(homedir(), '.commandcode', 'skills'),
    },
    {
        id: 'continue',
        name: 'Continue',
        baseDir: '.continue',
        globalBaseDir: '.continue',
        detectPaths: ['.continue', '.continue/skills'],
        localDir: join(cwd, '.continue', 'skills'),
        globalDir: join(homedir(), '.continue', 'skills'),
    },
    {
        id: 'crush',
        name: 'Crush',
        baseDir: '.crush',
        globalBaseDir: '.config/crush',
        detectPaths: ['.crush', '.config/crush'],
        localDir: join(cwd, '.crush', 'skills'),
        globalDir: join(homedir(), '.config/crush', 'skills'),
    },
    {
        id: 'cursor',
        name: 'Cursor',
        baseDir: '.cursor',
        globalBaseDir: '.cursor',
        detectPaths: ['.cursor', '.cursor/skills'],
        localDir: join(cwd, '.cursor', 'skills'),
        globalDir: join(homedir(), '.cursor', 'skills'),
    },
    {
        id: 'droid',
        name: 'Droid',
        baseDir: '.factory',
        globalBaseDir: '.factory',
        detectPaths: ['.factory', '.factory/skills'],
        localDir: join(cwd, '.factory', 'skills'),
        globalDir: join(homedir(), '.factory', 'skills'),
    },
    {
        id: 'gemini-cli',
        name: 'Gemini CLI',
        baseDir: '.agents',
        globalBaseDir: '.gemini',
        detectPaths: ['.gemini', '.gemini/skills'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.gemini', 'skills'),
    },
    {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        baseDir: '.agents',
        globalBaseDir: '.copilot',
        detectPaths: ['.copilot', '.github/copilot-instructions.md'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.copilot', 'skills'),
    },
    {
        id: 'goose',
        name: 'Goose',
        baseDir: '.goose',
        globalBaseDir: '.config/goose',
        detectPaths: ['.goose', '.config/goose'],
        localDir: join(cwd, '.goose', 'skills'),
        globalDir: join(homedir(), '.config/goose', 'skills'),
    },
    {
        id: 'junie',
        name: 'Junie',
        baseDir: '.junie',
        globalBaseDir: '.junie',
        detectPaths: ['.junie', '.junie/skills'],
        localDir: join(cwd, '.junie', 'skills'),
        globalDir: join(homedir(), '.junie', 'skills'),
    },
    {
        id: 'iflow-cli',
        name: 'iFlow CLI',
        baseDir: '.iflow',
        globalBaseDir: '.iflow',
        detectPaths: ['.iflow', '.iflow/skills'],
        localDir: join(cwd, '.iflow', 'skills'),
        globalDir: join(homedir(), '.iflow', 'skills'),
    },
    {
        id: 'kilo',
        name: 'Kilo Code',
        baseDir: '.kilocode',
        globalBaseDir: '.kilocode',
        detectPaths: ['.kilocode', '.kilocode/skills'],
        localDir: join(cwd, '.kilocode', 'skills'),
        globalDir: join(homedir(), '.kilocode', 'skills'),
    },
    {
        id: 'krio',
        name: 'Krio',
        baseDir: '.kiro',
        globalBaseDir: '.kiro',
        detectPaths: ['.kiro', '.kiro/skills'],
        localDir: join(cwd, '.kiro', 'skills'),
        globalDir: join(homedir(), '.kiro', 'skills'),
    },
    {
        id: 'kode',
        name: 'Kode',
        baseDir: '.kode',
        globalBaseDir: '.kode',
        detectPaths: ['.kode', '.kode/skills'],
        localDir: join(cwd, '.kode', 'skills'),
        globalDir: join(homedir(), '.kode', 'skills'),
    },
    {
        id: 'mcpjam',
        name: 'MCPJam',
        baseDir: '.mcpjam',
        globalBaseDir: '.mcpjam',
        detectPaths: ['.mcpjam', '.mcpjam/skills'],
        localDir: join(cwd, '.mcpjam', 'skills'),
        globalDir: join(homedir(), '.mcpjam', 'skills'),
    },
    {
        id: 'mistral-vibe',
        name: 'Mistral Vibe',
        baseDir: '.vibe',
        globalBaseDir: '.vibe',
        detectPaths: ['.vibe', '.vibe/skills'],
        localDir: join(cwd, '.vibe', 'skills'),
        globalDir: join(homedir(), '.vibe', 'skills'),
    },
    {
        id: 'mux',
        name: 'Mux',
        baseDir: '.mux',
        globalBaseDir: '.mux',
        detectPaths: ['.mux', '.mux/skills'],
        localDir: join(cwd, '.mux', 'skills'),
        globalDir: join(homedir(), '.mux', 'skills'),
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        baseDir: '.agents',
        globalBaseDir: '.config/opencode',
        detectPaths: ['.config/opencode'],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: join(homedir(), '.config/opencode', 'skills'),
    },
    {
        id: 'openhands',
        name: 'OpenHands',
        baseDir: '.openhands',
        globalBaseDir: '.openhands',
        detectPaths: ['.openhands', '.openhands/skills'],
        localDir: join(cwd, '.openhands', 'skills'),
        globalDir: join(homedir(), '.openhands', 'skills'),
    },
    {
        id: 'pi',
        name: 'Pi',
        baseDir: '.pi',
        globalBaseDir: '.pi/agent',
        detectPaths: ['.pi', '.pi/agent'],
        localDir: join(cwd, '.pi', 'skills'),
        globalDir: join(homedir(), '.pi/agent', 'skills'),
    },
    {
        id: 'qoder',
        name: 'Qoder',
        baseDir: '.qoder',
        globalBaseDir: '.qoder',
        detectPaths: ['.qoder', '.qoder/skills'],
        localDir: join(cwd, '.qoder', 'skills'),
        globalDir: join(homedir(), '.qoder', 'skills'),
    },
    {
        id: 'qwen-code',
        name: 'Qwen Code',
        baseDir: '.qwen',
        globalBaseDir: '.qwen',
        detectPaths: ['.qwen', '.qwen/skills'],
        localDir: join(cwd, '.qwen', 'skills'),
        globalDir: join(homedir(), '.qwen', 'skills'),
    },
    {
        id: 'replit',
        name: 'Replit',
        baseDir: '.agents',
        globalBaseDir: '',
        detectPaths: [],
        localDir: join(cwd, '.agents', 'skills'),
        globalDir: null,
    },
    {
        id: 'roo',
        name: 'Roo Code',
        baseDir: '.roo',
        globalBaseDir: '.roo',
        detectPaths: ['.roo', '.roo/skills'],
        localDir: join(cwd, '.roo', 'skills'),
        globalDir: join(homedir(), '.roo', 'skills'),
    },
    {
        id: 'trae',
        name: 'Trae',
        baseDir: '.trae',
        globalBaseDir: '.trae',
        detectPaths: ['.trae', '.trae/skills'],
        localDir: join(cwd, '.trae', 'skills'),
        globalDir: join(homedir(), '.trae', 'skills'),
    },
    {
        id: 'trae-cn',
        name: 'Trae CN',
        baseDir: '.trae',
        globalBaseDir: '.trae-cn',
        detectPaths: ['.trae-cn'],
        localDir: join(cwd, '.trae', 'skills'),
        globalDir: join(homedir(), '.trae-cn', 'skills'),
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        baseDir: '.windsurf',
        globalBaseDir: '.codeium/windsurf',
        detectPaths: ['.windsurf', '.windsurf/skills', '.codeium/windsurf'],
        localDir: join(cwd, '.windsurf', 'skills'),
        globalDir: join(homedir(), '.codeium/windsurf', 'skills'),
    },
    {
        id: 'zencoder',
        name: 'Zencoder',
        baseDir: '.zencoder',
        globalBaseDir: '.zencoder',
        detectPaths: ['.zencoder', '.zencoder/skills'],
        localDir: join(cwd, '.zencoder', 'skills'),
        globalDir: join(homedir(), '.zencoder', 'skills'),
    },
    {
        id: 'neovate',
        name: 'Neovate',
        baseDir: '.neovate',
        globalBaseDir: '.neovate',
        detectPaths: ['.neovate', '.neovate/skills'],
        localDir: join(cwd, '.neovate', 'skills'),
        globalDir: join(homedir(), '.neovate', 'skills'),
    },
    {
        id: 'pochi',
        name: 'Pochi',
        baseDir: '.pochi',
        globalBaseDir: '.pochi',
        detectPaths: ['.pochi', '.pochi/skills'],
        localDir: join(cwd, '.pochi', 'skills'),
        globalDir: join(homedir(), '.pochi', 'skills'),
    },
    {
        id: 'adal',
        name: 'AdaL',
        baseDir: '.adal',
        globalBaseDir: '.adal',
        detectPaths: ['.adal', '.adal/skills'],
        localDir: join(cwd, '.adal', 'skills'),
        globalDir: join(homedir(), '.adal', 'skills'),
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// 基础函数测试
// ═══════════════════════════════════════════════════════════════════════════

describe('getScopeBaseDir', () => {
    it('should return cwd for local scope', () => {
        expect(getScopeBaseDir('local')).toBe(process.cwd());
    });

    it('should return homedir for global scope', () => {
        expect(getScopeBaseDir('global')).toBe(homedir());
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY_SOURCE (.agents) 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('PRIMARY_SOURCE (.agents)', () => {
    const app = PRIMARY_SOURCE;

    it('should have correct config', () => {
        expect(app.id).toBe('agents');
        expect(app.baseDir).toBe('.agents');
        expect(app.globalBaseDir).toBe('.agents');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agents', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.agents', 'skills'));
    });

    it('should support rule type', () => {
        const result = getInstallRoot(app, 'rule', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agents', 'rules'));
    });

    it('should support workflow type', () => {
        const result = getInstallRoot(app, 'workflow', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agents', 'workflows'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Target Apps 路径测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Target apps (skills paths)', () => {
    for (const appCase of SKILL_APPS) {
        const app = getAppById(appCase.id)!;

        describe(appCase.name, () => {
            it('should have correct config', () => {
                expect(app.id).toBe(appCase.id);
                expect(app.baseDir).toBe(appCase.baseDir);
                expect(app.globalBaseDir).toBe(appCase.globalBaseDir);
                expect(app.detectPaths).toEqual(appCase.detectPaths);
            });

            it('should return dir-type for local skill install', () => {
                const result = getInstallRoot(app, 'skill', 'local');
                expect(result).not.toBeNull();
                expect(result?.kind).toBe('dir');
                expect(result?.dir).toBe(appCase.localDir);
            });

            it('should handle global skill install', () => {
                const result = getInstallRoot(app, 'skill', 'global');
                if (appCase.globalDir) {
                    expect(result).not.toBeNull();
                    expect(result?.kind).toBe('dir');
                    expect(result?.dir).toBe(appCase.globalDir);
                } else {
                    expect(result).toBeNull();
                }
            });
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// 特殊行为测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Special cases', () => {
    const codex = getAppById('codex')!;
    const cursor = getAppById('cursor')!;
    const augment = getAppById('augment')!;
    const copilot = getAppById('github-copilot')!;

    afterEach(() => {
        delete process.env.CODEX_HOME;
    });

    it('should use CODEX_HOME for global install when set', () => {
        process.env.CODEX_HOME = '/custom/codex';
        const result = getInstallRoot(codex, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe('/custom/codex/skills');
    });

    it('should return null for non-skill types on skill-only apps', () => {
        expect(getInstallRoot(cursor, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(cursor, 'workflow', 'local')).toBeNull();
        expect(getInstallRoot(augment, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(augment, 'workflow', 'local')).toBeNull();
        expect(getInstallRoot(copilot, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(copilot, 'workflow', 'local')).toBeNull();
    });

    it('should use skills dir for Augment skill installs', () => {
        const result = getInstallRoot(augment, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.augment', 'skills'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getInstallPathForResource 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('getInstallPathForResource', () => {
    it('should return correct path for dir-type install', () => {
        const app = getAppById('claude-code')!;
        const result = getInstallPathForResource(app, 'skill', 'local', 'my-skill');

        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.path).toBe(join(process.cwd(), '.claude', 'skills', 'my-skill'));
    });

    it('should return null when root is null', () => {
        const app = getAppById('replit')!;
        const result = getInstallPathForResource(app, 'skill', 'global', 'my-skill');
        expect(result).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// tryParseResourceIdFromFileName 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('tryParseResourceIdFromFileName', () => {
    const fileRoot = {
        kind: 'file' as const,
        dir: '/test',
        prefix: SKILLWISP_FILE_PREFIX,
        ext: '.md',
    };

    it('should parse valid filename', () => {
        expect(tryParseResourceIdFromFileName('skillwisp-my-skill.md', fileRoot)).toBe('my-skill');
    });

    it('should return null for invalid prefix', () => {
        expect(tryParseResourceIdFromFileName('other-my-skill.md', fileRoot)).toBeNull();
    });

    it('should return null for invalid extension', () => {
        expect(tryParseResourceIdFromFileName('skillwisp-my-skill.txt', fileRoot)).toBeNull();
    });

    it('should return null for empty id', () => {
        expect(tryParseResourceIdFromFileName('skillwisp-.md', fileRoot)).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 完整性验证
// ═══════════════════════════════════════════════════════════════════════════

describe('All Apps Coverage', () => {
    it('should have all expected apps', () => {
        const expectedIds = ['agents', ...SKILL_APPS.map((app) => app.id)];
        const actualIds = ALL_APPS.map((app) => app.id);

        for (const id of expectedIds) {
            expect(actualIds).toContain(id);
        }
    });

    it('should have detectPaths defined for all apps', () => {
        for (const app of ALL_APPS) {
            expect(app.detectPaths).toBeDefined();
        }
    });
});
