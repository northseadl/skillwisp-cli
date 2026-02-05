import { describe, it, expect } from 'vitest';
import { getAppById, sortTargetApps } from '../src/core/agents.js';

describe('sortTargetApps', () => {
    it('sorts by default popularity order', () => {
        const copilot = getAppById('github-copilot')!;
        const cursor = getAppById('cursor')!;
        const amp = getAppById('amp')!;

        const sorted = sortTargetApps([amp, cursor, copilot], 'default').map((a) => a.id);
        expect(sorted).toEqual(['github-copilot', 'cursor', 'amp']);
    });

    it('sorts by A-Z name order', () => {
        const copilot = getAppById('github-copilot')!;
        const cursor = getAppById('cursor')!;
        const amp = getAppById('amp')!;

        const sorted = sortTargetApps([cursor, copilot, amp], 'az').map((a) => a.name);
        expect(sorted).toEqual(['Amp', 'Cursor', 'GitHub Copilot']);
    });
});
