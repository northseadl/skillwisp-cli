/**
 * list 命令
 *
 * 列出已安装资源
 * 默认扁平、可扫读；--verbose 才展开路径/分组
 */

import { ALL_APPS } from '../core/agents.js';
import type { InstalledResource } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { scanInstalledResources } from '../core/scanner.js';
import { colors, symbols, getResourceColor } from '../core/terminal.js';

interface ListOptions {
    verbose?: boolean;
    json?: boolean;
    quiet?: boolean;
}

export async function list(options: ListOptions = {}): Promise<void> {
    const installed = scanInstalledResources();

    // --json
    if (options.json) {
        const output = installed.map((r) => ({
            id: r.id,
            type: r.type,
            name: r.name,
            agent: r.agent,
            path: r.path,
            isLink: r.isLink,
            scope: r.scope,
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    // 无结果
    if (installed.length === 0) {
        if (!options.quiet) {
            console.log();
            console.log(colors.warning(`${symbols.warning} No installed resources`));
            console.log(colors.muted(`  Run: skillwisp search <keyword>`));
            console.log(colors.muted(`  Or:  skillwisp (interactive mode)`));
            console.log();
        }
        return;
    }

    // --quiet
    if (options.quiet) {
        const uniqueIds = [...new Set(installed.map((r) => r.id))];
        for (const id of uniqueIds) {
            console.log(id);
        }
        return;
    }

    // 去重（按 id 聚合）
    const uniqueResources = deduplicateByResource(installed);

    if (options.verbose) {
        // 详细模式：按 agent 分组
        printVerboseList(installed);
    } else {
        // 默认：扁平列表
        printFlatList(uniqueResources);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 内部格式化函数
// ═══════════════════════════════════════════════════════════════════════════

function printFlatList(resources: InstalledResource[]): void {
    console.log();
    console.log(`${resources.length} installed resource${resources.length > 1 ? 's' : ''}`);
    console.log();

    for (const r of resources) {
        const typeConfig = RESOURCE_CONFIG[r.type];
        const typeColor = getResourceColor(r.type);
        const typeTag = typeColor(`[${typeConfig.label}]`);
        const name = r.name || r.id;
        const linkHint = r.isLink ? colors.muted(' (symlink)') : '';

        console.log(`${typeTag} ${colors.bold(r.id)}  ${name}${linkHint}`);
    }

    console.log();
    console.log(colors.muted(`Run: skillwisp list --verbose for paths`));
    console.log();
}

function printVerboseList(installed: InstalledResource[]): void {
    console.log();
    console.log(`${installed.length} installation${installed.length > 1 ? 's' : ''}`);
    console.log();

    // 按 agent 分组
    const grouped = installed.reduce(
        (acc, r) => {
            const agentKey = r.agent || 'unknown';
            if (!acc[agentKey]) acc[agentKey] = [];
            acc[agentKey].push(r);
            return acc;
        },
        {} as Record<string, InstalledResource[]>
    );

    for (const [agentId, resources] of Object.entries(grouped)) {
        const agent = ALL_APPS.find((a) => a.id === agentId);
        const agentName = agent?.name || agentId;

        console.log(colors.bold(agentName));

        for (const r of resources) {
            const typeConfig = RESOURCE_CONFIG[r.type];
            const typeColor = getResourceColor(r.type);
            const typeTag = typeColor(`[${typeConfig.label}]`);
            const linkHint = r.isLink ? ' (symlink)' : '';
            const scopeHint = r.scope === 'global' ? ' [global]' : '';

            console.log(`  ${typeTag} ${colors.bold(r.id)}${linkHint}${scopeHint}`);
            console.log(`      ${colors.muted(r.path || '')}`);
        }

        console.log();
    }
}

function deduplicateByResource(installed: InstalledResource[]): InstalledResource[] {
    const seen = new Map<string, InstalledResource>();

    for (const r of installed) {
        const key = `${r.type}:${r.id}`;
        if (!seen.has(key)) {
            seen.set(key, r);
        }
    }

    // 按 id 排序
    return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}
