import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { captureConsole } from './testUtils.js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function cleanInstallDirs(): void {
    rmSync(join(process.cwd(), '.agents'), { recursive: true, force: true });
    rmSync(join(process.cwd(), '.kiro'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents'), { recursive: true, force: true });
}

describe('commands/list', () => {
    beforeEach(() => cleanInstallDirs());
    afterEach(() => cleanInstallDirs());

    it('outputs empty JSON array when nothing is installed', async () => {
        const { list } = await import('../src/commands/list.js');
        const c = captureConsole();

        try {
            await list({ json: true });
            const data = JSON.parse(c.logs[0]);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBe(0);
        } finally {
            c.restore();
        }
    });

    it('scans both dir-based and file-based installations', async () => {
        // Dir-based: primary source local skill
        const fooDir = join(process.cwd(), '.agents', 'skills', 'foo');
        mkdirSync(fooDir, { recursive: true });
        writeFileSync(
            join(fooDir, 'SKILL.md'),
            `---\ndescription: Foo Skill\n---\n# Foo\n`,
            'utf-8'
        );

        // Dir-based: Krio skill
        const kiroDir = join(process.cwd(), '.kiro', 'skills', 'bar');
        mkdirSync(kiroDir, { recursive: true });
        writeFileSync(
            join(kiroDir, 'SKILL.md'),
            `---\ndescription: Bar Skill\n---\n# Bar\n`,
            'utf-8'
        );

        // Global: primary source global rule
        const ruleDir = join(homedir(), '.agents', 'rules', 'r1');
        mkdirSync(ruleDir, { recursive: true });
        writeFileSync(join(ruleDir, 'RULE.md'), '# Rule\n', 'utf-8');

        const { list } = await import('../src/commands/list.js');
        const c = captureConsole();

        try {
            await list({ json: true });
            const data = JSON.parse(c.logs[0]) as Array<any>;

            expect(data.some((r) => r.id === 'foo' && r.agent === 'agents' && r.type === 'skill')).toBe(true);
            expect(data.some((r) => r.id === 'bar' && r.agent === 'krio' && r.type === 'skill')).toBe(true);
            expect(data.some((r) => r.id === 'r1' && r.agent === 'agents' && r.type === 'rule' && r.scope === 'global')).toBe(true);
        } finally {
            c.restore();
        }
    });

    it('quiet mode prints unique resource IDs', async () => {
        const fooDir = join(process.cwd(), '.agents', 'skills', 'foo');
        mkdirSync(fooDir, { recursive: true });
        writeFileSync(join(fooDir, 'SKILL.md'), '# Foo\n', 'utf-8');

        // Same ID in global should be de-duped
        const fooGlobalDir = join(homedir(), '.agents', 'skills', 'foo');
        mkdirSync(fooGlobalDir, { recursive: true });
        writeFileSync(join(fooGlobalDir, 'SKILL.md'), '# Foo\n', 'utf-8');

        const { list } = await import('../src/commands/list.js');
        const c = captureConsole();

        try {
            await list({ quiet: true });
            expect(c.logs).toEqual(['foo']);
        } finally {
            c.restore();
        }
    });

    it('prints friendly message when nothing is installed', async () => {
        const { list } = await import('../src/commands/list.js');
        const c = captureConsole();

        try {
            await list({});
            expect(c.logs.join('\n')).toContain('No installed resources');
        } finally {
            c.restore();
        }
    });

    it('prints flat list by default and verbose list with paths', async () => {
        const fooDir = join(process.cwd(), '.agents', 'skills', 'foo');
        mkdirSync(fooDir, { recursive: true });
        writeFileSync(join(fooDir, 'SKILL.md'), '# Foo\n', 'utf-8');

        const { list } = await import('../src/commands/list.js');

        const flat = captureConsole();
        try {
            await list({});
            const out = flat.logs.join('\n');
            expect(out).toContain('installed resource');
            expect(out).toContain('foo');
        } finally {
            flat.restore();
        }

        const verbose = captureConsole();
        try {
            await list({ verbose: true });
            const out = verbose.logs.join('\n');
            expect(out).toContain('installation');
            expect(out).toContain('.agents');
            expect(out).toContain('foo');
            expect(out).toContain('.agents/skills/foo');
        } finally {
            verbose.restore();
        }
    });
});
