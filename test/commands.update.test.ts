import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureConsole } from './testUtils.js';

describe('commands/update', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('stops when no index update is available', async () => {
        const clearCache = vi.fn();

        // Mock ink/utils 的 spinner
        const spinnerMock = {
            start: vi.fn(),
            update: vi.fn(),
            stop: vi.fn(),
        };
        vi.doMock('../src/ink/utils/index.js', () => ({
            colors: {
                primary: (s: unknown) => String(s),
                info: (s: unknown) => String(s),
                success: (s: unknown) => String(s),
                warning: (s: unknown) => String(s),
                error: (s: unknown) => String(s),
                muted: (s: unknown) => String(s),
            },
            symbols: { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' },
            createSpinner: () => spinnerMock,
        }));

        vi.doMock('../src/core/registry.js', () => ({
            getIndexVersion: () => '2026.01.01.1',
            clearCache,
        }));

        const checkIndexUpdate = vi.fn().mockResolvedValue({
            available: false,
            currentVersion: '2026.01.01.1',
            remoteVersion: '2026.01.01.1',
            requiresCliUpgrade: false,
        });
        const updateIndex = vi.fn();
        vi.doMock('../src/core/updater.js', () => ({ checkIndexUpdate, updateIndex }));

        const checkCliUpdate = vi.fn().mockResolvedValue({
            current: '0.5.1',
            latest: '0.5.1',
            updateAvailable: false,
            updateType: 'patch',
        });
        const shouldPromptCliUpdate = vi.fn().mockReturnValue(false);
        vi.doMock('../src/core/version.js', () => ({
            CLI_VERSION: '0.5.1',
            checkCliUpdate,
            shouldPromptCliUpdate,
        }));

        const c = captureConsole();
        try {
            const { update } = await import('../src/commands/update.js');
            await update();

            expect(spinnerMock.start).toHaveBeenCalledWith('正在检查更新...');
            expect(spinnerMock.stop).toHaveBeenCalledWith('索引已是最新版本', 'success');
            expect(updateIndex).not.toHaveBeenCalled();
            expect(clearCache).not.toHaveBeenCalled();
        } finally {
            c.restore();
        }
    });

    it('warns when remote index requires CLI upgrade', async () => {
        const spinnerMock = {
            start: vi.fn(),
            update: vi.fn(),
            stop: vi.fn(),
        };
        vi.doMock('../src/ink/utils/index.js', () => ({
            colors: {
                primary: (s: unknown) => String(s),
                info: (s: unknown) => String(s),
                success: (s: unknown) => String(s),
                warning: (s: unknown) => String(s),
                error: (s: unknown) => String(s),
                muted: (s: unknown) => String(s),
            },
            symbols: { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' },
            createSpinner: () => spinnerMock,
        }));

        vi.doMock('../src/core/registry.js', () => ({
            getIndexVersion: () => '2026.01.01.1',
            clearCache: vi.fn(),
        }));

        vi.doMock('../src/core/updater.js', () => ({
            checkIndexUpdate: vi.fn().mockResolvedValue({
                available: true,
                currentVersion: '2026.01.01.1',
                remoteVersion: '2026.02.01.1',
                requiresCliUpgrade: true,
                minCliVersion: '9.0.0',
            }),
            updateIndex: vi.fn(),
        }));

        vi.doMock('../src/core/version.js', () => ({
            CLI_VERSION: '0.5.1',
            checkCliUpdate: vi.fn().mockResolvedValue({
                current: '0.5.1',
                latest: '0.5.1',
                updateAvailable: false,
                updateType: 'patch',
            }),
            shouldPromptCliUpdate: vi.fn().mockReturnValue(false),
        }));

        const c = captureConsole();
        try {
            const { update } = await import('../src/commands/update.js');
            await update();

            expect(spinnerMock.stop).toHaveBeenCalledWith('需要升级 CLI', 'warning');
            // 检查是否输出了升级警告
            expect(c.logs.join('\n')).toContain('9.0.0');
        } finally {
            c.restore();
        }
    });

    it('updates index and clears cache when update succeeds', async () => {
        const clearCache = vi.fn();
        const spinnerMock = {
            start: vi.fn(),
            update: vi.fn(),
            stop: vi.fn(),
        };
        vi.doMock('../src/ink/utils/index.js', () => ({
            colors: {
                primary: (s: unknown) => String(s),
                info: (s: unknown) => String(s),
                success: (s: unknown) => String(s),
                warning: (s: unknown) => String(s),
                error: (s: unknown) => String(s),
                muted: (s: unknown) => String(s),
            },
            symbols: { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' },
            createSpinner: () => spinnerMock,
        }));

        vi.doMock('../src/core/registry.js', () => ({
            getIndexVersion: () => '2026.01.01.1',
            clearCache,
        }));

        const updateIndex = vi.fn().mockResolvedValue({ success: true, version: '2026.02.01.1' });
        vi.doMock('../src/core/updater.js', () => ({
            checkIndexUpdate: vi.fn().mockResolvedValue({
                available: true,
                currentVersion: '2026.01.01.1',
                remoteVersion: '2026.02.01.1',
                requiresCliUpgrade: false,
            }),
            updateIndex,
        }));

        vi.doMock('../src/core/version.js', () => ({
            CLI_VERSION: '0.5.1',
            checkCliUpdate: vi.fn().mockResolvedValue({
                current: '0.5.1',
                latest: '0.5.1',
                updateAvailable: false,
                updateType: 'patch',
            }),
            shouldPromptCliUpdate: vi.fn().mockReturnValue(false),
        }));

        const c = captureConsole();
        try {
            const { update } = await import('../src/commands/update.js');
            await update();

            expect(updateIndex).toHaveBeenCalled();
            expect(clearCache).toHaveBeenCalled();
            expect(spinnerMock.stop).toHaveBeenCalledWith(
                expect.stringContaining('2026.02.01.1'),
                'success'
            );
        } finally {
            c.restore();
        }
    });
});
