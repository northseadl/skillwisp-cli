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

const program = new Command();

// 初始化 i18n（让非交互命令也尊重用户语言偏好）
initI18n();

program
    .name('skillwisp')
    .description('Developer tool integrations installer')
    .version(CLI_VERSION)
    .option('--offline', 'Skip all network operations');

// ═══════════════════════════════════════════════════════════════════════════
// 交互模式（默认入口）- 使用 Ink 渲染
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
    .option('--target <target>', 'Target integration (use supported app IDs)')
    .option('--no-symlink', 'Disable symlinks (force copy)')
    .option('-v, --verbose', 'Show installation paths')
    .option('--json', 'JSON output')
    .option('-q, --quiet', 'Quiet mode')
    .option('--dry-run', 'Show what would be installed without doing it')
    .option('-y, --yes', 'Use defaults and skip prompts')
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
    .command('config [sub] [args...]')
    .description('Manage configuration (interactive or get/set/reset)')
    .option('--json', 'JSON output')
    .action(config);

// ═══════════════════════════════════════════════════════════════════════════
// uninstall：卸载资源
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('uninstall <resource>')
    .alias('rm')
    .alias('remove')
    .description('Uninstall a resource')
    .option('-t, --type <type>', 'Resource type (skill/rule/workflow)', 'skill')
    .option('-g, --global', 'Uninstall from global directory only')
    .option('-l, --local', 'Uninstall from local directory only')
    .option('--json', 'JSON output')
    .option('-q, --quiet', 'Quiet mode')
    .option('-f, --force', 'Skip confirmation')
    .action(uninstall);

// ═══════════════════════════════════════════════════════════════════════════
// manage：管理已安装资源
// ═══════════════════════════════════════════════════════════════════════════

program
    .command('manage')
    .alias('mg')
    .description('Manage installed resources')
    .option('-t, --type <type>', 'Filter by type (skill/rule/workflow)')
    .option('-s, --scope <scope>', 'Filter by scope (local/global)')
    .option('--json', 'JSON output')
    .action(manage);

// ═════════════════════════════════════════════════════════════════════════════
// update：更新索引
// ═════════════════════════════════════════════════════════════════════════════

program
    .command('update')
    .alias('up')
    .description('Update the skills index from remote')
    .action(update);

// ═══════════════════════════════════════════════════════════════════════════
// source：管理 GitHub 资源源
// ═══════════════════════════════════════════════════════════════════════════

const sourceCmd = program
    .command('source')
    .alias('src')
    .description('Manage GitHub resource sources');

sourceCmd
    .command('add <repo-url>')
    .description('Add a GitHub repository as resource source')
    .option('--json', 'JSON output')
    .action(sourceAdd);

sourceCmd
    .command('list')
    .alias('ls')
    .description('List all custom sources')
    .option('--json', 'JSON output')
    .action(sourceList);

sourceCmd
    .command('sync [source-id]')
    .description('Sync resource index from source repositories')
    .option('--json', 'JSON output')
    .action(sourceSync);

sourceCmd
    .command('remove <source-id>')
    .alias('rm')
    .description('Remove a custom source')
    .option('--json', 'JSON output')
    .action(sourceRemove);

// ═══════════════════════════════════════════════════════════════════════════
// 无参数时进入交互模式
// ═══════════════════════════════════════════════════════════════════════════

if (process.argv.length === 2) {
    main();
} else {
    program.parse();
}
