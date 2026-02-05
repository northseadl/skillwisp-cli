/**
 * 终端着色工具 - 向后兼容层
 *
 * 实际实现已提升到 core/terminal.ts
 * 此文件保留以兼容现有 Ink 组件导入
 */

export {
    colors,
    symbols,
    getResourceColor,
    truncate,
    brandLogo,
    createSpinner,
    resultSummary,
    type Spinner,
    type ResultSummaryOptions,
} from '../../core/terminal.js';

