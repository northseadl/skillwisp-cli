import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, vi } from 'vitest';

const TEST_HOME = process.env.SKILLWISP_TEST_HOME || process.env.HOME;
if (!TEST_HOME) {
    throw new Error('Missing SKILLWISP_TEST_HOME/HOME for test environment');
}

const TEST_CWD = join(TEST_HOME, 'workspace');

// Ensure a clean workspace + user data for each test file
rmSync(TEST_CWD, { recursive: true, force: true });
rmSync(join(TEST_HOME, '.agent'), { recursive: true, force: true });
rmSync(join(TEST_HOME, '.agents'), { recursive: true, force: true });
mkdirSync(TEST_CWD, { recursive: true });

const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(TEST_CWD);

afterAll(() => {
    cwdSpy.mockRestore();
    rmSync(TEST_CWD, { recursive: true, force: true });
});
