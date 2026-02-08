/**
 * source 命令组
 *
 * 管理 GitHub 资源来源
 *   source add <url>      添加 GitHub 仓库
 *   source list            查看所有用户源
 *   source sync [id]       同步索引
 *   source remove <id>     移除源
 */

import { addSource, removeSource, syncSource, listUserSources } from '../core/sourceManager.js';
import { colors, symbols, createSpinner } from '../core/terminal.js';

// ═══════════════════════════════════════════════════════════════════════════
// source add
// ═══════════════════════════════════════════════════════════════════════════

export async function sourceAdd(repoUrl: string, options: { json?: boolean }): Promise<void> {
    if (options.json) {
        const result = await addSource(repoUrl);
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    const spinner = createSpinner();
    spinner.start(`Cloning and scanning ${repoUrl}...`);

    const result = await addSource(repoUrl);

    if (result.success && result.source) {
        spinner.stop(
            `Added @${result.source.id} — ${result.source.resourceCount} resources found`,
            'success'
        );
        console.log(`  ${symbols.bullet} Repo: ${colors.muted(result.source.repo)}`);
        console.log();
        console.log(
            colors.muted(`  Tip: Run ${colors.primary('skillwisp')} to browse and install resources from this source.`)
        );
    } else {
        spinner.stop(result.error || 'Unknown error', 'error');
    }

    console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// source list
// ═══════════════════════════════════════════════════════════════════════════

export function sourceList(options: { json?: boolean }): void {
    const sources = listUserSources();

    if (options.json) {
        console.log(JSON.stringify(sources, null, 2));
        return;
    }

    if (sources.length === 0) {
        console.log();
        console.log(colors.muted(`  No custom sources added yet.`));
        console.log(colors.muted(`  Run ${colors.primary('skillwisp source add <github-url>')} to add one.`));
        console.log();
        return;
    }

    console.log();
    console.log(colors.bold(`  Custom Sources (${sources.length})`));
    console.log();

    for (const s of sources) {
        const syncDate = new Date(s.lastSync).toLocaleDateString();
        console.log(`  ${symbols.wisp} ${colors.primary(`@${s.id}`)}  ${colors.muted(`${s.resourceCount} resources`)}`);
        console.log(`    ${colors.muted(s.repo)}`);
        console.log(`    ${colors.muted(`Last synced: ${syncDate}`)}`);
        console.log();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// source sync
// ═══════════════════════════════════════════════════════════════════════════

export async function sourceSync(sourceId?: string, options: { json?: boolean } = {}): Promise<void> {
    const spinner = createSpinner();
    spinner.start(sourceId ? `Syncing @${sourceId}...` : 'Syncing all sources...');

    const results = await syncSource(sourceId);

    if (options.json) {
        spinner.stop('Done', 'success');
        const obj: Record<string, unknown> = {};
        for (const [id, result] of results) {
            obj[id] = result;
        }
        console.log(JSON.stringify(obj, null, 2));
        return;
    }

    let anySuccess = false;
    for (const [, result] of results) {
        if (result.success) {
            anySuccess = true;
            break;
        }
    }

    spinner.stop(
        anySuccess ? 'Sync complete' : 'Sync failed',
        anySuccess ? 'success' : 'error'
    );

    console.log();
    for (const [id, result] of results) {
        if (result.success) {
            console.log(`  ${symbols.success} @${id}: ${result.resourceCount} resources`);
        } else {
            console.log(`  ${symbols.error} @${id}: ${result.error}`);
        }
    }
    console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// source remove
// ═══════════════════════════════════════════════════════════════════════════

export async function sourceRemove(sourceId: string, options: { json?: boolean }): Promise<void> {
    if (options.json) {
        const result = removeSource(sourceId);
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    const result = removeSource(sourceId);

    console.log();
    if (result.success) {
        console.log(colors.success(`  ${symbols.success} Removed source @${sourceId}`));
    } else {
        console.log(colors.error(`  ${symbols.error} ${result.error}`));
    }
    console.log();
}
