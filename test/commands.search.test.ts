import { describe, it, expect } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';

describe('commands/search', () => {
    it('getFullName formats @source/id', async () => {
        const { getFullName } = await import('../src/commands/search.js');

        expect(getFullName({
            id: 'pdf',
            type: 'skill',
            source: 'anthropic',
            path: '@anthropic/pdf',
            name: 'PDF',
            description: 'x',
        })).toBe('@anthropic/pdf');
    });

    it('search outputs valid JSON when --json is used', async () => {
        const { search } = await import('../src/commands/search.js');
        const c = captureConsole();

        try {
            await search('pdf', { json: true });

            expect(c.logs.length).toBe(1);
            const data = JSON.parse(c.logs[0]);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);
            expect(data[0]).toHaveProperty('fullName');
            expect(data.some((r: any) => r.id === 'pdf')).toBe(true);
        } finally {
            c.restore();
        }
    });

    it('search prints default (non-compact/non-verbose) list output', async () => {
        const { search } = await import('../src/commands/search.js');
        const c = captureConsole();

        try {
            await search('pdf', {});
            expect(c.logs.join('\n')).toContain('@anthropic/pdf');
        } finally {
            c.restore();
        }
    });

    it('search scores full name exact matches and id prefixes', async () => {
        const { search } = await import('../src/commands/search.js');

        const exactFullName = captureConsole();
        try {
            await search('anthropic/pdf', { json: true });
            const data = JSON.parse(exactFullName.logs[0]);
            expect(Array.isArray(data)).toBe(true);
            expect(data.some((r: any) => r.fullName === '@anthropic/pdf')).toBe(true);
        } finally {
            exactFullName.restore();
        }

        const prefix = captureConsole();
        try {
            await search('pd', { json: true });
            const data = JSON.parse(prefix.logs[0]);
            expect(Array.isArray(data)).toBe(true);
            expect(data.some((r: any) => r.id === 'pdf')).toBe(true);
        } finally {
            prefix.restore();
        }
    });

    it('search supports quiet/compact/verbose output modes', async () => {
        const { search } = await import('../src/commands/search.js');

        // quiet
        const quiet = captureConsole();
        try {
            await search('pdf', { quiet: true });
            expect(quiet.logs.join('\n')).toContain('@anthropic/pdf');
        } finally {
            quiet.restore();
        }

        // compact
        const compact = captureConsole();
        try {
            await search('pdf', { compact: true });
            expect(compact.logs.join('\n')).toContain('@anthropic/pdf');
        } finally {
            compact.restore();
        }

        // verbose
        const verbose = captureConsole();
        try {
            await search('pdf', { verbose: true });
            expect(verbose.logs.join('\n')).toContain('Name:');
            expect(verbose.logs.join('\n')).toContain('Desc:');
        } finally {
            verbose.restore();
        }
    });

    it('catalog outputs JSON list of resources', async () => {
        const { catalog } = await import('../src/commands/search.js');
        const c = captureConsole();

        try {
            await catalog({ json: true });
            const data = JSON.parse(c.logs[0]);
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(70);
            expect(data.some((r: any) => r.fullName === '@anthropic/pdf')).toBe(true);
        } finally {
            c.restore();
        }
    });

    it('search exits with code 3 when no results', async () => {
        const { search } = await import('../src/commands/search.js');
        const exitSpy = mockProcessExit();
        const c = captureConsole();

        try {
            await expect(search('zzzznonexistentzzzz', {}))
                .rejects
                .toThrow('process.exit:3');
            expect(c.logs.join('\n')).toContain('No results');
        } finally {
            exitSpy.mockRestore();
            c.restore();
        }
    });

    // Note: pagination is only enabled in real TTY sessions; this unit test suite runs in non-TTY.
});
