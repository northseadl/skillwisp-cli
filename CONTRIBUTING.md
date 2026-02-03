# Contributing

感谢你对 SkillWisp 的关注！

## 贡献 Skills

1. Fork [skillwisp](https://gitcode.com/norix77/skillwisp) 仓库
2. 在 `skills/` 目录下创建你的 Skill
3. 提交 Pull Request

### Skill 格式

```
skills/
└── your-skill/
    └── SKILL.md
```

SKILL.md 格式：

```markdown
---
name: your-skill
description: 一句话描述
author: @yourname
version: 1.0.0
tags: [tag1, tag2]
---

# Skill 内容

详细说明...
```

## 贡献代码

1. Fork 本仓库
2. 创建分支 `git checkout -b feature/xxx`
3. 提交更改 `git commit -m 'feat: xxx'`
4. 推送分支 `git push origin feature/xxx`
5. 提交 Pull Request

## 代码规范

- 无注释代码
- 无 TODO
- 函数不超过 50 行
- 参数不超过 5 个
