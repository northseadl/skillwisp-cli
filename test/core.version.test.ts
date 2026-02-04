import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('core/version', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (originalFetch) {
            vi.stubGlobal('fetch', originalFetch);
        } else {
            // @ts-expect-error - fetch may not exist in older Node runtimes
            delete globalThis.fetch;
        }
    });

    it('isVersionLower handles valid and invalid semver', async () => {
        const { isVersionLower } = await import('../src/core/version.js');
        expect(isVersionLower('0.1.0', '0.2.0')).toBe(true);
        expect(isVersionLower('1.2.3', '1.2.3')).toBe(false);
        expect(isVersionLower('not-a-semver', '1.0.0')).toBe(false);
    });

    it('checkCliUpdate returns update info from first responding registry', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({ version: '1.0.0' }),
        })) as unknown as typeof fetch);

        const { checkCliUpdate, shouldPromptCliUpdate } = await import('../src/core/version.js');
        const info = await checkCliUpdate();

        expect(info.latest).toBe('1.0.0');
        expect(info.updateAvailable).toBe(true);
        expect(info.updateType).toBe('major');
        expect(shouldPromptCliUpdate(info)).toBe(true);
    });

    it('checkCliUpdate falls back to the next registry when response is not ok', async () => {
        const fetchMock = vi.fn(async (url: string) => {
            if (String(url).includes('npmmirror')) {
                return { ok: false, json: async () => ({}) };
            }
            return { ok: true, json: async () => ({ version: '1.0.0' }) };
        });
        vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

        const { checkCliUpdate } = await import('../src/core/version.js');
        const info = await checkCliUpdate();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(info.latest).toBe('1.0.0');
        expect(info.updateAvailable).toBe(true);
    });

    it('checkCliUpdate returns no-update result when all registries fail', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            json: async () => ({ version: '999.0.0' }),
        })) as unknown as typeof fetch);

        const { checkCliUpdate, shouldPromptCliUpdate } = await import('../src/core/version.js');
        const info = await checkCliUpdate();

        expect(info.latest).toBe(info.current);
        expect(info.updateAvailable).toBe(false);
        expect(info.updateType).toBe('none');
        expect(shouldPromptCliUpdate(info)).toBe(false);
    });
});

