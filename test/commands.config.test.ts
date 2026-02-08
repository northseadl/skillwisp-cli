import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';

describe('commands/config', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('shows config as JSON when --json is set', async () => {
        const { config } = await import('../src/commands/config.js');
        const c = captureConsole();

        try {
            await config(undefined, [], { json: true });
            expect(c.logs.length).toBe(1);
            const data = JSON.parse(c.logs[0]);
            expect(data).toHaveProperty('defaultTargets');
            expect(data).toHaveProperty('detectedApps');
            expect(Array.isArray(data.defaultTargets)).toBe(true);
            expect(Array.isArray(data.detectedApps)).toBe(true);
        } finally {
            c.restore();
        }
    });

    it('prints human-readable config when not in TTY and without --json', async () => {
        // Mock non-TTY environment
        const originalIsTTY = process.stdout.isTTY;
        Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });

        const { config } = await import('../src/commands/config.js');
        const c = captureConsole();

        try {
            await config(undefined, [], {});
            const output = c.logs.join('\n');
            expect(output).toContain('Current Configuration');
            expect(output).toContain('Detected apps:');
        } finally {
            c.restore();
            Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, writable: true });
        }
    });

    it('get targets prints comma list when --json is not used', async () => {
        const { config } = await import('../src/commands/config.js');

        const set = captureConsole();
        try {
            await config('set', ['targets', 'agents,claude-code'], { json: true });
        } finally {
            set.restore();
        }

        const get = captureConsole();
        try {
            await config('get', ['targets'], {});
            expect(get.logs[0]).toBe('agents,claude-code');
        } finally {
            get.restore();
        }
    });

    it('set targets prints error to stderr when --json is not used', async () => {
        const { config } = await import('../src/commands/config.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(config('set', ['targets', 'not-a-real-app'], {}))
                .rejects
                .toThrow('process.exit:2');
            expect(c.errors.join('\n')).toContain('No valid app IDs');
            expect(c.errors.join('\n')).toContain('Available:');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('set targets persists and get returns the saved list', async () => {
        const { config } = await import('../src/commands/config.js');

        const c1 = captureConsole();
        try {
            await config('set', ['targets', 'agents,claude-code'], { json: true });
            const data = JSON.parse(c1.logs[0]);
            expect(data.success).toBe(true);
            expect(data.defaultTargets).toEqual(['agents', 'claude-code']);
        } finally {
            c1.restore();
        }

        const c2 = captureConsole();
        try {
            await config('get', ['targets'], { json: true });
            const data = JSON.parse(c2.logs[0]);
            expect(data.defaultTargets).toEqual(['agents', 'claude-code']);
        } finally {
            c2.restore();
        }
    });

    it('set targets exits with code 2 when no valid app IDs', async () => {
        const { config } = await import('../src/commands/config.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(config('set', ['targets', 'not-a-real-app'], { json: true }))
                .rejects
                .toThrow('process.exit:2');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('No valid app IDs');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    it('unknown key exits with code 2', async () => {
        const { config } = await import('../src/commands/config.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(config('set', ['unknownKey', 'value'], { json: true }))
                .rejects
                .toThrow('process.exit:2');

            const data = JSON.parse(c.logs[0]);
            expect(data.error).toContain('Unknown key');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });
});
