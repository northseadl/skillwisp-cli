/**
 * config 命令
 *
 * 管理偏好设置
 * - 交互模式：使用 Ink 流程
 * - 命令行模式：get/set/reset
 */

import { detectApps, getAppsByIds, ALL_APPS } from '../core/agents.js';
import { getDefaultAgents, saveDefaultAgents, resetPreferences, loadPreferences } from '../core/preferences.js';
import { colors, symbols } from '../ink/utils/index.js';
import { runConfigFlow } from '../ink/flows/index.js';

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

    // 交互模式：使用 Ink 流程
    await runConfigFlow();
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
