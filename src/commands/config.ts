/**
 * config 命令
 *
 * 管理偏好设置
 * - 交互模式：选择配置项
 * - 命令行模式：get/set/reset
 */

import * as p from '@clack/prompts';

import { detectApps, getAppsByIds, PRIMARY_SOURCE, ALL_APPS } from '../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, resetPreferences, loadPreferences } from '../core/preferences.js';
import { colors, symbols } from '../ui/theme.js';

interface ConfigOptions {
    json?: boolean;
}

export async function config(subcommand?: string, options: ConfigOptions = {}): Promise<void> {
    const isTTY = Boolean(process.stdout.isTTY);

    // 非交互模式：get/set/reset
    if (subcommand) {
        return handleSubcommand(subcommand, options);
    }

    // --json 或非 TTY 且无子命令：输出当前配置
    if (options.json || !isTTY) {
        return showConfig(options);
    }

    // 交互模式
    console.log();
    console.log(colors.bold('Configuration'));
    console.log();

    const prefs = loadPreferences();
    const detectedApps = detectApps();

    // 显示当前配置
    console.log(colors.muted('Current settings:'));
    if (prefs.defaultAgents?.length) {
        const names = getAppsByIds(prefs.defaultAgents).map((a) => a.name);
        console.log(`  Default targets: ${names.join(', ')}`);
    } else {
        console.log(`  Default targets: ${colors.muted('(auto-detect)')}`);
    }
    console.log();

    // 选择操作
    const action = await p.select({
        message: 'What would you like to configure?',
        options: [
            { value: 'targets' as const, label: 'Default installation targets' },
            { value: 'reset' as const, label: 'Reset all preferences' },
            { value: 'exit' as const, label: 'Exit' },
        ],
    });

    if (p.isCancel(action) || action === 'exit') {
        return;
    }

    if (action === 'reset') {
        const confirm = await p.confirm({
            message: 'Reset all preferences?',
            initialValue: false,
        });

        if (!p.isCancel(confirm) && confirm) {
            resetPreferences();
            console.log();
            console.log(colors.success(`${symbols.success} Preferences reset`));
            console.log();
        }
        return;
    }

    if (action === 'targets') {
        const existingDefault = getDefaultAgents();
        const initialValues = existingDefault?.length
            ? existingDefault
            : detectedApps.map((a) => a.id);

        const selected = await p.multiselect({
            message: 'Select default installation targets',
            options: [
                { value: PRIMARY_SOURCE.id, label: PRIMARY_SOURCE.name, hint: 'Primary source (.agent)' },
                ...detectedApps.map((a) => ({
                    value: a.id,
                    label: a.name,
                    hint: a.baseDir,
                })),
            ],
            required: true,
            initialValues,
        });

        if (!p.isCancel(selected)) {
            saveDefaultAgents(selected as string[]);
            const names = getAppsByIds(selected as string[]).map((a) => a.name);
            console.log();
            console.log(colors.success(`${symbols.success} Default targets saved: ${names.join(', ')}`));
            console.log();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 子命令处理
// ═══════════════════════════════════════════════════════════════════════════

async function handleSubcommand(subcommand: string, options: ConfigOptions): Promise<void> {
    const parts = subcommand.split(' ');
    const cmd = parts[0];
    const key = parts[1];
    const value = parts.slice(2).join(' ');

    switch (cmd) {
        case 'get':
            return handleGet(key, options);
        case 'set':
            return handleSet(key, value, options);
        case 'reset':
            resetPreferences();
            if (!options.json) {
                console.log(colors.success(`${symbols.success} Preferences reset`));
            }
            return;
        default:
            return showConfig(options);
    }
}

async function handleGet(key: string | undefined, options: ConfigOptions): Promise<void> {
    const prefs = loadPreferences();

    if (key === 'defaultTargets' || key === 'targets') {
        const apps = prefs.defaultAgents || [];
        if (options.json) {
            console.log(JSON.stringify({ defaultTargets: apps }));
        } else {
            console.log(apps.join(','));
        }
        return;
    }

    // 显示全部
    return showConfig(options);
}

async function handleSet(key: string | undefined, value: string, options: ConfigOptions): Promise<void> {
    if ((key === 'defaultTargets' || key === 'targets') && value) {
        const appIds = value.split(',').map((s) => s.trim());
        const valid = appIds.filter((id) => ALL_APPS.some((a) => a.id === id));

        if (valid.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No valid app IDs' }));
            } else {
                console.error(colors.error(`${symbols.error} No valid app IDs`));
                console.error(colors.muted(`  Available: ${ALL_APPS.map((a) => a.id).join(', ')}`));
            }
            process.exit(2);
        }

        saveDefaultAgents(valid);

        if (options.json) {
            console.log(JSON.stringify({ success: true, defaultTargets: valid }));
        } else {
            console.log(colors.success(`${symbols.success} Default targets set: ${valid.join(', ')}`));
        }
        return;
    }

    if (options.json) {
        console.log(JSON.stringify({ error: 'Unknown key' }));
    } else {
        console.error(colors.error(`${symbols.error} Unknown key: ${key}`));
        console.error(colors.muted(`  Available: defaultTargets`));
    }
    process.exit(2);
}

async function showConfig(options: ConfigOptions): Promise<void> {
    const prefs = loadPreferences();
    const detected = detectApps();

    if (options.json) {
        console.log(JSON.stringify({
            defaultTargets: prefs.defaultAgents || [],
            detectedApps: detected.map((a) => a.id),
        }, null, 2));
        return;
    }

    console.log();
    console.log(colors.bold('Current Configuration'));
    console.log(colors.muted('─'.repeat(40)));
    console.log();

    if (prefs.defaultAgents?.length) {
        const names = getAppsByIds(prefs.defaultAgents).map((a) => a.name);
        console.log(`  Default targets: ${names.join(', ')}`);
    } else {
        console.log(`  Default targets: ${colors.muted('(auto-detect)')}`);
    }

    console.log();
    console.log(`  Detected apps: ${detected.length > 0 ? detected.map((a) => a.name).join(', ') : colors.muted('none')}`);
    console.log();

    console.log(colors.muted('Commands:'));
    console.log(colors.muted('  skillwisp config                    # Interactive configuration'));
    console.log(colors.muted('  skillwisp config get defaultTargets # Get setting'));
    console.log(colors.muted('  skillwisp config set targets a,b    # Set setting'));
    console.log(colors.muted('  skillwisp config reset              # Reset all'));
    console.log();
}
