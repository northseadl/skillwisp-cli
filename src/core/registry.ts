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
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { parse as parseYaml } from 'yaml';

import type { Resource, ResourceType, LocaleData, SourcesConfig, IndexData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// 路径定义
// ═══════════════════════════════════════════════════════════════════════════

const USER_REGISTRY_DIR = join(homedir(), '.agents', '.skillwisp', 'cache');

function findBuiltinRegistryDir(): string {
    // 打包环境: dist/../registry = skillwisp-cli/registry
    const distPath = join(__dirname, '../registry');
    if (existsSync(distPath)) return distPath;

    // 开发环境 (unbundled): src/core/../../registry
    const devPath = join(__dirname, '../../registry');
    if (existsSync(devPath)) return devPath;

    throw new Error('Built-in registry directory not found');
}

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

// ═══════════════════════════════════════════════════════════════════════════
// 导出路径常量（供 updater 使用）
// ═══════════════════════════════════════════════════════════════════════════

export { USER_REGISTRY_DIR, findBuiltinRegistryDir };
