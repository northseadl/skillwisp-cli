/**
 * Git 操作辅助
 *
 * 封装 execFileSync('git', ...) 的统一调用、错误格式化
 */

import { execFileSync } from 'node:child_process';

/**
 * 同步执行 git 命令，返回 stdout 文本
 *
 * 自动禁用 GIT_TERMINAL_PROMPT，统一错误格式
 */
export function runGit(
    args: string[],
    options: { cwd?: string } = {}
): string {
    try {
        const result = execFileSync('git', args, {
            cwd: options.cwd,
            stdio: 'pipe',
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
            },
        });
        return toText(result);
    } catch (error) {
        throw new Error(formatGitError(args, error));
    }
}

function formatGitError(args: string[], error: unknown): string {
    const e = error as NodeJS.ErrnoException & { stdout?: unknown; stderr?: unknown };
    if (e.code === 'ENOENT') {
        return 'git is required but was not found in PATH';
    }

    const stdout = toText(e.stdout).trim();
    const stderr = toText(e.stderr).trim();
    const details = stderr || stdout;

    const cmd = `git ${args.join(' ')}`;
    return details ? `${cmd}: ${details}` : `${cmd} failed`;
}

function toText(value: unknown): string {
    if (!value) return '';
    if (value instanceof Uint8Array) {
        return new TextDecoder().decode(value);
    }
    return String(value);
}
