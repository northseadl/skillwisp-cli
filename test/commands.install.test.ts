import { describe, it, expect, beforeEach } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function cleanAll(): void {
    rmSync(join(process.cwd(), '.agents'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents', '.skillwisp'), { recursive: true, force: true });
}

describe('commands/install', () => {
    beforeEach(() => cleanAll());

    it('prints dry-run JSON output', async () => {
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, yes: true, target: 'agents' });
            const data = JSON.parse(c.logs[0]);
            expect(data.dryRun).toBe(true);
            expect(data.resource.fullName).toBe('@anthropic/pdf');
            expect(data.scope).toBe('local');
            expect(data.targets).toEqual(['.agents']);
        } finally {
            c.restore();
        }
    });

    it('exits with code 3 when resource is not found', async () => {
        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('nonexistent-skill-xyz-123', { json: true, yes: true }))
                .rejects
                .toThrow('process.exit:3');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Resource not found');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('prints human-readable error when resource is not found and --json is not used', async () => {
        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('nonexistent-skill-xyz-123', { yes: true }))
                .rejects
                .toThrow('process.exit:3');

            expect(c.errors.join('\n')).toContain('Resource not found');
            expect(c.errors.join('\n')).toContain('skillwisp search');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('exits with code 3 when resource is ambiguous', async () => {
        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('p', { json: true, yes: true }))
                .rejects
                .toThrow('process.exit:3');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Ambiguous resource');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('exits with code 2 for unsupported global targets', async () => {
        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('@anthropic/pdf', { json: true, yes: true, global: true, target: 'cursor' }))
                .rejects
                .toThrow('process.exit:2');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Targets do not support global install');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('exits with code 5 when resource already exists (even in dry-run)', async () => {
        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        const existingDir = join(process.cwd(), '.agents', 'skills', 'pdf');
        mkdirSync(existingDir, { recursive: true });
        writeFileSync(join(existingDir, 'SKILL.md'), '# pdf\n', 'utf-8');

        try {
            await expect(install('@anthropic/pdf', { json: true, yes: true, target: 'agents', dryRun: true }))
                .rejects
                .toThrow('process.exit:5');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Resource already exists');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('uses saved default targets in non-interactive mode', async () => {
        const { saveDefaultAgents } = await import('../src/core/preferences.js');
        saveDefaultAgents(['claude']);

        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, yes: true });
            const data = JSON.parse(c.logs[0]);
            expect(data.targets).toEqual(['.agents', 'Claude Code']);
        } finally {
            c.restore();
        }
    });
});
