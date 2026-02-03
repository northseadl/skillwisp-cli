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

| ID | 名称 | 目录 |
|----|------|------|
| claude | Claude Code | `.claude` |
| cursor | Cursor | `.cursor` |
| gemini | Gemini | `.gemini` |
| codex | Codex | `.codex` |
| copilot | GitHub Copilot | `.github` |
| trae | Trae | `.trae` |
| windsurf | Windsurf | `.windsurf` |
| kiro | Kiro | `.kiro` |
| augment | Augment | `.augment` |

## 安装策略

- 主源 `.agent` 存储实际文件
- 其他 App 通过符号链接指向主源
- Windows 或 `--no-symlink` 时复制文件

## 退出码

| 码 | 含义 |
|----|------|
| 0 | 成功 |
| 2 | 参数错误 |
| 3 | 资源未找到 |
| 4 | 网络错误 |
| 5 | 文件系统错误 |
