# 使用指南

## 交互模式

```bash
skillwisp
```

无参数启动进入交互界面：Browse → Select → Install。

## 命令

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

### catalog

浏览全部资源。

```bash
skillwisp catalog
skillwisp catalog --type skill
```

参数同 `search`。

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

## 支持的 App

| ID | 名称 | Project 目录 | Global 目录 |
|---|---|---|---|
| `adal` | AdaL | `.adal/skills/` | `~/.adal/skills/` |
| `amp` | Amp | `.agents/skills/` | `~/.config/agents/skills/` |
| `antigravity` | Antigravity | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| `augment` | Augment | `.augment/skills/` | `~/.augment/skills/` |
| `claude-code` | Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| `cline` | Cline | `.cline/skills/` | `~/.cline/skills/` |
| `codebuddy` | CodeBuddy | `.codebuddy/skills/` | `~/.codebuddy/skills/` |
| `codex` | Codex | `.agents/skills/` | `~/.codex/skills/` |
| `command-code` | Command Code | `.commandcode/skills/` | `~/.commandcode/skills/` |
| `continue` | Continue | `.continue/skills/` | `~/.continue/skills/` |
| `crush` | Crush | `.crush/skills/` | `~/.config/crush/skills/` |
| `cursor` | Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| `droid` | Droid | `.factory/skills/` | `~/.factory/skills/` |
| `gemini-cli` | Gemini CLI | `.agents/skills/` | `~/.gemini/skills/` |
| `github-copilot` | GitHub Copilot | `.agents/skills/` | `~/.copilot/skills/` |
| `goose` | Goose | `.goose/skills/` | `~/.config/goose/skills/` |
| `iflow-cli` | iFlow CLI | `.iflow/skills/` | `~/.iflow/skills/` |
| `junie` | Junie | `.junie/skills/` | `~/.junie/skills/` |
| `kilo` | Kilo Code | `.kilocode/skills/` | `~/.kilocode/skills/` |
| `kimi-cli` | Kimi Code | `.agents/skills/` | `~/.config/agents/skills/` |
| `kode` | Kode | `.kode/skills/` | `~/.kode/skills/` |
| `krio` | Krio | `.kiro/skills/` | `~/.kiro/skills/` |
| `mcpjam` | MCPJam | `.mcpjam/skills/` | `~/.mcpjam/skills/` |
| `mistral-vibe` | Mistral Vibe | `.vibe/skills/` | `~/.vibe/skills/` |
| `mux` | Mux | `.mux/skills/` | `~/.mux/skills/` |
| `neovate` | Neovate | `.neovate/skills/` | `~/.neovate/skills/` |
| `openclaw` | OpenClaw | `skills/` | `~/.moltbot/skills/` |
| `opencode` | OpenCode | `.agents/skills/` | `~/.config/opencode/skills/` |
| `openhands` | OpenHands | `.openhands/skills/` | `~/.openhands/skills/` |
| `pi` | Pi | `.pi/skills/` | `~/.pi/agent/skills/` |
| `pochi` | Pochi | `.pochi/skills/` | `~/.pochi/skills/` |
| `qoder` | Qoder | `.qoder/skills/` | `~/.qoder/skills/` |
| `qwen-code` | Qwen Code | `.qwen/skills/` | `~/.qwen/skills/` |
| `replit` | Replit | `.agents/skills/` | `-` |
| `roo` | Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| `trae` | Trae | `.trae/skills/` | `~/.trae/skills/` |
| `trae-cn` | Trae CN | `.trae-cn/skills/` | `~/.trae-cn/skills/` |
| `windsurf` | Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| `zencoder` | Zencoder | `.zencoder/skills/` | `~/.zencoder/skills/` |

提示：`--target` 参数使用上表的 ID。

## 安装策略

- 主源 `.agents` 始终保存原始资源目录（内部策略，官方目录表不包含）
- 目录型工具默认用符号链接指向主源；Windows 或 `--no-symlink` 时复制目录
- Augment 使用 `.augment/skills/` 作为 skills 目录，并兼容读取 `.claude/skills/`
- 官方 Project 目录为 `.agents/skills/` 的工具会直接复用主源目录并提示兼容
- Krio 安装后需手动将 `skill://.kiro/skills/**/SKILL.md` 添加到 `.kiro/agents/<agent>.json` 的 resources

## 退出码

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 2 | 参数错误 |
| 3 | 资源未找到 |
| 4 | 网络错误 |
| 5 | 文件系统错误 |
