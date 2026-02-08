/**
 * 资源管理器
 *
 * 提供资源的安装后管理能力
 * 供 CLI 命令和 vsext 调用
 *
 * 核心能力：
 * - uninstall: 卸载资源（清理所有 agent 目录）
 * - list:      带过滤的资源列表
 * - detail:    资源安装详情
 */

import { existsSync, lstatSync, rmSync } from 'node:fs';

import { ALL_APPS, PRIMARY_SOURCE, type AgentConfig } from './agents.js';
import { getInstallPathForResource } from './installPaths.js';
import { scanInstalledResources } from './scanner.js';
import type { ResourceType, InstallScope, InstalledResource } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════

export interface UninstallResult {
    success: boolean;
    /** 被清理的路径列表 */
    removedPaths: string[];
    /** 出错原因 */
    error?: string;
}

export interface ResourceDetail {
    id: string;
    type: ResourceType;
    scope: InstallScope;
    /** 主源路径 */
    primaryPath: string | null;
    /** 各 agent 的安装路径 */
    agentPaths: Array<{
        agentId: string;
        agentName: string;
        path: string;
        isLink: boolean;
        exists: boolean;
    }>;
}

export interface ListFilter {
    scope?: InstallScope;
    type?: ResourceType;
    agent?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 卸载
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 卸载资源：从所有 agent 目录中移除资源文件/symlink
 *
 * 策略：遍历所有 agent，找到该资源的安装路径并清理
 * 同时清理 PRIMARY_SOURCE (.agents) 中的主副本
 */
export function uninstallResource(
    resourceId: string,
    resourceType: ResourceType,
    scope: InstallScope
): UninstallResult {
    const removedPaths: string[] = [];

    try {
        for (const app of ALL_APPS) {
            const installInfo = getInstallPathForResource(app, resourceType, scope, resourceId);
            if (!installInfo) continue;

            if (existsSync(installInfo.path)) {
                rmSync(installInfo.path, { recursive: true, force: true });
                removedPaths.push(installInfo.path);
            }
        }

        if (removedPaths.length === 0) {
            return {
                success: false,
                removedPaths: [],
                error: `Resource "${resourceId}" (${resourceType}, ${scope}) not found in any agent directory`,
            };
        }

        return { success: true, removedPaths };
    } catch (error) {
        return {
            success: false,
            removedPaths,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 带过滤的列表
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 获取已安装资源列表（带过滤条件）
 */
export function listResources(filter: ListFilter = {}): InstalledResource[] {
    let resources = scanInstalledResources(filter.scope);

    // 按类型过滤
    if (filter.type) {
        resources = resources.filter((r) => r.type === filter.type);
    }

    // 按 agent 过滤
    if (filter.agent) {
        resources = resources.filter((r) => r.agent === filter.agent);
    }

    // 去重（按 scope:type:id 聚合）
    const seen = new Set<string>();
    return resources.filter((r) => {
        const key = `${r.scope}:${r.type}:${r.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 资源详情
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 获取资源的安装详情（包含各 agent 路径和 symlink 状态）
 */
export function getResourceDetail(
    resourceId: string,
    resourceType: ResourceType,
    scope: InstallScope
): ResourceDetail | null {
    let primaryPath: string | null = null;
    const agentPaths: ResourceDetail['agentPaths'] = [];

    // 检查 PRIMARY_SOURCE
    const primaryInfo = getInstallPathForResource(PRIMARY_SOURCE, resourceType, scope, resourceId);
    if (primaryInfo && existsSync(primaryInfo.path)) {
        primaryPath = primaryInfo.path;
    }

    // 检查所有 target apps
    for (const app of ALL_APPS) {
        if (app.id === PRIMARY_SOURCE.id) continue;

        const installInfo = getInstallPathForResource(app, resourceType, scope, resourceId);
        if (!installInfo) continue;

        let isLink = false;
        const pathExists = existsSync(installInfo.path);

        if (pathExists) {
            try {
                isLink = lstatSync(installInfo.path).isSymbolicLink();
            } catch {
                // ignore
            }
        }

        agentPaths.push({
            agentId: app.id,
            agentName: app.name,
            path: installInfo.path,
            isLink,
            exists: pathExists,
        });
    }

    // 如果 primary 和所有 agent 都没有找到，返回 null
    if (!primaryPath && agentPaths.every((a) => !a.exists)) {
        return null;
    }

    return {
        id: resourceId,
        type: resourceType,
        scope,
        primaryPath,
        agentPaths: agentPaths.filter((a) => a.exists),
    };
}
