import type { TargetSort } from '../../core/agents.js';
import type { Resource, ResourceType } from '../../core/types.js';

export type Screen =
    | 'language-select'
    | 'main-menu'
    | 'browse-search'
    | 'browse-category'
    | 'browse-select'
    | 'install-scope'
    | 'install-targets-sort'
    | 'install-targets'
    | 'installing'
    | 'install-complete'
    | 'quick-install'
    | 'quick-install-select'
    | 'installed-list'
    | 'manage-actions'
    | 'manage-confirm'
    | 'manage-result'
    | 'help';

export type InstallScope = 'local' | 'global';

export interface InstalledItem {
    id: string;
    type: ResourceType;
    scope: InstallScope;
}

export interface InstallResult {
    successCount: number;
    failCount: number;
    installedNames: string[];
    targetApps: string[];
    compatNotes?: string[];
}

export interface AppState {
    screen: Screen;
    searchQuery: string;
    searchResults: Resource[];
    selectedResources: string[];
    installScope: InstallScope;
    targetSort: TargetSort;
    selectedTargets: string[];
    installResult: InstallResult | null;
    installedItems: InstalledItem[];
    hint: string;
    isInstalling: boolean;
    managedItem: InstalledItem | null;
    manageMessage: string;
}

