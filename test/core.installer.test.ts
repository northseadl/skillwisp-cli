import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, lstatSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function cleanInstallDirs(): void {
    rmSync(join(process.cwd(), '.agents'), { recursive: true, force: true });
    rmSync(join(process.cwd(), '.claude'), { recursive: true, force: true });
    rmSync(join(process.cwd(), '.kiro'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents'), { recursive: true, force: true });
}

const testResource = {
    id: 'test-skill',
    type: 'skill' as const,
    source: 'test',
    path: '@test/test-skill',
    name: 'Test Skill',
    description: 'A test skill',
};

describe('core/installer', () => {
    beforeEach(() => {
        cleanInstallDirs();
        vi.resetModules();
    });

    afterEach(() => {
        cleanInstallDirs();
        vi.restoreAllMocks();
    });

    it('installResource installs to primary source and symlinks to a dir-based target', async () => {
        vi.doMock('node:child_process', () => {
            return {
                execFileSync: (cmd: string, args: string[], options?: { cwd?: string }) => {
                    if (cmd !== 'git') throw new Error('unexpected command');
                    if (args[0] === '--version') return '';

                    if (args[0] === 'clone') {
                        const tempDir = args[args.length - 1];
                        mkdirSync(tempDir, { recursive: true });
                        return '';
                    }

                    if (args[0] === 'sparse-checkout' && args[1] === 'set') {
                        const cwd = options?.cwd || process.cwd();
                        const sparsePath = args[2];
                        const dir = join(cwd, sparsePath);
                        mkdirSync(dir, { recursive: true });
                        mkdirSync(join(dir, '.git'), { recursive: true });
                        const entry = [
                            '---',
                            'description: Test Skill',
                            '---',
                            '',
                            '# Body',
                            '',
                            'Hello from installer test.',
                            '',
                        ].join('\n');
                        // skill entry file
                        writeFileSync(join(dir, 'SKILL.md'), entry, 'utf-8');
                        return '';
                    }

                    return '';
                },
            };
        });

        const { installResource } = await import('../src/core/installer.js');

        const result = installResource(testResource as any, { agents: ['claude'], scope: 'local' });
        expect(result.success).toBe(true);

        const primaryPath = join(process.cwd(), '.agents', 'skills', testResource.id, 'SKILL.md');
        expect(existsSync(primaryPath)).toBe(true);

        const claudePath = join(process.cwd(), '.claude', 'skills', testResource.id);
        expect(existsSync(claudePath)).toBe(true);
        expect(lstatSync(claudePath).isSymbolicLink()).toBe(true);
    });

    it('installResource writes file-based steering files for Kiro', async () => {
        vi.doMock('node:child_process', () => {
            return {
                execFileSync: (cmd: string, args: string[], options?: { cwd?: string }) => {
                    if (cmd !== 'git') throw new Error('unexpected command');
                    if (args[0] === '--version') return '';

                    if (args[0] === 'clone') {
                        const tempDir = args[args.length - 1];
                        mkdirSync(tempDir, { recursive: true });
                        return '';
                    }

                    if (args[0] === 'sparse-checkout' && args[1] === 'set') {
                        const cwd = options?.cwd || process.cwd();
                        const sparsePath = args[2];
                        const dir = join(cwd, sparsePath);
                        mkdirSync(dir, { recursive: true });
                        const entry = [
                            '---',
                            'description: Test Skill',
                            '---',
                            '',
                            '# Body',
                            '',
                            'Hello from installer test.',
                            '',
                        ].join('\n');
                        writeFileSync(join(dir, 'SKILL.md'), entry, 'utf-8');
                        return '';
                    }

                    return '';
                },
            };
        });

        const { installResource } = await import('../src/core/installer.js');

        const result = installResource(testResource as any, { agents: ['kiro'], scope: 'local' });
        expect(result.success).toBe(true);

        const steeringFile = join(process.cwd(), '.kiro', 'steering', `skillwisp-${testResource.id}.md`);
        expect(existsSync(steeringFile)).toBe(true);

        const content = readFileSync(steeringFile, 'utf-8');
        expect(content).toContain(`# ${testResource.name}`);
        expect(content).toContain(`Source: @${testResource.source}/${testResource.id}`);
        expect(content).toContain('Hello from installer test.');
    });

    it('installResource reports a clear error when git is missing', async () => {
        vi.doMock('node:child_process', () => {
            return {
                execFileSync: () => {
                    const err: any = new Error('spawn git ENOENT');
                    err.code = 'ENOENT';
                    throw err;
                },
            };
        });

        const { installResource } = await import('../src/core/installer.js');
        const result = installResource(testResource as any, { agents: ['agents'], scope: 'local' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('git is required');
    });

    it('checkExists finds existing installations across targets', async () => {
        const { checkExists } = await import('../src/core/installer.js');

        const primaryDir = join(process.cwd(), '.agents', 'skills', 'exists');
        mkdirSync(primaryDir, { recursive: true });

        const claudeDir = join(process.cwd(), '.claude', 'skills', 'exists');
        mkdirSync(claudeDir, { recursive: true });

        const existing = checkExists('exists', 'skill', ['claude'], 'local');
        expect(existing).toContain('.agents');
        expect(existing).toContain('Claude Code');
    });
});
