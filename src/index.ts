#!/usr/bin/env node
/**
 * SkillWisp CLI
 *
 * Developer tool integrations installer
 */

import { Command } from 'commander';

import { main } from './ink/interactive.js';
import { install } from './commands/install.js';
import { search, catalog } from './commands/search.js';
import { list } from './commands/list.js';
import { info } from './commands/info.js';
import { config } from './commands/config.js';
import { update } from './commands/update.js';
import { uninstall } from './commands/uninstall.js';
import { manage } from './commands/manage.js';
import { sourceAdd, sourceList, sourceSync, sourceRemove } from './commands/source.js';
import { CLI_VERSION } from './core/version.js';
import { initI18n } from './core/i18n.js';

type OptionConfig = {
    flags: string;
    description: string;
    defaultValue?: string | boolean;
};

type CommandConfig = {
    path: string;
    description: string;
    aliases?: string[];
    options?: OptionConfig[];
    action: (...args: any[]) => unknown;
    hidden?: boolean;
    isDefault?: boolean;
};

function applyOptions(command: Command, options?: OptionConfig[]): void {
    if (!options) return;
    for (const option of options) {
        if (option.defaultValue !== undefined) {
            command.option(option.flags, option.description, option.defaultValue as any);
        } else {
            command.option(option.flags, option.description);
        }
    }
}

function registerCommand(program: Command, config: CommandConfig): void {
    const command = program.command(config.path, {
        hidden: config.hidden,
        isDefault: config.isDefault,
    });

    command.description(config.description);

    if (config.aliases) {
        for (const alias of config.aliases) {
            command.alias(alias);
        }
    }

    applyOptions(command, config.options);
    command.action(config.action as any);
}

const program = new Command();

initI18n();

program
    .name('skillwisp')
    .description('Developer tool integrations installer')
    .version(CLI_VERSION)
    .option('--offline', 'Skip all network operations');

registerCommand(program, {
    path: 'start',
    description: 'Start interactive mode',
    isDefault: true,
    hidden: true,
    action: main,
});

registerCommand(program, {
    path: 'search <query>',
    aliases: ['s', 'find'],
    description: 'Search available resources',
    options: [
        { flags: '-t, --type <type>', description: 'Filter by type (skill/rule/workflow)' },
        { flags: '--compact', description: 'Compact output (id + name only)' },
        { flags: '-v, --verbose', description: 'Verbose output (all fields)' },
        { flags: '--json', description: 'JSON output for scripting' },
        { flags: '-q, --quiet', description: 'Quiet mode (ids only)' },
        { flags: '--page <n>', description: 'Page number (TTY only)' },
        { flags: '--per-page <n>', description: 'Results per page', defaultValue: '20' },
        { flags: '--all', description: 'Show all results (disable pagination)' },
    ],
    action: search,
});

registerCommand(program, {
    path: 'catalog',
    description: 'List all available resources',
    options: [
        { flags: '-t, --type <type>', description: 'Filter by type (skill/rule/workflow)' },
        { flags: '--compact', description: 'Compact output' },
        { flags: '-v, --verbose', description: 'Verbose output' },
        { flags: '--json', description: 'JSON output' },
        { flags: '-q, --quiet', description: 'Quiet mode (ids only)' },
        { flags: '--page <n>', description: 'Page number' },
        { flags: '--per-page <n>', description: 'Results per page', defaultValue: '20' },
        { flags: '--all', description: 'Show all results' },
    ],
    action: catalog,
});

registerCommand(program, {
    path: 'install <resource>',
    aliases: ['i', 'add'],
    description: 'Install a resource',
    options: [
        { flags: '-t, --type <type>', description: 'Resource type (skill/rule/workflow)', defaultValue: 'skill' },
        { flags: '-g, --global', description: 'Install to global directory' },
        { flags: '--target <target>', description: 'Target integration (use supported app IDs)' },
        { flags: '--no-symlink', description: 'Disable symlinks (force copy)' },
        { flags: '-v, --verbose', description: 'Show installation paths' },
        { flags: '--json', description: 'JSON output' },
        { flags: '-q, --quiet', description: 'Quiet mode' },
        { flags: '--dry-run', description: 'Show what would be installed without doing it' },
        { flags: '-y, --yes', description: 'Use defaults and skip prompts' },
        { flags: '-f, --force', description: 'Overwrite if already exists' },
        { flags: '-r, --rule', description: 'Install as rule (shorthand for --type rule)' },
        { flags: '-w, --workflow', description: 'Install as workflow (shorthand for --type workflow)' },
    ],
    action: install,
});

registerCommand(program, {
    path: 'list',
    aliases: ['ls'],
    description: 'List installed resources',
    options: [
        { flags: '-v, --verbose', description: 'Show paths and grouping by target' },
        { flags: '--json', description: 'JSON output' },
        { flags: '-q, --quiet', description: 'Quiet mode (ids only)' },
    ],
    action: list,
});

registerCommand(program, {
    path: 'info <resource>',
    aliases: ['show'],
    description: 'Show resource details',
    options: [
        { flags: '-t, --type <type>', description: 'Resource type (skill/rule/workflow)' },
        { flags: '--json', description: 'JSON output' },
        { flags: '--installed', description: 'Show installation status' },
    ],
    action: info,
});

registerCommand(program, {
    path: 'config [sub] [args...]',
    description: 'Manage configuration (interactive or get/set/reset)',
    options: [{ flags: '--json', description: 'JSON output' }],
    action: config,
});

registerCommand(program, {
    path: 'uninstall <resource>',
    aliases: ['rm', 'remove'],
    description: 'Uninstall a resource',
    options: [
        { flags: '-t, --type <type>', description: 'Resource type (skill/rule/workflow)', defaultValue: 'skill' },
        { flags: '-g, --global', description: 'Uninstall from global directory only' },
        { flags: '-l, --local', description: 'Uninstall from local directory only' },
        { flags: '--json', description: 'JSON output' },
        { flags: '-q, --quiet', description: 'Quiet mode' },
        { flags: '-f, --force', description: 'Skip confirmation' },
    ],
    action: uninstall,
});

registerCommand(program, {
    path: 'manage',
    aliases: ['mg'],
    description: 'Manage installed resources',
    options: [
        { flags: '-t, --type <type>', description: 'Filter by type (skill/rule/workflow)' },
        { flags: '-s, --scope <scope>', description: 'Filter by scope (local/global)' },
        { flags: '--json', description: 'JSON output' },
    ],
    action: manage,
});

registerCommand(program, {
    path: 'update',
    aliases: ['up'],
    description: 'Update the skills index from remote',
    action: update,
});

const sourceCmd = program
    .command('source')
    .alias('src')
    .description('Manage GitHub resource sources');

registerCommand(sourceCmd, {
    path: 'add <repo-url>',
    description: 'Add a GitHub repository as resource source',
    options: [{ flags: '--json', description: 'JSON output' }],
    action: sourceAdd,
});

registerCommand(sourceCmd, {
    path: 'list',
    aliases: ['ls'],
    description: 'List all custom sources',
    options: [{ flags: '--json', description: 'JSON output' }],
    action: sourceList,
});

registerCommand(sourceCmd, {
    path: 'sync [source-id]',
    description: 'Sync resource index from source repositories',
    options: [{ flags: '--json', description: 'JSON output' }],
    action: sourceSync,
});

registerCommand(sourceCmd, {
    path: 'remove <source-id>',
    aliases: ['rm'],
    description: 'Remove a custom source',
    options: [{ flags: '--json', description: 'JSON output' }],
    action: sourceRemove,
});

if (process.argv.length === 2) {
    main();
} else {
    program.parse();
}

