# SkillWisp CLI

SkillWisp 的命令行工具。

[![npm version](https://img.shields.io/npm/v/skillwisp.svg)](https://www.npmjs.com/package/skillwisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 安装

```bash
npm install -g skillwisp
```

## 使用

### 交互模式

```bash
skillwisp
```

无参数启动进入交互界面：Browse → Select → Install。

### 命令行模式

```bash
skillwisp search pdf             # 搜索
skillwisp install @anthropic/pdf # 安装
skillwisp list                   # 查看已安装
skillwisp info @anthropic/pdf    # 查看详情
```

## 命令参考

### search

搜索资源。

```bash
skillwisp search <关键词>
skillwisp s pdf                  # 别名
skillwisp find document          # 别名
```

| 参数 | 说明 |
|------|------|
| `-t, --type <type>` | 过滤类型 (skill/rule/workflow) |
| `--json` | JSON 输出 |
| `--page <n>` | 页码 |
| `--all` | 显示全部（禁用分页） |

### install

安装资源。

```bash
skillwisp install <资源ID>
skillwisp i @anthropic/pdf       # 别名
skillwisp add docx -g            # 别名，全局安装
```

| 参数 | 说明 |
|------|------|
| `-g, --global` | 全局安装（安装到 ~/） |
| `--target <app>` | 指定目标 App |
| `--dry-run` | 预览安装路径 |
| `-f, --force` | 强制覆盖 |
| `-r, --rule` | 安装为 Rule |
| `-w, --workflow` | 安装为 Workflow |

### list

查看已安装资源。

```bash
skillwisp list
skillwisp ls -v                  # 显示路径
```

| 参数 | 说明 |
|------|------|
| `-v, --verbose` | 按 App 分组，显示路径 |
| `--json` | JSON 输出 |

### info

查看资源详情。

```bash
skillwisp info @anthropic/pdf
skillwisp show docx --installed  # 显示安装状态
```

| 参数 | 说明 |
|------|------|
| `--installed` | 显示安装状态 |
| `--json` | JSON 输出 |

### config

管理配置。

```bash
skillwisp config                 # 交互式
skillwisp config --json          # 输出当前配置
skillwisp config reset           # 重置
```

## 支持的工具

| 工具 | 目录 |
|------|------|
| Claude Code | `.claude` |
| Cursor | `.cursor` |
| Gemini | `.gemini` |
| Codex | `.codex` |
| GitHub Copilot | `.github` |
| Windsurf | `.windsurf` |
| Trae | `.trae` |
| Kiro | `.kiro` |
| Augment | `.augment` |

## 退出码

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 2 | 参数错误 |
| 3 | 资源未找到 |
| 4 | 网络错误 |
| 5 | 文件系统错误 |

## Skills 索引

完整 Skills 列表请查看主仓库：[SkillWisp](https://gitcode.com/norix77/skillwisp)

## License

MIT
