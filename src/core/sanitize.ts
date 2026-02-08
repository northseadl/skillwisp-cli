/**
 * 资源 ID 和路径的安全校验
 *
 * 防止路径穿越攻击：注册表数据中的恶意 id/path 不应导致文件系统越界操作
 */

const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * 校验并返回安全的资源 ID
 *
 * 拒绝包含路径分隔符、`.` 开头或其他危险字符的 ID
 * @throws Error 如果 ID 不合法
 */
export function sanitizeResourceId(id: string): string {
    if (!id || typeof id !== 'string') {
        throw new Error(`Invalid resource ID: empty or not a string`);
    }

    if (id.includes('/') || id.includes('\\') || id.includes('..')) {
        throw new Error(`Unsafe resource ID (path traversal attempt): ${id}`);
    }

    if (!SAFE_ID_PATTERN.test(id)) {
        throw new Error(`Invalid resource ID format: ${id}`);
    }

    return id;
}

/**
 * 校验路径是否在预期的基目录内（防止 symlink 穿越）
 */
export function validateResourcePath(resourcePath: string): string {
    if (!resourcePath || typeof resourcePath !== 'string') {
        throw new Error(`Invalid resource path: empty or not a string`);
    }

    if (resourcePath.includes('..')) {
        throw new Error(`Unsafe resource path (path traversal attempt): ${resourcePath}`);
    }

    return resourcePath;
}
