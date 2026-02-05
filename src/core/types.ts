/**
 * 核心类型定义
 */

export type ResourceType = 'skill' | 'rule' | 'workflow';

export const RESOURCE_TYPES: ResourceType[] = ['skill', 'rule', 'workflow'];

export const RESOURCE_CONFIG: Record<ResourceType, {
    label: string;
    plural: string;
    dirName: string;
    entryFile: string;
}> = {
    skill: { label: 'Skill', plural: 'Skills', dirName: 'skills', entryFile: 'SKILL.md' },
    rule: { label: 'Rule', plural: 'Rules', dirName: 'rules', entryFile: 'RULE.md' },
    workflow: { label: 'Workflow', plural: 'Workflows', dirName: 'workflows', entryFile: 'WORKFLOW.md' },
};

export interface Resource {
    id: string;
    type: ResourceType;
    source: string;
    path: string;
    name: string;
    description: string;
    tags?: string[];
    lastUpdated?: string;
    commitHash?: string;
}

export interface RegistryIndex {
    version: string;
    updated: string;
    resources: Resource[];
}

export interface Source {
    id: string;
    name: string;
    repo: string;
    path: string;
    prefix: string;
}

export interface SourcesConfig {
    sources: Source[];
    distribution: {
        primary: string;
        mirrors: string[];
    };
    sync: {
        autoUpdate: boolean;
        checkInterval: number;
    };
}

export interface LocaleData {
    locale: string;
    name: string;
    resources: Record<string, Record<string, { name: string; description: string }>>; // {source}.{id}
    ui: Record<string, string>;
}

export interface UserPreferences {
    version: number;
    locale?: string;
    defaultAgents?: string[];
    defaultResourceType?: ResourceType;
    lastUpdated?: string;
    /** 是否启用自动更新 */
    autoUpdate?: boolean;
    /** 检测间隔（小时） */
    checkInterval?: number;
    /** 强制使用的镜像 */
    preferredMirror?: string;
}

/**
 * 索引数据结构
 */
export interface IndexData {
    index_version: string;
    min_cli_version?: string;
    updated: string;
    skills?: Array<Omit<Resource, 'type'> & { type?: ResourceType }>;
    rules?: Resource[];
    workflows?: Resource[];
}

/**
 * 更新元信息
 */
export interface UpdateMeta {
    lastCheck: number;
    indexVersion: string;
    bestMirror?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 安装相关类型 (统一定义)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 安装范围
 */
export type InstallScope = 'local' | 'global';

/**
 * 已安装资源信息
 */
export interface InstalledResource {
    id: string;
    type: ResourceType;
    name?: string;
    scope: InstallScope;
    agent?: string;
    path?: string;
    isLink?: boolean;
}

/**
 * 安装结果摘要
 */
export interface InstallSummary {
    successCount: number;
    failCount: number;
    installedNames: string[];
    targetApps: string[];
}

