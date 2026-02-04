/**
 * info 命令
 */

import { findResource, searchResources, loadLocale, localizeResource, getResourceRepoUrl } from '../core/registry.js';
import { checkExists } from '../core/installer.js';
import { detectApps } from '../core/agents.js';
import type { ResourceType } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols, getResourceColor } from '../ink/utils/index.js';

interface InfoOptions {
    type?: string;
    json?: boolean;
    installed?: boolean;
}

export async function info(resourceId: string, options: InfoOptions = {}): Promise<void> {
    const locale = loadLocale('zh-CN');

    let resourceType: ResourceType | undefined;
    if (options.type && ['skill', 'rule', 'workflow'].includes(options.type)) {
        resourceType = options.type as ResourceType;
    }

    let resource = findResource(resourceId, resourceType);

    if (!resource) {
        const candidates = searchResources(resourceId);

        if (candidates.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: `Resource not found: ${resourceId}` }));
            } else {
                console.log();
                console.log(colors.error(`${symbols.error} Resource not found: ${resourceId}`));
                console.log(colors.muted(`  Run: skillwisp search ${resourceId}`));
                console.log();
            }
            process.exit(3);
        }

        if (candidates.length === 1) {
            resource = candidates[0];
        } else {
            if (options.json) {
                console.log(JSON.stringify({
                    error: `Ambiguous resource: ${resourceId}`,
                    candidates: candidates.slice(0, 5).map((c) => c.id),
                }));
            } else {
                console.log();
                console.log(colors.error(`${symbols.error} Ambiguous resource: ${resourceId}`));
                console.log(colors.muted(`  ${candidates.length} candidates found:`));
                for (const c of candidates.slice(0, 5)) {
                    console.log(colors.muted(`    - ${c.id}`));
                }
                console.log(colors.muted(`  Run: skillwisp search ${resourceId}`));
                console.log();
            }
            process.exit(3);
        }
    }

    const localized = localizeResource(resource, locale);
    const typeConfig = RESOURCE_CONFIG[resource.type];

    let installedAt: string[] = [];
    if (options.installed) {
        const agentIds = detectApps().map((a) => a.id);
        installedAt = [
            ...checkExists(resource.id, resource.type, agentIds, 'local'),
            ...checkExists(resource.id, resource.type, agentIds, 'global'),
        ];
    }

    if (options.json) {
        console.log(JSON.stringify({
            id: resource.id,
            type: resource.type,
            name: localized.name,
            description: localized.description,
            source: resource.source,
            tags: resource.tags || [],
            path: resource.path,
            lastUpdated: resource.lastUpdated,
            commitHash: resource.commitHash,
            repoUrl: getResourceRepoUrl(resource),
            ...(options.installed && { installedAt }),
        }, null, 2));
        return;
    }

    const typeColor = getResourceColor(resource.type);
    const typeTag = typeColor(`[${typeConfig.label}]`);

    console.log();
    console.log(`${typeTag} ${colors.bold(resource.id)}`);
    console.log(colors.muted('─'.repeat(50)));
    console.log();
    console.log(`  Name:        ${localized.name}`);
    console.log(`  Description: ${localized.description}`);
    console.log(`  Source:      @${resource.source}`);
    console.log(`  Path:        ${resource.path}`);

    if (resource.tags?.length) {
        console.log(`  Tags:        ${resource.tags.map((t) => `#${t}`).join(' ')}`);
    }

    const repoUrl = getResourceRepoUrl(resource);
    if (resource.lastUpdated || resource.commitHash || repoUrl) {
        console.log();
        console.log(colors.muted('  Version Info:'));
        if (resource.lastUpdated) {
            console.log(`    Updated:   ${resource.lastUpdated}`);
        }
        if (resource.commitHash) {
            console.log(`    Commit:    ${resource.commitHash}`);
        }
        if (repoUrl) {
            console.log(`    Repo:      ${repoUrl}`);
        }
    }

    if (options.installed) {
        console.log();
        if (installedAt.length > 0) {
            console.log(`  ${colors.success(symbols.success)} Installed at: ${installedAt.join(', ')}`);
        } else {
            console.log(`  ${colors.muted(symbols.warning)} Not installed`);
        }
    }

    console.log();
    console.log(colors.muted(`Run: skillwisp install ${resource.id}`));
    console.log();
}
