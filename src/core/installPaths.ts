/**
 * 安装路径规划（按不同工具的真实目录结构）
 *
 * 安装模式：
 * - 目录型（大多数工具）：{baseDir}/skills/{id}/SKILL.md
 * - 文件型（当前未使用，保留兼容）
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

import type { AgentConfig } from './agents.js';
import type { ResourceType } from './types.js';
import { RESOURCE_CONFIG } from './types.js';

export type InstallScope = 'local' | 'global';

export const SKILLWISP_FILE_PREFIX = 'skillwisp-';

export type InstallRoot =
    | {
        kind: 'dir';
        /** 绝对目录：包含资源子目录（按 resourceId 命名） */
        dir: string;
        entryFile: string;
    }
    | {
        kind: 'file';
        /** 绝对目录：包含资源文件（按 prefix+resourceId+ext 命名） */
        dir: string;
        prefix: string;
        ext: string;
    };

export function getScopeBaseDir(scope: InstallScope): string {
    return scope === 'global' ? homedir() : process.cwd();
}

export function getInstallRoot(
    app: AgentConfig,
    resourceType: ResourceType,
    scope: InstallScope
): InstallRoot | null {
    const baseDir = getScopeBaseDir(scope);

    // Codex：支持 CODEX_HOME（仅影响 global 安装）
    if (app.id === 'codex' && scope === 'global') {
        const codexHome = process.env.CODEX_HOME?.trim();
        if (codexHome) {
            const config = RESOURCE_CONFIG[resourceType];
            return {
                kind: 'dir',
                dir: join(codexHome, config.dirName),
                entryFile: config.entryFile,
            };
        }
    }

    // 仅支持 skill 类型的工具：GitHub Copilot、Cursor、Augment
    // GitHub Copilot: .agents/skills (local via compat), ~/.copilot/skills (global)
    // Cursor:  .cursor/skills (local/global)
    // Augment: .augment/skills (local/global)
    if (app.id === 'github-copilot' || app.id === 'cursor' || app.id === 'augment') {
        if (resourceType !== 'skill') return null;
        if (scope === 'global' && !app.globalBaseDir) return null;
        const config = RESOURCE_CONFIG[resourceType];
        const root = scope === 'global' ? app.globalBaseDir : app.baseDir;
        return {
            kind: 'dir',
            dir: join(baseDir, root, config.dirName),
            entryFile: config.entryFile,
        };
    }

    // 默认：目录型
    const root = scope === 'global' ? app.globalBaseDir : app.baseDir;
    if (scope === 'global' && !root) return null;

    const config = RESOURCE_CONFIG[resourceType];
    return {
        kind: 'dir',
        dir: join(baseDir, root, config.dirName),
        entryFile: config.entryFile,
    };
}

export function getInstallPathForResource(
    app: AgentConfig,
    resourceType: ResourceType,
    scope: InstallScope,
    resourceId: string
): { kind: InstallRoot['kind']; path: string } | null {
    const root = getInstallRoot(app, resourceType, scope);
    if (!root) return null;

    if (root.kind === 'dir') {
        return { kind: 'dir', path: join(root.dir, resourceId) };
    }
    if (root.kind === 'file') {
        return { kind: 'file', path: join(root.dir, `${root.prefix}${resourceId}${root.ext}`) };
    }
    return null;
}

export function tryParseResourceIdFromFileName(
    fileName: string,
    root: Extract<InstallRoot, { kind: 'file' }>
): string | null {
    if (!fileName.startsWith(root.prefix)) return null;
    if (!fileName.endsWith(root.ext)) return null;
    const id = fileName.slice(root.prefix.length, fileName.length - root.ext.length);
    return id || null;
}
