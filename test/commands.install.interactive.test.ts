import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function cleanAll(): void {
    rmSync(join(process.cwd(), '.agent'), { recursive: true, force: true });
    rmSync(join(process.cwd(), '.claude'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agent'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agent', '.skillwisp'), { recursive: true, force: true });
}

function forceTTY(value: boolean): () => void {
    const hadOwn = Object.prototype.hasOwnProperty.call(process.stdout, 'isTTY');
    const prev = (process.stdout as any).isTTY;

    Object.defineProperty(process.stdout, 'isTTY', {
        value,
        configurable: true,
    });

    return () => {
        if (hadOwn) {
            Object.defineProperty(process.stdout, 'isTTY', {
                value: prev,
                configurable: true,
            });
        } else {
            // Restore to original state (typically undefined, inherited, or absent)
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete (process.stdout as any).isTTY;
        }
    };
}

describe('commands/install (interactive target resolution)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        cleanAll();
    });

    afterEach(() => cleanAll());

    it('defaults to primary source when no target apps are detected', async () => {
        const restoreTTY = forceTTY(true);
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['.agent']);
            expect(c.logs.join('\n')).toContain('Installing to primary source');
        } finally {
            restoreTTY();
            c.restore();
        }
    });

    it('reuses saved default targets when user selects yes', async () => {
        vi.doMock('@clack/prompts', () => ({
            select: vi.fn().mockResolvedValue('yes'),
            multiselect: vi.fn(),
            confirm: vi.fn(),
            isCancel: () => false,
        }));

        const { saveDefaultAgents } = await import('../src/core/preferences.js');
        saveDefaultAgents(['claude']);

        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const restoreTTY = forceTTY(true);
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['Claude Code']);
        } finally {
            restoreTTY();
            c.restore();
        }
    });

    it('allows manual selection and saves defaults when confirmed', async () => {
        vi.doMock('@clack/prompts', () => ({
            select: vi.fn().mockResolvedValue('no'),
            multiselect: vi.fn().mockResolvedValue([]),
            confirm: vi.fn().mockResolvedValue(true),
            isCancel: () => false,
        }));

        const { saveDefaultAgents, getDefaultAgents } = await import('../src/core/preferences.js');
        saveDefaultAgents(['claude']);

        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const restoreTTY = forceTTY(true);
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['.agent']);
            expect(getDefaultAgents()).toEqual(['agent']);
            expect(c.logs.join('\n')).toContain('No selection made');
            expect(c.logs.join('\n')).toContain('Default saved');
        } finally {
            restoreTTY();
            c.restore();
        }
    });

    it('exits with code 0 when user cancels selection', async () => {
        vi.doMock('@clack/prompts', () => ({
            select: vi.fn().mockResolvedValue('__CANCEL__'),
            multiselect: vi.fn(),
            confirm: vi.fn(),
            isCancel: (v: unknown) => v === '__CANCEL__',
        }));

        const { saveDefaultAgents } = await import('../src/core/preferences.js');
        saveDefaultAgents(['claude']);

        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const restoreTTY = forceTTY(true);
        const exitSpy = mockProcessExit();
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await expect(install('@anthropic/pdf', { dryRun: true, json: true }))
                .rejects
                .toThrow('process.exit:0');
        } finally {
            restoreTTY();
            exitSpy.mockRestore();
            c.restore();
        }
    });
});
