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

以下目录以各工具官方文档为准（如有差异，以官方文档为主）。

| 工具 | Project 目录 | Global 目录 |
|---|---|---|
| AdaL | `.adal/skills/` | `~/.adal/skills/` |
| Amp | `.agents/skills/` | `~/.config/agents/skills/` |
| Antigravity | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| Augment Code | `.augment/skills/` | `~/.augment/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Cline | `.cline/skills/` | `~/.cline/skills/` |
| CodeBuddy | `.codebuddy/skills/` | `~/.codebuddy/skills/` |
| Codex | `.agents/skills/` | `~/.codex/skills/` |
| Command Code | `.commandcode/skills/` | `~/.commandcode/skills/` |
| Continue | `.continue/skills/` | `~/.continue/skills/` |
| Crush | `.crush/skills/` | `~/.config/crush/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Droid | `.factory/skills/` | `~/.factory/skills/` |
| Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| Goose | `.goose/skills/` | `~/.config/goose/skills/` |
| iFlow CLI | `.iflow/skills/` | `~/.iflow/skills/` |
| Junie | `.junie/skills/` | `~/.junie/skills/` |
| Kilo Code | `.kilocode/skills/` | `~/.kilocode/skills/` |
| Kimi Code | `.agents/skills/` | `~/.config/agents/skills/` |
| Kode | `.kode/skills/` | `~/.kode/skills/` |
| Krio | `.kiro/skills/` | `~/.kiro/skills/` |
| MCPJam | `.mcpjam/skills/` | `~/.mcpjam/skills/` |
| Mistral Vibe | `.vibe/skills/` | `~/.vibe/skills/` |
| Mux | `.mux/skills/` | `~/.mux/skills/` |
| Neovate | `.neovate/skills/` | `~/.neovate/skills/` |
| OpenClaw | `skills/` | `~/.moltbot/skills/` |
| OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| OpenHands | `.openhands/skills/` | `~/.openhands/skills/` |
| Pi | `.pi/skills/` | `~/.pi/agent/skills/` |
| Pochi | `.pochi/skills/` | `~/.pochi/skills/` |
| Qoder | `.qoder/skills/` | `~/.qoder/skills/` |
| Qwen Code | `.qwen/skills/` | `~/.qwen/skills/` |
| Replit | `.agents/skills/` | `-` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Trae | `.trae/skills/` | `~/.trae/skills/` |
| Trae CN | `.trae-cn/skills/` | `~/.trae-cn/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Zencoder | `.zencoder/skills/` | `~/.zencoder/skills/` |

说明：

- `.agents` 不是官方目录表的一部分，为 SkillWisp 内部主源策略。
- 安装时会先写入 `.agents/skills/`，再为其他工具目录创建符号链接（或复制）。
- 对于官方 Project 目录就是 `.agents/skills/` 的工具，会直接复用主源目录并提示兼容，无需单独安装。
- Augment Code 官方文档将技能目录设为 `.augment/skills/`，并兼容读取 `.claude/skills/`。
- Krio 安装后需手动将 `skill://.kiro/skills/**/SKILL.md` 添加到 `.kiro/agents/<agent>.json` 的 resources。

## 退出码

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 2 | 参数错误 |
| 3 | 资源未找到 |
| 4 | 网络错误 |
| 5 | 文件系统错误 |

## Skills 索引

完整 Skills 列表请查看主仓库：[SkillWisp](https://github.com/northseadl/skillwisp)

## 镜像

- **GitHub**: [northseadl/skillwisp-cli](https://github.com/northseadl/skillwisp-cli)
- **GitCode**: [norix77/skillwisp-cli](https://gitcode.com/norix77/skillwisp-cli)

## License

MIT
