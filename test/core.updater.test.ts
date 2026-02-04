import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const USER_DATA_DIR = join(homedir(), '.agents', '.skillwisp');
const META_FILE = join(USER_DATA_DIR, 'meta.json');

function cleanUserData(): void {
    rmSync(USER_DATA_DIR, { recursive: true, force: true });
}

describe('core/updater', () => {
    beforeEach(() => {
        cleanUserData();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        cleanUserData();
        vi.restoreAllMocks();
    });

    it('checkIndexUpdate returns available=true and saves meta on success', async () => {
        const indexYaml = [
            'index_version: "9999.01.01.1"',
            'updated: "2099-01-01"',
            'skills:',
            '  - id: test-skill',
            '    source: test',
            '    path: "@test/test-skill"',
            '    name: Test Skill',
            '    description: A test skill',
        ].join('\n');

        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
            ok: true,
            text: async () => indexYaml,
        }) as any);

        const { checkIndexUpdate } = await import('../src/core/updater.js');
        const result = await checkIndexUpdate();

        expect(result.available).toBe(true);
        expect(result.remoteVersion).toBe('9999.01.01.1');
        expect(existsSync(META_FILE)).toBe(true);

        const meta = JSON.parse(readFileSync(META_FILE, 'utf-8'));
        expect(meta.bestMirror).toBeDefined();
        expect(typeof meta.bestMirror).toBe('string');
        expect(meta.lastCheck).toBeTypeOf('number');
    });

    it('updateIndex writes index and i18n files and updates meta', async () => {
        const indexYaml = [
            'index_version: "2026.02.01.1"',
            'updated: "2099-01-01"',
            'skills:',
            '  - id: test-skill',
            '    source: test',
            '    path: "@test/test-skill"',
            '    name: Test Skill',
            '    description: A test skill',
        ].join('\n');
        const i18nYaml = [
            'locale: zh-CN',
            'name: 简体中文',
            'ui:',
            '  menu_help: "帮助"',
        ].join('\n');

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
            const u = String(url);
            const content = u.includes('i18n/zh-CN.yaml') ? i18nYaml : indexYaml;
            return { ok: true, text: async () => content } as any;
        });

        const { updateIndex, USER_REGISTRY_DIR } = await import('../src/core/updater.js');
        const result = await updateIndex();

        expect(result.success).toBe(true);
        expect(result.version).toBe('2026.02.01.1');
        expect(existsSync(join(USER_REGISTRY_DIR, 'index.yaml'))).toBe(true);
        expect(existsSync(join(USER_REGISTRY_DIR, 'i18n', 'zh-CN.yaml'))).toBe(true);

        const meta = JSON.parse(readFileSync(META_FILE, 'utf-8'));
        expect(meta.indexVersion).toBe('2026.02.01.1');
    });

    it('updateIndex returns requiresCliUpgrade when remote min_cli_version is higher', async () => {
        const indexYaml = [
            'index_version: "2026.02.01.1"',
            'min_cli_version: "9.0.0"',
            'updated: "2099-01-01"',
            'skills:',
            '  - id: test-skill',
            '    source: test',
            '    path: "@test/test-skill"',
            '    name: Test Skill',
            '    description: A test skill',
        ].join('\n');

        vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
            ok: true,
            text: async () => indexYaml,
        }) as any);

        const { updateIndex, USER_REGISTRY_DIR } = await import('../src/core/updater.js');
        const result = await updateIndex();

        expect(result.success).toBe(false);
        expect(result.requiresCliUpgrade).toBe(true);
        expect(result.minCliVersion).toBe('9.0.0');
        expect(existsSync(join(USER_REGISTRY_DIR, 'index.yaml'))).toBe(false);
    });

    it('backgroundUpdate returns null when auto-update is disabled', async () => {
        const { setAutoUpdate } = await import('../src/core/preferences.js');
        setAutoUpdate(false);

        const { backgroundUpdate } = await import('../src/core/updater.js');
        const result = await backgroundUpdate();

        expect(result).toBeNull();
    });
});

