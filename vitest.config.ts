import { defineConfig } from 'vitest/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_HOME = mkdtempSync(join(tmpdir(), 'skillwisp-vitest-home-'));
process.env.HOME = TEST_HOME;
process.env.USERPROFILE = TEST_HOME;
process.env.SKILLWISP_TEST_HOME = TEST_HOME;

export default defineConfig({
    test: {
        pool: 'forks',
        maxConcurrency: 1,
        fileParallelism: false,
        setupFiles: ['test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: [
                'src/index.ts',
                'src/commands/interactive.ts',
                'src/ink/**',
                'src/ui/theme.ts',
            ],
            thresholds: {
                lines: 80,
                statements: 80,
                functions: 80,
                branches: 70,
            },
        },
    },
});
