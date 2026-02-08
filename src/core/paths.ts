/**
 * 项目级路径常量
 *
 * 所有用户数据目录、内置注册表路径的唯一定义
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

/** 用户数据根目录 (~/.agents/.skillwisp/) */
export const USER_DATA_DIR = join(homedir(), '.agents', '.skillwisp');

/** 索引缓存目录 */
export const USER_REGISTRY_DIR = join(USER_DATA_DIR, 'cache');

/** 更新元信息文件 */
export const META_FILE = join(USER_DATA_DIR, 'meta.json');

/** 用户自定义源目录 */
export const SOURCES_DIR = join(USER_DATA_DIR, 'sources');

/** 偏好设置文件 */
export const PREFERENCES_FILE = join(USER_DATA_DIR, 'preferences.json');

/**
 * 定位内置 registry 目录
 *
 * 打包环境: dist/../registry
 * 开发环境: src/core/../../registry
 */
export function findBuiltinRegistryDir(): string {
    const distPath = join(MODULE_DIR, '../registry');
    if (existsSync(distPath)) return distPath;

    const devPath = join(MODULE_DIR, '../../registry');
    if (existsSync(devPath)) return devPath;

    throw new Error('Built-in registry directory not found');
}
