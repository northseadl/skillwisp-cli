#!/usr/bin/env node
/**
 * SkillWisp CLI
 *
 * Developer tool integrations installer
 *
 * v2.0 Design:
 * - Terminal App first (interactive by default)
 * - Developer-friendly CLI contract (--json, exit codes, stdout/stderr separation)
 * - Stable, composable commands
 */

import { Command } from 'commander';

import { main } from './commands/interactive.js';
import { install } from './commands/install.js';
import { search, catalog } from './commands/search.js';
import { list } from './commands/list.js';
import { info } from './commands/info.js';
import { config } from './commands/config.js';

const VERSION = '0.2.0';

const program = new Command();

program
    .name('skillwisp')
    .description('Developer tool integrations installer')
    .version(VERSION);

// ═══════════════════════════════════════════════════════════════════════════
// 交互模式（默认入口）
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('start', { isDefault: true, hidden: true })
    .description('Start interactive mode')
    .action(main);

// ═══════════════════════════════════════════════════════════════════════════
// search：搜索资源（query 必填）
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('search <query>')
    .alias('s')
    .alias('find')
    .description('Search available resources')
    .option('-t, --type <type>', 'Filter by type (skill/rule/workflow)')
    .option('--compact', 'Compact output (id + name only)')
    .option('-v, --verbose', 'Verbose output (all fields)')
    .option('--json', 'JSON output for scripting')
    .option('-q, --quiet', 'Quiet mode (ids only)')
    .option('--page <n>', 'Page number (TTY only)')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--all', 'Show all results (disable pagination)')
    .action(search);

// ═══════════════════════════════════════════════════════════════════════════
// catalog：列出全部资源
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('catalog')
    .description('List all available resources')
    .option('-t, --type <type>', 'Filter by type (skill/rule/workflow)')
    .option('--compact', 'Compact output')
    .option('-v, --verbose', 'Verbose output')
    .option('--json', 'JSON output')
    .option('-q, --quiet', 'Quiet mode (ids only)')
    .option('--page <n>', 'Page number')
    .option('--per-page <n>', 'Results per page', '20')
    .option('--all', 'Show all results')
    .action(catalog);

// ═══════════════════════════════════════════════════════════════════════════
// install：安装资源
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('install <resource>')
    .alias('i')
    .alias('add')
    .description('Install a resource')
    .option('-t, --type <type>', 'Resource type (skill/rule/workflow)', 'skill')
    .option('-g, --global', 'Install to global directory')
    .option('--target <target>', 'Target integration (claude/cursor/gemini/codex/copilot/trae/windsurf/kiro/augment)')
    .option('--no-symlink', 'Disable symlinks (force copy)')
    .option('-v, --verbose', 'Show installation paths')
    .option('--json', 'JSON output')
    .option('-q, --quiet', 'Quiet mode')
    .option('--dry-run', 'Show what would be installed without doing it')
    .option('-f, --force', 'Overwrite if already exists')
    // 兼容快捷选项
    .option('-r, --rule', 'Install as rule (shorthand for --type rule)')
    .option('-w, --workflow', 'Install as workflow (shorthand for --type workflow)')
    .action(install);

// ═══════════════════════════════════════════════════════════════════════════
// list：列出已安装资源
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('list')
    .alias('ls')
    .description('List installed resources')
    .option('-v, --verbose', 'Show paths and grouping by target')
    .option('--json', 'JSON output')
    .option('-q, --quiet', 'Quiet mode (ids only)')
    .action(list);

// ═══════════════════════════════════════════════════════════════════════════
// info：查看资源详情
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('info <resource>')
    .alias('show')
    .description('Show resource details')
    .option('-t, --type <type>', 'Resource type (skill/rule/workflow)')
    .option('--json', 'JSON output')
    .option('--installed', 'Show installation status')
    .action(info);

// ═══════════════════════════════════════════════════════════════════════════
// config：管理配置
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('config [subcommand]')
    .description('Manage configuration (interactive or get/set/reset)')
    .option('--json', 'JSON output')
    .action(config);

// ═══════════════════════════════════════════════════════════════════════════
// 无参数时进入交互模式
// ═══════════════════════════════════════════════════════════════════════════

if (process.argv.length === 2) {
    main();
} else {
    program.parse();
}
