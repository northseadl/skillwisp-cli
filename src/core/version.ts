/**
 * CLI 版本管理
 *
 * 职责：
 * 1. 提供 CLI 当前版本
 * 2. 检查 NPM 最新版本
 * 3. 判断是否需要升级提示（仅 Major/Minor）
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// CLI 版本
// ═══════════════════════════════════════════════════════════════════════════

function loadCliVersion(): string {
    try {
        const devPath = join(__dirname, '../../package.json');
        const pkg = JSON.parse(readFileSync(devPath, 'utf-8'));
        return pkg.version;
    } catch {
        try {
            const distPath = join(__dirname, '../package.json');
            const pkg = JSON.parse(readFileSync(distPath, 'utf-8'));
            return pkg.version;
        } catch {
            return '0.0.0';
        }
    }
}

export const CLI_VERSION = loadCliVersion();

// ═══════════════════════════════════════════════════════════════════════════
// SemVer 工具函数（轻量实现，无外部依赖）
// ═══════════════════════════════════════════════════════════════════════════

interface SemVer {
    major: number;
    minor: number;
    patch: number;
}

function parseSemVer(version: string): SemVer | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
    };
}

function compareSemVer(a: string, b: string): number {
    const av = parseSemVer(a);
    const bv = parseSemVer(b);
    if (!av || !bv) return 0;

    if (av.major !== bv.major) return av.major - bv.major;
    if (av.minor !== bv.minor) return av.minor - bv.minor;
    return av.patch - bv.patch;
}

export function isVersionLower(current: string, target: string): boolean {
    return compareSemVer(current, target) < 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI 版本检查
// ═══════════════════════════════════════════════════════════════════════════

export interface CliVersionInfo {
    current: string;
    latest: string;
    updateAvailable: boolean;
    updateType: 'major' | 'minor' | 'patch' | 'none';
}

const NPM_REGISTRIES = [
    'https://registry.npmmirror.com/skillwisp/latest',
    'https://registry.npmjs.org/skillwisp/latest',
];
const NPM_TIMEOUT = 3000;

export async function checkCliUpdate(): Promise<CliVersionInfo> {
    const current = CLI_VERSION;

    for (const registry of NPM_REGISTRIES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), NPM_TIMEOUT);

            const response = await fetch(registry, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) continue;

            const data = await response.json() as { version: string };
            const latest = data.version;
            const updateType = getUpdateType(current, latest);

            return {
                current,
                latest,
                updateAvailable: updateType !== 'none',
                updateType,
            };
        } catch {
            continue;
        }
    }

    return {
        current,
        latest: current,
        updateAvailable: false,
        updateType: 'none',
    };
}

function getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' | 'none' {
    const cv = parseSemVer(current);
    const lv = parseSemVer(latest);
    if (!cv || !lv) return 'none';

    if (compareSemVer(current, latest) >= 0) return 'none';

    if (lv.major > cv.major) return 'major';
    if (lv.minor > cv.minor) return 'minor';
    if (lv.patch > cv.patch) return 'patch';

    return 'none';
}

/**
 * 是否应该提示 CLI 更新
 * 规则：仅 Major/Minor 变更提示，Patch 不提示
 */
export function shouldPromptCliUpdate(info: CliVersionInfo): boolean {
    return info.updateType === 'major' || info.updateType === 'minor';
}
