/**
 * skillwisp update
 *
 * 手动触发索引更新
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';

import { getIndexVersion, clearCache } from '../core/registry.js';
import { updateIndex, checkIndexUpdate } from '../core/updater.js';
import { CLI_VERSION, checkCliUpdate, shouldPromptCliUpdate } from '../core/version.js';

export async function update(): Promise<void> {
    const s = p.spinner();

    // 显示当前版本
    p.log.info(`CLI 版本: ${pc.cyan(CLI_VERSION)}`);
    p.log.info(`索引版本: ${pc.cyan(getIndexVersion())}`);

    s.start('正在检查更新...');

    // 检查索引更新
    const checkResult = await checkIndexUpdate();

    if (!checkResult.available) {
        s.stop('索引已是最新版本');
        await checkAndPromptCliUpdate();
        return;
    }

    // 检查是否需要升级 CLI
    if (checkResult.requiresCliUpgrade) {
        s.stop('需要升级 CLI');
        p.log.warn(
            `远程索引 ${pc.green(checkResult.remoteVersion)} 需要 CLI >= ${pc.cyan(checkResult.minCliVersion)}\n` +
            `当前 CLI 版本: ${pc.yellow(CLI_VERSION)}\n` +
            `运行 ${pc.cyan('npm install -g skillwisp')} 升级后重试`
        );
        return;
    }

    // 执行更新
    s.message(`发现新版本: ${checkResult.currentVersion} → ${checkResult.remoteVersion}`);

    const result = await updateIndex();

    if (!result.success) {
        s.stop('更新失败');
        p.log.error(result.error || 'Unknown error');
        return;
    }

    // 清除缓存，确保后续命令使用新数据
    clearCache();

    s.stop(`✓ 索引已更新到 ${pc.green(result.version)}`);

    // 检查 CLI 更新
    await checkAndPromptCliUpdate();
}

async function checkAndPromptCliUpdate(): Promise<void> {
    const cliInfo = await checkCliUpdate();

    if (shouldPromptCliUpdate(cliInfo)) {
        console.log('');
        p.log.info(
            `📦 CLI 新版本 ${pc.green(`v${cliInfo.latest}`)} 可用\n` +
            `   运行 ${pc.cyan('npm install -g skillwisp')} 更新`
        );
    }
}
