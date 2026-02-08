import type { InstallResult } from './screenState.js';

interface BuildInstallResultInput {
    successCount: number;
    failCount: number;
    installedNames: Set<string>;
    compatNotes: Set<string>;
    targetApps: string[];
}

export function createInstallResult(input: BuildInstallResultInput): InstallResult {
    return {
        successCount: input.successCount,
        failCount: input.failCount,
        installedNames: Array.from(input.installedNames),
        compatNotes: Array.from(input.compatNotes),
        targetApps: input.targetApps,
    };
}

