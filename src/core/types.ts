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
}
