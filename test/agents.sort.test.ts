import { describe, it, expect } from 'vitest';
import { getAppById, sortTargetApps } from '../src/core/agents.js';

describe('sortTargetApps', () => {
    it('sorts by default popularity order', () => {
        const claude = getAppById('claude-code')!;
        const codex = getAppById('codex')!;
        const cursor = getAppById('cursor')!;
        const windsurf = getAppById('windsurf')!;

        const sorted = sortTargetApps([cursor, windsurf, codex, claude], 'default').map((a) => a.id);
        expect(sorted).toEqual(['claude-code', 'codex', 'cursor', 'windsurf']);
    });

    it('sorts by A-Z name order', () => {
        const copilot = getAppById('github-copilot')!;
        const cursor = getAppById('cursor')!;
        const amp = getAppById('amp')!;

        const sorted = sortTargetApps([cursor, copilot, amp], 'az').map((a) => a.name);
        expect(sorted).toEqual(['Amp', 'Cursor', 'GitHub Copilot']);
    });
});
