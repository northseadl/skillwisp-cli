/**
 * search 命令
 */

import { loadResources, loadLocale, localizeResource, getResourceRepoUrl } from '../core/registry.js';
import type { Resource, ResourceType } from '../core/types.js';
import { RESOURCE_CONFIG } from '../core/types.js';
import { colors, symbols, truncate, getResourceColor } from '../ui/theme.js';

const DEFAULT_PAGE_SIZE = 20;

interface SearchOptions {
    type?: ResourceType;
    compact?: boolean;
    verbose?: boolean;
    json?: boolean;
    quiet?: boolean;
    page?: string;
    perPage?: string;
    all?: boolean;
}

interface ScoredResource {
    resource: Resource;
    localized: Resource;
    score: number;
}

const SCORE_WEIGHTS = {
    ID_EXACT: 100,
    ID_PREFIX: 80,
    ID_CONTAINS: 60,
    NAME_CONTAINS: 50,
    DESC_CONTAINS: 30,
    TAG_MATCH: 20,
};

export function getFullName(resource: Resource): string {
    return `@${resource.source}/${resource.id}`;
}

export async function search(query: string, options: SearchOptions = {}): Promise<void> {
    const locale = loadLocale('zh-CN');
    const allResources = loadResources();
    const q = query.toLowerCase();

    const scored: ScoredResource[] = [];

    for (const resource of allResources) {
        if (options.type && resource.type !== options.type) continue;

        const localized = localizeResource(resource, locale);
        const score = calculateScore(resource, localized, q);

        if (score > 0) {
            scored.push({ resource, localized, score });
        }
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.resource.id.localeCompare(b.resource.id);
    });

    if (options.json) {
        const output = scored.map(({ resource, localized }, index) => ({
            index: index + 1,
            fullName: getFullName(resource),
            id: resource.id,
            type: resource.type,
            source: resource.source,
            name: localized.name,
            description: localized.description,
            tags: resource.tags || [],
            lastUpdated: resource.lastUpdated,
            commitHash: resource.commitHash,
            repoUrl: getResourceRepoUrl(resource),
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    if (scored.length === 0) {
        if (!options.quiet) {
            console.log();
            console.log(colors.warning(`${symbols.warning} No results for "${query}"`));
            console.log(colors.muted(`  Try different keywords or run: skillwisp catalog`));
            console.log();
        }
        process.exit(3);
    }

    if (options.quiet) {
        for (const { resource } of scored) {
            console.log(getFullName(resource));
        }
        return;
    }

    const paged = paginateResults(
        scored.map(({ resource, localized }) => ({ resource, localized })),
        options
    );

    console.log();
    if (paged.totalPages > 1) {
        console.log(`${scored.length} results for "${colors.bold(query)}" (page ${paged.currentPage}/${paged.totalPages})`);
    } else {
        console.log(`${scored.length} result${scored.length > 1 ? 's' : ''} for "${colors.bold(query)}"`);
    }
    console.log();

    const startIndex = (paged.currentPage - 1) * (options.perPage ? parseInt(options.perPage, 10) : DEFAULT_PAGE_SIZE);

    paged.items.forEach((item, i) => {
        printResourceLine(startIndex + i + 1, item.resource, item.localized, options);
    });

    console.log();
    if (paged.hasMore) {
        console.log(colors.muted(`Page ${paged.currentPage}/${paged.totalPages} | Next: skillwisp search ${query} --page ${paged.currentPage + 1}`));
    } else {
        console.log(colors.muted(`Install: skillwisp install <fullName>  (e.g. skillwisp install @anthropic/docx)`));
    }
    console.log();
}

export async function catalog(options: SearchOptions = {}): Promise<void> {
    const locale = loadLocale('zh-CN');
    let resources = loadResources();

    if (options.type) {
        resources = resources.filter((r) => r.type === options.type);
    }

    resources.sort((a, b) => a.id.localeCompare(b.id));

    if (options.json) {
        const output = resources.map((r, index) => {
            const localized = localizeResource(r, locale);
            return {
                index: index + 1,
                fullName: getFullName(r),
                id: r.id,
                type: r.type,
                source: r.source,
                name: localized.name,
                description: localized.description,
                tags: r.tags || [],
                lastUpdated: r.lastUpdated,
                commitHash: r.commitHash,
                repoUrl: getResourceRepoUrl(r),
            };
        });
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    if (resources.length === 0) {
        if (!options.quiet) {
            console.log();
            console.log(colors.warning(`${symbols.warning} No resources found`));
            console.log();
        }
        return;
    }

    if (options.quiet) {
        for (const r of resources) {
            console.log(getFullName(r));
        }
        return;
    }

    const items = resources.map((r) => ({
        resource: r,
        localized: localizeResource(r, locale),
    }));

    const paged = paginateResults(items, options);

    console.log();
    if (paged.totalPages > 1) {
        console.log(`${resources.length} resources available (page ${paged.currentPage}/${paged.totalPages})`);
    } else {
        console.log(`${resources.length} resource${resources.length > 1 ? 's' : ''} available`);
    }
    console.log();

    const startIndex = (paged.currentPage - 1) * (options.perPage ? parseInt(options.perPage, 10) : DEFAULT_PAGE_SIZE);

    paged.items.forEach((item, i) => {
        printResourceLine(startIndex + i + 1, item.resource, item.localized, options);
    });

    console.log();
    if (paged.hasMore) {
        const typeArg = options.type ? ` --type ${options.type}` : '';
        console.log(colors.muted(`Page ${paged.currentPage}/${paged.totalPages} | Next: skillwisp catalog${typeArg} --page ${paged.currentPage + 1}`));
    } else {
        console.log(colors.muted(`Install: skillwisp install <fullName>  (e.g. skillwisp install @anthropic/docx)`));
    }
    console.log();
}

interface PagedResult<T> {
    items: T[];
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
}

function paginateResults<T>(items: T[], options: SearchOptions): PagedResult<T> {
    const isTTY = Boolean(process.stdout.isTTY);
    const pageSize = options.perPage ? parseInt(options.perPage, 10) : DEFAULT_PAGE_SIZE;
    const currentPage = options.page ? parseInt(options.page, 10) : 1;

    if (!isTTY || options.all) {
        return { items, currentPage: 1, totalPages: 1, hasMore: false };
    }

    const totalPages = Math.ceil(items.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const pagedItems = items.slice(startIndex, startIndex + pageSize);

    return {
        items: pagedItems,
        currentPage,
        totalPages,
        hasMore: currentPage < totalPages,
    };
}

function calculateScore(resource: Resource, localized: Resource, query: string): number {
    let score = 0;
    const id = resource.id.toLowerCase();
    const fullName = getFullName(resource).toLowerCase();
    const name = localized.name.toLowerCase();
    const desc = localized.description.toLowerCase();

    if (fullName === query || fullName === `@${query}`) {
        score += SCORE_WEIGHTS.ID_EXACT;
    }

    if (id === query) {
        score += SCORE_WEIGHTS.ID_EXACT;
    } else if (id.startsWith(query)) {
        score += SCORE_WEIGHTS.ID_PREFIX;
    } else if (id.includes(query)) {
        score += SCORE_WEIGHTS.ID_CONTAINS;
    }

    if (name.includes(query)) {
        score += SCORE_WEIGHTS.NAME_CONTAINS;
    }

    if (desc.includes(query)) {
        score += SCORE_WEIGHTS.DESC_CONTAINS;
    }

    if (resource.tags?.some((t) => t.toLowerCase().includes(query))) {
        score += SCORE_WEIGHTS.TAG_MATCH;
    }

    return score;
}

function printResourceLine(
    index: number,
    resource: Resource,
    localized: Resource,
    options: SearchOptions
): void {
    const typeColor = getResourceColor(resource.type);
    const typeTag = typeColor(`[${RESOURCE_CONFIG[resource.type].label}]`);
    const fullName = colors.bold(getFullName(resource));
    const indexStr = colors.muted(`${index.toString().padStart(2)}.`);

    if (options.compact) {
        console.log(`${indexStr} ${typeTag} ${fullName}`);
    } else if (options.verbose) {
        console.log(`${indexStr} ${typeTag} ${fullName}`);
        console.log(`      Name: ${localized.name}`);
        console.log(`      Desc: ${localized.description}`);
        if (resource.tags?.length) {
            console.log(`      Tags: ${resource.tags.map((t) => `#${t}`).join(' ')}`);
        }
        console.log();
    } else {
        const desc = truncate(localized.description, 45);
        console.log(`${indexStr} ${typeTag} ${fullName} ${colors.muted('—')} ${colors.muted(desc)}`);
    }
}
