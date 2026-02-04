/**
 * install 命令交互式目标解析测试
 * 
 * 测试使用 --yes 或 dry-run 模式，避免启动实际的 Ink 渲染
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureConsole, mockProcessExit } from './testUtils.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function cleanAll(): void {
    rmSync(join(process.cwd(), '.agents'), { recursive: true, force: true });
    rmSync(join(process.cwd(), '.claude'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents'), { recursive: true, force: true });
    rmSync(join(homedir(), '.agents', '.skillwisp'), { recursive: true, force: true });
}

describe('commands/install (target resolution)', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        cleanAll();
    });

    afterEach(() => cleanAll());

    it('defaults to primary source when no target apps are detected (--yes mode)', async () => {
        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, yes: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['.agents']);
        } finally {
            c.restore();
        }
    });

    it('uses saved default targets with --yes flag', async () => {
        const { saveDefaultAgents } = await import('../src/core/preferences.js');
        saveDefaultAgents(['claude']);

        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, yes: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['.agents', 'Claude Code']);
        } finally {
            c.restore();
        }
    });

    it('auto-detects apps when no defaults saved (--yes mode)', async () => {
        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, yes: true });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            // Should include primary source + detected app
            expect(data.targets).toEqual(['.agents', 'Claude Code']);
        } finally {
            c.restore();
        }
    });

    it('respects --target flag for explicit target selection', async () => {
        mkdirSync(join(process.cwd(), '.claude'), { recursive: true });

        const { install } = await import('../src/commands/install.js');
        const c = captureConsole();

        try {
            await install('@anthropic/pdf', { dryRun: true, json: true, target: 'claude' });
            const data = JSON.parse(c.logs[c.logs.length - 1]);
            expect(data.targets).toEqual(['Claude Code']);
        } finally {
            c.restore();
        }
    });
});
