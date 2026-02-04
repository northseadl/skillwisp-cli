import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('commands/update', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('stops when no index update is available', async () => {
        const spinner = { start: vi.fn(), stop: vi.fn(), message: vi.fn() };
        const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const clearCache = vi.fn();

        vi.doMock('@clack/prompts', () => ({ spinner: () => spinner, log }));
        vi.doMock('picocolors', () => ({
            default: {
                cyan: (s: unknown) => String(s),
                green: (s: unknown) => String(s),
                yellow: (s: unknown) => String(s),
            },
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

        const { update } = await import('../src/commands/update.js');
        await update();

        expect(spinner.start).toHaveBeenCalledWith('正在检查更新...');
        expect(spinner.stop).toHaveBeenCalledWith('索引已是最新版本');
        expect(updateIndex).not.toHaveBeenCalled();
        expect(clearCache).not.toHaveBeenCalled();
        expect(log.warn).not.toHaveBeenCalled();
    });

    it('warns when remote index requires CLI upgrade', async () => {
        const spinner = { start: vi.fn(), stop: vi.fn(), message: vi.fn() };
        const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

        vi.doMock('@clack/prompts', () => ({ spinner: () => spinner, log }));
        vi.doMock('picocolors', () => ({
            default: {
                cyan: (s: unknown) => String(s),
                green: (s: unknown) => String(s),
                yellow: (s: unknown) => String(s),
            },
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

        const { update } = await import('../src/commands/update.js');
        await update();

        expect(spinner.stop).toHaveBeenCalledWith('需要升级 CLI');
        expect(log.warn).toHaveBeenCalled();
    });

    it('updates index and clears cache when update succeeds', async () => {
        const spinner = { start: vi.fn(), stop: vi.fn(), message: vi.fn() };
        const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const clearCache = vi.fn();

        vi.doMock('@clack/prompts', () => ({ spinner: () => spinner, log }));
        vi.doMock('picocolors', () => ({
            default: {
                cyan: (s: unknown) => String(s),
                green: (s: unknown) => String(s),
                yellow: (s: unknown) => String(s),
            },
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

        const { update } = await import('../src/commands/update.js');
        await update();

        expect(updateIndex).toHaveBeenCalled();
        expect(clearCache).toHaveBeenCalled();
        expect(spinner.stop).toHaveBeenCalledWith('✓ 索引已更新到 2026.02.01.1');
        expect(log.error).not.toHaveBeenCalled();
    });
});

