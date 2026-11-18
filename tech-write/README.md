# tech-write

由《技术写作手册》（Thoughtworks 文集，11 篇 + 序言）经 cangjie-skill 的 RIA-TV++ 流水线蒸馏而成的 Agent Skill：1 个来源路由入口 + 13 张可执行能力卡，覆盖技术写作的启动坚持、学习内化、动笔定位、成稿工作流、质量自评、排版规范、发布前审稿脱敏、传播推广、技术翻译、写书工程、工具链、负面反馈与流量焦虑应对。

提供方法论指导而非代写；文学创作、学术论文、纯代写润色不适用。

## 安装

### 方式一：npx（推荐）

在目标项目根目录执行：

```bash
npx --yes github:wnz27/K7s-Arsenal tech-write
```

文件会安装到当前项目的 `.agents/skills/tech-write/`。安装到用户级目录（`~/.agents/skills/`）：

```bash
npx --yes github:wnz27/K7s-Arsenal tech-write --user
```

目标已存在时需显式确认覆盖：

```bash
npx --yes github:wnz27/K7s-Arsenal tech-write --force
```

安装或更新后，在 Kimi Code 中执行 `/reload` 刷新 Skill 列表。

### 方式二：手动复制

本目录即完整的 Skill 包（`SKILL.md` + `references/`），复制到任意支持 Agent Skills 的客户端对应目录即可：

```bash
# WorkBuddy（用户级，所有项目可用）
cp -R tech-write ~/.workbuddy/skills/

# Claude Code（用户级）
cp -R tech-write ~/.claude/skills/

# 项目级（仅当前项目）
cp -R tech-write /path/to/project/.agents/skills/
```

复制后重启客户端或刷新 Skill 列表。

### 验证安装

向 Agent 提出技术写作相关请求，确认其加载 `tech-write` 的 `SKILL.md` 并路由到对应能力卡，例如：

```text
我想写一篇关于团队 Code Review 的文章，但还没想清楚怎么写
帮我看看这篇稿子写得怎么样、哪里要改
文章明天要发，帮我做最后检查和敏感信息排查
```

## 使用

无需显式调用，命中意图时 Agent 会自动加载；也可以直接点名：

```text
用 tech-write 帮我规划这本书的章节和迭代计划
```

13 张能力卡按任务触发：

| 场景 | 能力卡 |
|---|---|
| 坚持不下来、怀疑写作值不值 | writing-habit-design |
| 学完怎么确认真懂了 | writing-driven-learning |
| 想写点什么、写给谁看 | article-positioning |
| 有选题，怎么一步步成稿 | drafting-workflow |
| 别人总说看不懂 | clear-expression |
| 成稿求评价、求改进 | article-quality-review |
| 发布前最后检查、脱敏 | prepublish-check |
| 中英文混排、配图规范 | chinese-tech-typography |
| 推广物料、渠道选择 | distribution-last-mile |
| 技术文档翻译、术语表 | tech-translation-workflow |
| 写一本书的规划与防烂尾 | book-writing-engineering |
| 书稿工具链、代码同步 | writing-toolchain |
| 恶评应对、流量焦虑 | feedback-and-traffic-anxiety |

## 目录结构

```text
tech-write/
├── SKILL.md                 # Skill 入口（路由表 + 触发描述）
├── references/
│   ├── capabilities/        # 13 张能力卡（运行时按需加载）
│   ├── capability-index.md  # 能力索引
│   ├── overview.md          # 全书概览与批判
│   ├── glossary.md          # 32 条术语词典
│   └── cheatsheet.md        # 速查表
├── bundle/                  # 蒸馏源码（cangjie Bundle，可重新编译）
│   ├── cards/               # 能力卡源文件
│   ├── book/                # overview / glossary 源
│   ├── verified.yaml        # 13 能力单元 + 晋级决策
│   └── destinations.json    # 输出路由决策
├── tests/                   # 78 条压力测试用例（darwin 兼容）+ 结果报告
├── DIGEST.md                # 全书精华长文（约 6500 字）
└── BUILD_MANIFEST.json      # 构建清单
```

## 重新构建与进化

`bundle/` 是 cangjie-skill 的标准 Bundle，可用 cangjie 编译器重新编译（如切换 pack 模式，产出 7 个独立 Skill + 1 路由入口）：

```bash
python3 cangjie.py compile --bundle tech-write/bundle --out dist/ --output pack
```

`tests/` 下 78 条测试用例兼容 darwin-skill，可用于 Skill 的自动评测与进化。

## 来源与边界

- 原书为 2020 年前后成书的咨询师经验文集，平台清单、机器翻译论断等有时效性，能力卡中已逐条标注边界；涉及的平台与工具请按当前环境重映射。
- 全部方法标注了原书出处与案例性质（亲历 / 转述 / 示例），个体经验（n=1）不构成承诺。
- 原书内容版权归属原作者与出版方，本 Skill 为方法论提炼与重组，仅供个人学习使用。

本仓库使用 [MIT License](../LICENSE)。
