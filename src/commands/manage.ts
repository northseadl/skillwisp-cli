/**
 * manage 命令
 *
 * 交互式管理已安装资源
 * 支持启用/禁用、查看详情、批量卸载
 */

import { listResources, getResourceDetail } from '../core/manager.js';
import type { ResourceType, InstallScope, InstalledResource } from '../core/types.js';
import { RESOURCE_CONFIG, RESOURCE_TYPES } from '../core/types.js';
import { colors, symbols, createSpinner } from '../core/terminal.js';

interface ManageOptions {
    type?: string;
    scope?: string;
    json?: boolean;
}

export async function manage(options: ManageOptions = {}): Promise<void> {
    const resourceType = options.type as ResourceType | undefined;
    const scope = options.scope as InstallScope | undefined;

    const resources = listResources({
        type: resourceType,
        scope,
    });

    // --json 模式
    if (options.json) {
        const detailed = resources.map((r) => {
            const detail = getResourceDetail(r.id, r.type, r.scope);
            return { ...r, detail };
        });
        console.log(JSON.stringify(detailed, null, 2));
        return;
    }

    if (resources.length === 0) {
        console.log();
        console.log(colors.warning(`${symbols.warning} No installed resources found`));
        console.log(colors.muted(`  Run: skillwisp search <keyword>`));
        console.log();
        return;
    }

    // 按 scope + type 分组显示
    console.log();
    console.log(colors.bold(`${symbols.wisp} Installed Resources`));
    console.log();

    const grouped = groupResources(resources);

    for (const [groupKey, items] of grouped) {
        console.log(colors.primary(`  ${groupKey}`));

        for (const r of items) {
            const typeConfig = RESOURCE_CONFIG[r.type];
            const disabledMark = r.name?.includes('(disabled)') ? colors.warning(' [disabled]') : '';
            const linkHint = r.isLink ? colors.muted(' (symlink)') : '';

            console.log(
                `    ${symbols.bullet} [${typeConfig.label}] ${colors.bold(r.id)}${disabledMark}${linkHint}`
            );
            if (r.path) {
                console.log(`      ${colors.muted(r.path)}`);
            }
        }
        console.log();
    }

    console.log(colors.muted(`  Total: ${resources.length} resource(s)`));
    console.log();
    console.log(colors.muted(`  Commands:`));
    console.log(colors.muted(`    skillwisp uninstall <id>         Remove a resource`));
    console.log(colors.muted(`    skillwisp manage --json          JSON output`));
    console.log(colors.muted(`    skillwisp manage --type skill    Filter by type`));
    console.log();
}

function groupResources(
    resources: InstalledResource[]
): Map<string, InstalledResource[]> {
    const groups = new Map<string, InstalledResource[]>();

    for (const r of resources) {
        const typeLabel = RESOURCE_CONFIG[r.type]?.plural || r.type;
        const key = `${r.scope} / ${typeLabel}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    }

    return groups;
}
