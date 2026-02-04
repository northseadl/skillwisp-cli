import { vi } from 'vitest';

export function captureConsole(): {
    logs: string[];
    errors: string[];
    restore: () => void;
} {
    const logs: string[] = [];
    const errors: string[] = [];

    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
    });

    return {
        logs,
        errors,
        restore: () => {
            logSpy.mockRestore();
            errorSpy.mockRestore();
        },
    };
}

export function mockProcessExit(): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 'undefined'}`);
    }) as never);
}

