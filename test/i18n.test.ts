import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function removePreferencesFile(): void {
    const prefsFile = join(homedir(), '.agents', '.skillwisp', 'preferences.json');
    rmSync(prefsFile, { force: true });
}

describe('core/i18n', () => {
    beforeEach(() => {
        vi.resetModules();
        removePreferencesFile();
    });

    it('initializes to English when no preference exists', async () => {
        const { initI18n, t, needsLanguageSetup, getLocaleCode } = await import('../src/core/i18n.js');

        const hasSavedLocale = initI18n();
        expect(hasSavedLocale).toBe(false);
        expect(getLocaleCode()).toBe('en');
        expect(needsLanguageSetup()).toBe(true);
        expect(t('menu_help')).toBe('Help');
    });

    it('setLocale persists and switches translations', async () => {
        const { initI18n, setLocale, getLocaleCode, needsLanguageSetup, t } = await import('../src/core/i18n.js');

        initI18n();
        setLocale('zh-CN');

        expect(getLocaleCode()).toBe('zh-CN');
        expect(needsLanguageSetup()).toBe(false);
        expect(t('menu_help')).toBe('帮助');
    });

    it('t falls back to English and then to key/fallback', async () => {
        const { initI18n, setLocale, t } = await import('../src/core/i18n.js');

        initI18n();
        setLocale('zh-CN');

        expect(t('nonexistent_key')).toBe('nonexistent_key');
        expect(t('nonexistent_key', 'fallback')).toBe('fallback');
    });
});

