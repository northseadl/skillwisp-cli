/**
 * 资源扫描模块
 *
 * 扫描已安装资源，支持多种安装格式（目录/文件）
 * 统一供 CLI 命令和 Ink 交互界面使用
 */

import { existsSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

import { ALL_APPS } from './agents.js';
import type { ResourceType, InstallScope, InstalledResource } from './types.js';
import { RESOURCE_TYPES } from './types.js';
import { getInstallRoot, tryParseResourceIdFromFileName } from './installPaths.js';

// ═══════════════════════════════════════════════════════════════════════════
// 公共 API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 扫描所有已安装资源
 */
export function scanInstalledResources(scope?: InstallScope): InstalledResource[] {
    const installed: InstalledResource[] = [];

    for (const agent of ALL_APPS) {
        for (const resourceType of RESOURCE_TYPES) {
            if (!scope || scope === 'local') {
                installed.push(...scanInstalledForAgent(agent.id, resourceType, 'local'));
            }
            if (!scope || scope === 'global') {
                installed.push(...scanInstalledForAgent(agent.id, resourceType, 'global'));
            }
        }
    }

    return installed;
}

/**
 * 扫描指定 Agent 的已安装资源
 */
export function scanInstalledForAgent(
    agentId: string,
    resourceType: ResourceType,
    scope: InstallScope
): InstalledResource[] {
    const agent = ALL_APPS.find((a) => a.id === agentId);
    if (!agent) return [];

    const root = getInstallRoot(agent, resourceType, scope);
    if (!root) return [];

    if (root.kind === 'dir') {
        return scanDir(root.dir, agentId, resourceType, scope, root.entryFile);
    }

    if (root.kind === 'file') {
        return scanFileRoot(root, agentId, resourceType, scope);
    }

    return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部实现
// ═══════════════════════════════════════════════════════════════════════════

function scanDir(
    dir: string,
    agentId: string,
    resourceType: ResourceType,
    scope: InstallScope,
    entryFile: string
): InstalledResource[] {
    if (!existsSync(dir)) return [];

    const resources: InstalledResource[] = [];

    try {
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

            const resourceDir = join(dir, entry.name);
            const resourceFile = join(resourceDir, entryFile);

            let isLink = false;
            try {
                isLink = lstatSync(resourceDir).isSymbolicLink();
            } catch {
                // ignore
            }

            if (existsSync(resourceFile)) {
                const name = extractName(resourceFile);
                resources.push({
                    id: entry.name,
                    type: resourceType,
                    name,
                    agent: agentId,
                    path: resourceDir,
                    isLink,
                    scope,
                });
            }
        }
    } catch {
        // ignore permission errors
    }

    return resources;
}

function scanFileRoot(
    root: { kind: 'file'; dir: string; prefix: string; ext: string },
    agentId: string,
    resourceType: ResourceType,
    scope: InstallScope
): InstalledResource[] {
    if (!existsSync(root.dir)) return [];

    const resources: InstalledResource[] = [];

    try {
        const entries = readdirSync(root.dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() && !entry.isSymbolicLink()) continue;

            const id = tryParseResourceIdFromFileName(entry.name, root);
            if (!id) continue;

            const filePath = join(root.dir, entry.name);

            let isLink = false;
            try {
                isLink = lstatSync(filePath).isSymbolicLink();
            } catch {
                // ignore
            }

            const name = extractName(filePath);
            resources.push({
                id,
                type: resourceType,
                name,
                agent: agentId,
                path: filePath,
                isLink,
                scope,
            });
        }
    } catch {
        // ignore
    }

    return resources;
}

/**
 * 从文件 frontmatter 提取 description 作为 name
 */
function extractName(filePath: string): string | undefined {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const match = content.match(/^---\s*\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/m);
        if (match) {
            const desc = match[1].trim();
            return desc.length > 30 ? desc.slice(0, 30) + '…' : desc;
        }
        return undefined;
    } catch {
        return undefined;
    }
}
