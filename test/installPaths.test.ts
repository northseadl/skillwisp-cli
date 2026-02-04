/**
 * installPaths.ts 测试套件
 *
 * 验证所有支持工具的安装路径逻辑正确性
 * 覆盖范围：
 * - 所有 11 个工具的项目级/全局级安装路径
 * - 目录型 vs 文件型安装
 * - 边缘情况（null 返回、环境变量等）
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

import {
    getInstallRoot,
    getInstallPathForResource,
    getScopeBaseDir,
    SKILLWISP_FILE_PREFIX,
    tryParseResourceIdFromFileName,
} from '../src/core/installPaths.js';
import { ALL_APPS, getAppById, TARGET_APPS, PRIMARY_SOURCE } from '../src/core/agents.js';
import { RESOURCE_CONFIG } from '../src/core/types.js';

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
// PRIMARY_SOURCE (.agent) 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('PRIMARY_SOURCE (.agent)', () => {
    const app = PRIMARY_SOURCE;

    it('should have correct config', () => {
        expect(app.id).toBe('agent');
        expect(app.baseDir).toBe('.agent');
        expect(app.globalBaseDir).toBe('.agent');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agent', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.agent', 'skills'));
    });

    it('should support rule type', () => {
        const result = getInstallRoot(app, 'rule', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agent', 'rules'));
    });

    it('should support workflow type', () => {
        const result = getInstallRoot(app, 'workflow', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.agent', 'workflows'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Claude Code 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Claude Code', () => {
    const app = getAppById('claude')!;

    it('should have correct config', () => {
        expect(app.id).toBe('claude');
        expect(app.baseDir).toBe('.claude');
        expect(app.globalBaseDir).toBe('.claude');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.claude', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.claude', 'skills'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cursor 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Cursor', () => {
    const app = getAppById('cursor')!;

    it('should have correct config', () => {
        expect(app.id).toBe('cursor');
        expect(app.baseDir).toBe('.cursor');
        expect(app.globalBaseDir).toBe(''); // 无全局支持
        expect(app.detectPaths).toContain('.cursor/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.cursor', 'skills'));
    });

    it('should return null for global install (not supported)', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).toBeNull();
    });

    it('should return null for non-skill types', () => {
        expect(getInstallRoot(app, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(app, 'workflow', 'local')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Gemini 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Gemini', () => {
    const app = getAppById('gemini')!;

    it('should have correct config', () => {
        expect(app.id).toBe('gemini');
        expect(app.baseDir).toBe('.gemini');
        expect(app.globalBaseDir).toBe('.gemini');
        expect(app.detectPaths).toContain('.gemini/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.gemini', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.gemini', 'skills'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Codex 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Codex', () => {
    const app = getAppById('codex')!;
    const originalEnv = process.env.CODEX_HOME;

    afterEach(() => {
        // 恢复环境变量
        if (originalEnv !== undefined) {
            process.env.CODEX_HOME = originalEnv;
        } else {
            delete process.env.CODEX_HOME;
        }
    });

    it('should have correct config', () => {
        expect(app.id).toBe('codex');
        expect(app.baseDir).toBe('.codex');
        expect(app.globalBaseDir).toBe('.codex');
        expect(app.detectPaths).toContain('.codex/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.codex', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        delete process.env.CODEX_HOME;
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.codex', 'skills'));
    });

    it('should use CODEX_HOME for global install when set', () => {
        process.env.CODEX_HOME = '/custom/codex';
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe('/custom/codex/skills');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// GitHub Copilot 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('GitHub Copilot', () => {
    const app = getAppById('copilot')!;

    it('should have correct config', () => {
        expect(app.id).toBe('copilot');
        expect(app.baseDir).toBe('.github');
        expect(app.globalBaseDir).toBe('.copilot');
        expect(app.detectPaths).toContain('.github/skills');
    });

    it('should return dir-type for local skill install (.github/skills)', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.github', 'skills'));
    });

    it('should return dir-type for global skill install (~/.copilot/skills)', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.copilot', 'skills'));
    });

    it('should return null for non-skill types', () => {
        expect(getInstallRoot(app, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(app, 'workflow', 'local')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Trae 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Trae', () => {
    const app = getAppById('trae')!;

    it('should have correct config', () => {
        expect(app.id).toBe('trae');
        expect(app.baseDir).toBe('.trae');
        expect(app.globalBaseDir).toBe('.trae');
        expect(app.detectPaths).toContain('.trae/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.trae', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.trae', 'skills'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Windsurf 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Windsurf', () => {
    const app = getAppById('windsurf')!;

    it('should have correct config', () => {
        expect(app.id).toBe('windsurf');
        expect(app.baseDir).toBe('.windsurf');
        expect(app.globalBaseDir).toBe('.codeium/windsurf');
        expect(app.detectPaths).toContain('.windsurf/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.windsurf', 'skills'));
    });

    it('should return dir-type for global skill install (~/.codeium/windsurf/skills)', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.codeium/windsurf', 'skills'));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Kiro 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Kiro', () => {
    const app = getAppById('kiro')!;

    it('should have correct config', () => {
        expect(app.id).toBe('kiro');
        expect(app.baseDir).toBe('.kiro');
        expect(app.globalBaseDir).toBe(''); // 无全局支持
        expect(app.detectPaths).toContain('.kiro/steering');
    });

    it('should return file-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('file');
        if (result?.kind === 'file') {
            expect(result.dir).toBe(join(process.cwd(), '.kiro', 'steering'));
            expect(result.prefix).toBe(SKILLWISP_FILE_PREFIX);
            expect(result.ext).toBe('.md');
        }
    });

    it('should return null for global install (not supported)', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).toBeNull();
    });

    it('should return null for non-skill types', () => {
        expect(getInstallRoot(app, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(app, 'workflow', 'local')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Augment 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Augment', () => {
    const app = getAppById('augment')!;

    it('should have correct config', () => {
        expect(app.id).toBe('augment');
        expect(app.baseDir).toBe('.augment');
        expect(app.globalBaseDir).toBe('.augment');
        expect(app.detectPaths).toContain('.augment/skills');
    });

    it('should return dir-type for local skill install', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(process.cwd(), '.augment', 'skills'));
    });

    it('should return dir-type for global skill install', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.augment', 'skills'));
    });

    it('should return null for non-skill types', () => {
        expect(getInstallRoot(app, 'rule', 'local')).toBeNull();
        expect(getInstallRoot(app, 'workflow', 'local')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Antigravity 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('Antigravity', () => {
    const app = getAppById('antigravity')!;

    it('should have correct config', () => {
        expect(app.id).toBe('antigravity');
        expect(app.baseDir).toBe(''); // 项目级与 PRIMARY_SOURCE 冲突
        expect(app.globalBaseDir).toBe('.gemini/antigravity');
        expect(app.detectPaths).toContain('.gemini/antigravity');
        expect(app.detectPaths).toContain('.agent/skills');
    });

    it('should return null for local install (conflicts with PRIMARY_SOURCE)', () => {
        const result = getInstallRoot(app, 'skill', 'local');
        expect(result).toBeNull();
    });

    it('should return dir-type for global skill install (~/.gemini/antigravity/skills)', () => {
        const result = getInstallRoot(app, 'skill', 'global');
        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.dir).toBe(join(homedir(), '.gemini/antigravity', 'skills'));
    });

    it('should return null for non-skill types', () => {
        expect(getInstallRoot(app, 'rule', 'global')).toBeNull();
        expect(getInstallRoot(app, 'workflow', 'global')).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getInstallPathForResource 测试
// ═══════════════════════════════════════════════════════════════════════════

describe('getInstallPathForResource', () => {
    it('should return correct path for dir-type install', () => {
        const app = getAppById('claude')!;
        const result = getInstallPathForResource(app, 'skill', 'local', 'my-skill');

        expect(result).not.toBeNull();
        expect(result?.kind).toBe('dir');
        expect(result?.path).toBe(join(process.cwd(), '.claude', 'skills', 'my-skill'));
    });

    it('should return correct path for file-type install', () => {
        const app = getAppById('kiro')!;
        const result = getInstallPathForResource(app, 'skill', 'local', 'my-skill');

        expect(result).not.toBeNull();
        expect(result?.kind).toBe('file');
        expect(result?.path).toBe(join(process.cwd(), '.kiro', 'steering', 'skillwisp-my-skill.md'));
    });

    it('should return null when root is null', () => {
        const app = getAppById('cursor')!;
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
        prefix: 'skillwisp-',
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
        const expectedIds = [
            'agent', 'claude', 'cursor', 'gemini', 'codex',
            'copilot', 'trae', 'windsurf', 'kiro', 'augment', 'antigravity',
        ];

        const actualIds = ALL_APPS.map((app) => app.id);

        for (const id of expectedIds) {
            expect(actualIds).toContain(id);
        }
    });

    it('should have valid detectPaths for all apps', () => {
        for (const app of ALL_APPS) {
            expect(app.detectPaths).toBeDefined();
            expect(app.detectPaths.length).toBeGreaterThan(0);
        }
    });

    it('should have consistent baseDir for skill installs', () => {
        // 验证每个支持 local install 的 app 都有正确的 baseDir
        for (const app of ALL_APPS) {
            const result = getInstallRoot(app, 'skill', 'local');
            if (result && result.kind === 'dir') {
                expect(result.dir).toContain(process.cwd());
            }
        }
    });
});
