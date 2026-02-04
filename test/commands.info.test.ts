import { describe, it, expect } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('commands/info', () => {
    it('prints JSON for an existing resource', async () => {
        const { info } = await import('../src/commands/info.js');
        const c = captureConsole();

        try {
            await info('pdf', { json: true });

            expect(c.logs.length).toBe(1);
            const data = JSON.parse(c.logs[0]);
            expect(data.id).toBe('pdf');
            expect(data.type).toBe('skill');
            expect(data).toHaveProperty('repoUrl');
        } finally {
            c.restore();
        }
    });

    it('prints human-readable info including tags and version info', async () => {
        const { info } = await import('../src/commands/info.js');
        const c = captureConsole();

        try {
            await info('pdf', {});
            const output = c.logs.join('\n');
            expect(output).toContain('Name:');
            expect(output).toContain('Description:');
            expect(output).toContain('Tags:');
            expect(output).toContain('Version Info:');
            expect(output).toContain('Updated:');
            expect(output).toContain('Commit:');
            expect(output).toContain('Repo:');
            expect(output).toContain('Run: skillwisp install');
        } finally {
            c.restore();
        }
    });

    it('prints installed status in human-readable mode when --installed is set', async () => {
        const { info } = await import('../src/commands/info.js');
        const c = captureConsole();

        const skillDir = join(process.cwd(), '.agent', 'skills', 'pdf');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'SKILL.md'), '# pdf\n', 'utf-8');

        try {
            await info('pdf', { installed: true });
            const output = c.logs.join('\n');
            expect(output).toContain('Installed at:');
            expect(output).toContain('.agent');
        } finally {
            c.restore();
        }
    });

    it('includes installedAt when --installed is set', async () => {
        const { info } = await import('../src/commands/info.js');
        const c = captureConsole();

        // Create a fake installed skill in primary source (local scope)
        const skillDir = join(process.cwd(), '.agent', 'skills', 'pdf');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'SKILL.md'), '# pdf\n', 'utf-8');

        try {
            await info('pdf', { json: true, installed: true });
            const data = JSON.parse(c.logs[0]);
            expect(Array.isArray(data.installedAt)).toBe(true);
            expect(data.installedAt).toContain('.agent');
        } finally {
            c.restore();
        }
    });

    it('exits with code 3 and prints JSON error when not found', async () => {
        const { info } = await import('../src/commands/info.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(info('nonexistent-skill-xyz-123', { json: true }))
                .rejects
                .toThrow('process.exit:3');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Resource not found');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('exits with code 3 and prints candidates when ambiguous', async () => {
        const { info } = await import('../src/commands/info.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(info('p', { json: true }))
                .rejects
                .toThrow('process.exit:3');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Ambiguous resource');
            expect(Array.isArray(data.candidates)).toBe(true);
            expect(data.candidates.length).toBeGreaterThan(1);
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });
});

