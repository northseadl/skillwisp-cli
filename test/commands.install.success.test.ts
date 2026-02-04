import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';

describe('commands/install (success and failure paths)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('prints JSON for successful install when --json is set', async () => {
        const installResource = vi.fn().mockReturnValue({
            success: true,
            targets: [
                { agent: 'agents', path: '/tmp/.agents/skills/pdf', type: 'copy' },
            ],
            primaryPath: '/tmp/.agents/skills/pdf',
        });
        const checkExists = vi.fn().mockReturnValue([]);

        vi.doMock('../src/core/installer.js', () => ({ installResource, checkExists }));

        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { json: true, yes: true, target: 'agents' });
            const last = JSON.parse(c.logs[c.logs.length - 1]);
            expect(last.resource.fullName).toBe('@anthropic/pdf');
            expect(last.installations[0].agent).toBe('agents');
            expect(installResource).toHaveBeenCalled();
        } finally {
            c.restore();
        }
    });

    it('supports --quiet and --verbose output modes on success', async () => {
        const installResource = vi.fn().mockReturnValue({
            success: true,
            targets: [
                { agent: 'agents', path: '/tmp/.agents/skills/pdf', type: 'copy' },
                { agent: 'claude', path: '/tmp/.claude/skills/pdf', type: 'link' },
            ],
            primaryPath: '/tmp/.agents/skills/pdf',
        });
        const checkExists = vi.fn().mockReturnValue([]);

        vi.doMock('../src/core/installer.js', () => ({ installResource, checkExists }));

        // Mock spinner to capture its output
        const spinnerOutput: string[] = [];
        const spinnerMock = {
            start: vi.fn(),
            update: vi.fn(),
            stop: (msg: string) => spinnerOutput.push(msg),
        };
        vi.doMock('../src/ink/utils/index.js', async (importOriginal) => {
            const original = await importOriginal() as Record<string, unknown>;
            return {
                ...original,
                createSpinner: () => spinnerMock,
            };
        });

        const { install } = await import('../src/commands/install.js');

        const quiet = captureConsole();
        try {
            await install('@anthropic/pdf', { quiet: true, yes: true, target: 'agents' });
            // Spinner.stop 被调用并输出资源名称
            expect(spinnerOutput.some(s => s.includes('@anthropic/pdf'))).toBe(true);
        } finally {
            quiet.restore();
        }

        spinnerOutput.length = 0;

        const verbose = captureConsole();
        try {
            await install('@anthropic/pdf', { verbose: true, yes: true, target: 'agents' });
            const out = verbose.logs.join('\n');
            expect(out).toContain('Installation paths:');
            expect(out).toContain('Primary:');
            expect(out).toContain('/tmp/.agents/skills/pdf');
        } finally {
            verbose.restore();
        }
    });

    it('exits with code 5 when installResource returns failure', async () => {
        const installResource = vi.fn().mockReturnValue({
            success: false,
            error: 'mock failure',
            targets: [],
        });
        const checkExists = vi.fn().mockReturnValue([]);
        vi.doMock('../src/core/installer.js', () => ({ installResource, checkExists }));

        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('@anthropic/pdf', { yes: true, target: 'agents' }))
                .rejects
                .toThrow('process.exit:5');
            expect(c.errors.join('\n')).toContain('mock failure');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('exits with code 4 when install throws an exception', async () => {
        const installResource = vi.fn(() => {
            throw new Error('boom');
        });
        const checkExists = vi.fn().mockReturnValue([]);
        vi.doMock('../src/core/installer.js', () => ({ installResource, checkExists }));

        const { install } = await import('../src/commands/install.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(install('@anthropic/pdf', { yes: true, target: 'agents' }))
                .rejects
                .toThrow('process.exit:4');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });
});
