/**
 * Registry 加载与搜索
 *
 * 加载策略（同步，无网络）：
 * 1. 用户数据存在 (~/.skillwisp/registry) → 使用用户数据
 * 2. 否则 → 使用内置数据
 *
 * 远程更新由 updater.ts 处理
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import type { Resource, ResourceType, LocaleData, SourcesConfig, IndexData } from './types.js';
import { USER_REGISTRY_DIR, findBuiltinRegistryDir } from './paths.js';
import { loadUserSourceResources } from './sourceManager.js';

/**
 * 获取有效的 Registry 目录
 * 优先级: 用户数据 > 内置数据
 */
function getActiveRegistryDir(): string {
    const userIndexPath = join(USER_REGISTRY_DIR, 'index.yaml');
    if (existsSync(userIndexPath)) {
        return USER_REGISTRY_DIR;
    }
    return findBuiltinRegistryDir();
}

// ═══════════════════════════════════════════════════════════════════════════
// 缓存
// ═══════════════════════════════════════════════════════════════════════════

let cachedResources: Resource[] | null = null;
let cachedIndexData: IndexData | null = null;
let cachedLocale: LocaleData | null = null;
let cachedSources: SourcesConfig | null = null;

/**
 * 清除内存缓存（update 后调用）
 */
export function clearCache(): void {
    cachedResources = null;
    cachedIndexData = null;
    cachedLocale = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 数据加载
// ═══════════════════════════════════════════════════════════════════════════

export function loadIndexData(): IndexData {
    if (cachedIndexData) return cachedIndexData;

    const registryDir = getActiveRegistryDir();
    const content = readFileSync(join(registryDir, 'index.yaml'), 'utf-8');
    cachedIndexData = parseYaml(content) as IndexData;
    return cachedIndexData;
}

export function loadResources(): Resource[] {
    if (cachedResources) return cachedResources;

    const raw = loadIndexData();
    const resources: Resource[] = [];

    if (raw.skills) {
        for (const s of raw.skills) {
            resources.push({ ...s, type: s.type || 'skill' } as Resource);
        }
    }
    if (raw.rules) resources.push(...raw.rules);
    if (raw.workflows) resources.push(...raw.workflows);

    // 合并用户自定义源的资源
    try {
        const userResources = loadUserSourceResources();
        resources.push(...userResources);
    } catch {
        // 用户源加载失败不影响内置资源
    }

    cachedResources = resources;
    return cachedResources;
}

export function getIndexVersion(): string {
    return loadIndexData().index_version || '0.0.0';
}

export function loadSources(): SourcesConfig {
    if (cachedSources) return cachedSources;

    // sources.yaml 始终从内置读取（不随索引更新）
    const builtinDir = findBuiltinRegistryDir();
    const content = readFileSync(join(builtinDir, 'sources.yaml'), 'utf-8');
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

    // 尝试用户数据
    const userLocalePath = join(USER_REGISTRY_DIR, 'i18n', `${locale}.yaml`);
    if (existsSync(userLocalePath)) {
        try {
            const content = readFileSync(userLocalePath, 'utf-8');
            const raw = parseYaml(content) as RawLocale;
            cachedLocale = {
                locale: raw.locale,
                name: raw.name,
                resources: raw.resources || raw.skills || {},
                ui: raw.ui,
            };
            return cachedLocale;
        } catch {
            // fallthrough to builtin
        }
    }

    // 回退到内置
    try {
        const builtinDir = findBuiltinRegistryDir();
        const content = readFileSync(join(builtinDir, 'i18n', `${locale}.yaml`), 'utf-8');
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

// ═══════════════════════════════════════════════════════════════════════════
// 搜索与查询
// ═══════════════════════════════════════════════════════════════════════════

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
    const pathId = tryGetIdFromPath(resource.path, resource.source);
    const localized =
        locale?.resources[resource.source]?.[resource.id] ||
        (pathId ? locale?.resources[resource.source]?.[pathId] : undefined);
    if (!localized) return resource;

    return {
        ...resource,
        name: localized.name || resource.name,
        description: localized.description || resource.description,
    };
}

function tryGetIdFromPath(resourcePath: string, source: string): string | null {
    // Expected: "@source/<id>" (id may contain '.' or '-')
    const raw = resourcePath.startsWith('@') ? resourcePath.slice(1) : resourcePath;
    const slashIndex = raw.indexOf('/');
    if (slashIndex <= 0) return null;

    const pathSource = raw.slice(0, slashIndex);
    if (pathSource.toLowerCase() !== source.toLowerCase()) return null;

    const id = raw.slice(slashIndex + 1).trim();
    return id || null;
}

export function getDistributionUrl(): string {
    return loadSources().distribution.primary;
}

export function getResourceRepoUrl(resource: Resource): string {
    const source = loadSources().sources.find((s) => s.id === resource.source);
    return source?.repo || '';
}

