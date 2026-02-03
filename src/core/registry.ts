/**
 * Registry 加载与搜索
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import type { Resource, ResourceType, LocaleData, SourcesConfig } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findRegistryDir(): string {
    // 开发环境: src/core/ -> registry/
    const devPath = join(__dirname, '../../registry');
    if (existsSync(devPath)) return devPath;

    // 打包环境: dist/ -> registry/
    const distPath = join(__dirname, '../registry');
    if (existsSync(distPath)) return distPath;

    throw new Error('Registry directory not found');
}

const REGISTRY_DIR = findRegistryDir();

let cachedResources: Resource[] | null = null;
let cachedLocale: LocaleData | null = null;
let cachedSources: SourcesConfig | null = null;

interface RawIndex {
    version: string;
    updated: string;
    resources?: Resource[];
    skills?: Array<Omit<Resource, 'type'> & { type?: ResourceType }>;
    rules?: Resource[];
    workflows?: Resource[];
}

export function loadResources(): Resource[] {
    if (cachedResources) return cachedResources;

    const content = readFileSync(join(REGISTRY_DIR, 'index.yaml'), 'utf-8');
    const raw = parseYaml(content) as RawIndex;

    if (raw.resources) {
        cachedResources = raw.resources;
        return cachedResources;
    }

    // 兼容分离式格式 (skills/rules/workflows)
    const resources: Resource[] = [];
    if (raw.skills) {
        for (const s of raw.skills) {
            resources.push({ ...s, type: s.type || 'skill' });
        }
    }
    if (raw.rules) resources.push(...raw.rules);
    if (raw.workflows) resources.push(...raw.workflows);

    cachedResources = resources;
    return cachedResources;
}

export function loadSources(): SourcesConfig {
    if (cachedSources) return cachedSources;

    const content = readFileSync(join(REGISTRY_DIR, 'sources.yaml'), 'utf-8');
    cachedSources = parseYaml(content) as SourcesConfig;
    return cachedSources;
}

interface RawLocale {
    locale: string;
    name: string;
    resources?: Record<string, Record<string, { name: string; description: string }>>;
    skills?: Record<string, Record<string, { name: string; description: string }>>;
    ui: Record<string, string>;
}

export function loadLocale(locale: string = 'zh-CN'): LocaleData | null {
    if (cachedLocale?.locale === locale) return cachedLocale;

    try {
        const content = readFileSync(join(REGISTRY_DIR, 'i18n', `${locale}.yaml`), 'utf-8');
        const raw = parseYaml(content) as RawLocale;

        cachedLocale = {
            locale: raw.locale,
            name: raw.name,
            resources: raw.resources || raw.skills || {},
            ui: raw.ui,
        };
        return cachedLocale;
    } catch {
        return null;
    }
}

export function findResource(query: string, type?: ResourceType): Resource | undefined {
    const resources = loadResources();
    const q = query.toLowerCase();

    return resources.find((r) => {
        if (type && r.type !== type) return false;
        return r.id === q || r.path.endsWith(`/${q}`) || r.path === q;
    });
}

export function findResourceByFullName(fullName: string): Resource | undefined {
    const match = fullName.match(/^@?([^/]+)\/(.+)$/);
    if (!match) return undefined;

    const [, source, id] = match;
    const resources = loadResources();

    return resources.find((r) =>
        r.source.toLowerCase() === source.toLowerCase() &&
        r.id.toLowerCase() === id.toLowerCase()
    );
}

export function searchResources(keyword: string, type?: ResourceType): Resource[] {
    const resources = loadResources();
    const kw = keyword.toLowerCase();

    return resources.filter((r) => {
        if (type && r.type !== type) return false;
        return (
            r.id.includes(kw) ||
            r.name.toLowerCase().includes(kw) ||
            r.description.toLowerCase().includes(kw) ||
            r.tags?.some((t) => t.includes(kw))
        );
    });
}

export function getResourcesByType(type: ResourceType): Resource[] {
    return loadResources().filter((r) => r.type === type);
}

export function localizeResource(resource: Resource, locale: LocaleData | null): Resource {
    const localized = locale?.resources[resource.source]?.[resource.id];
    if (!localized) return resource;

    return {
        ...resource,
        name: localized.name || resource.name,
        description: localized.description || resource.description,
    };
}

export function getDistributionUrl(): string {
    return loadSources().distribution.primary;
}

export function getResourceRepoUrl(resource: Resource): string {
    const source = loadSources().sources.find((s) => s.id === resource.source);
    return source?.repo || '';
}
