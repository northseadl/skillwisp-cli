import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PRIMARY_SOURCE } from '../../core/agents.js';
import { getInstallRoot } from '../../core/installPaths.js';
import { RESOURCE_TYPES } from '../../core/types.js';
import type { InstallScope, InstalledItem } from './screenState.js';

function scanInstalledPrimary(scope: InstallScope): InstalledItem[] {
    const items: InstalledItem[] = [];

    for (const type of RESOURCE_TYPES) {
        const root = getInstallRoot(PRIMARY_SOURCE, type, scope);
        if (!root || root.kind !== 'dir') continue;
        if (!existsSync(root.dir)) continue;

        try {
            const entries = readdirSync(root.dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
                const resourceDir = join(root.dir, entry.name);
                const entryFile = join(resourceDir, root.entryFile);
                if (!existsSync(entryFile)) continue;
                items.push({ id: entry.name, type, scope });
            }
        } catch {
            continue;
        }
    }

    return items;
}

export function loadInstalledItems(): InstalledItem[] {
    const all = [
        ...scanInstalledPrimary('local'),
        ...scanInstalledPrimary('global'),
    ];

    const seen = new Set<string>();
    const unique: InstalledItem[] = [];

    for (const item of all) {
        const key = `${item.scope}:${item.type}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }

    return unique.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.id.localeCompare(b.id);
    });
}

