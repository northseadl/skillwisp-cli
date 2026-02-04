/**
 * skillwisp update
 *
 * 手动触发索引更新
 */

import { getIndexVersion, clearCache } from '../core/registry.js';
import { updateIndex, checkIndexUpdate } from '../core/updater.js';
import { CLI_VERSION, checkCliUpdate, shouldPromptCliUpdate } from '../core/version.js';
import { colors, symbols, createSpinner } from '../ink/utils/index.js';

export async function update(): Promise<void> {
    const spinner = createSpinner();

    // 显示当前版本
    console.log(`${colors.info(symbols.info)} CLI 版本: ${colors.primary(CLI_VERSION)}`);
    console.log(`${colors.info(symbols.info)} 索引版本: ${colors.primary(getIndexVersion())}`);

    spinner.start('正在检查更新...');

    // 检查索引更新
    const checkResult = await checkIndexUpdate();

    if (!checkResult.available) {
        spinner.stop('索引已是最新版本', 'success');
        await checkAndPromptCliUpdate();
        return;
    }

    // 检查是否需要升级 CLI
    if (checkResult.requiresCliUpgrade) {
        spinner.stop('需要升级 CLI', 'warning');
        console.log(
            colors.warning(`${symbols.warning} 远程索引 ${colors.primary(checkResult.remoteVersion)} 需要 CLI >= ${colors.primary(checkResult.minCliVersion)}`)
        );
        console.log(colors.muted(`  当前 CLI 版本: ${CLI_VERSION}`));
        console.log(colors.muted(`  运行 ${colors.primary('npm install -g skillwisp')} 升级后重试`));
        return;
    }

    // 执行更新
    spinner.update(`发现新版本: ${checkResult.currentVersion} → ${checkResult.remoteVersion}`);

    const result = await updateIndex();

    if (!result.success) {
        spinner.stop('更新失败', 'error');
        console.log(colors.error(`${symbols.error} ${result.error || 'Unknown error'}`));
        return;
    }

    // 清除缓存，确保后续命令使用新数据
    clearCache();

    spinner.stop(`索引已更新到 ${colors.primary(result.version)}`, 'success');

    // 检查 CLI 更新
    await checkAndPromptCliUpdate();
}

async function checkAndPromptCliUpdate(): Promise<void> {
    const cliInfo = await checkCliUpdate();

    if (shouldPromptCliUpdate(cliInfo)) {
        console.log();
        console.log(`${colors.info(symbols.info)} CLI 新版本 ${colors.primary(`v${cliInfo.latest}`)} 可用`);
        console.log(colors.muted(`  运行 ${colors.primary('npm install -g skillwisp')} 更新`));
    }
}
