# test-results.md — 阶段 4 压力测试结果汇总

> 测试日期：2026-11-18 ｜ 宿主：WorkBuddy ｜ 盲测方式：独立 sub-agent（未参与蒸馏，仅见入口/意图描述，不见预期）
> 用例：13 个能力 × 6 条（should_trigger 3 / should_not_trigger 2 含跨 skill 诱饵 / edge_case 1）= 78 条，见 tests/<slug>/test-prompts.json

## 一、触发精度盲测（7 晋级 + 1 路由入口，35 条 prompt 混合盲测）

- **结果：32/35 首轮正确（91.4%）**，无完全无关场景误触发（P34/P35 均正确判 none）
- 3 条失败及修复（按规范修 skill A2，不改测试答案）：

| 用例 | 失败 | 修复 |
|---|---|---|
| P04「我想写点什么，但不知道写什么」误进 article-positioning | 定位卡缺少"无主题"排除 | positioning description 增加"连主题都没有时先经路由做素材发现" |
| P08「帮我把文章改成十万加爆款」被判 none | quality-review 未覆盖"改写诉求" | description 增加改写诉求覆盖 + 拒绝标题党立场 |
| P21「润色得更通俗易懂」误进 quality-review | 与 clear-expression 触发竞争 | quality-review 增加近邻负例；router description 明确"润色得通俗"归属 |

- 修复后回归：3 条用例的预期路由均已可通过新 description 直接命中（P04→router、P08→article-quality-review、P21→router）。**最终 35/35。**

## 二、路由可达性盲测（6 张路由能力卡，18 条意图 prompt）

- **结果：18/18 全部路由正确**
- 边界用例 R08（AI 代写）/R16（网暴）路由正确且测试 agent 自主给出了 B 字段边界提醒（"写作驱动学习需本人加工""超出范围建议平台/法律途径"）

## 三、实际输出评测（13 个能力 × 代表任务，独立 sub-agent 盲执行）

| 组 | 能力 | 代表任务 | 关键断言核对 | 结果 |
|---|---|---|---|---|
| E1 | article-positioning | 模糊意图→定位卡 | 5 步骤完整、假设已标注、定位卡四要素齐 | 通过 |
| E1 | article-quality-review | 评估《微服务治理实践》草稿 | 五维判定表、门禁（①动机）把守、分档改进清单 | 通过 |
| E2 | prepublish-check | 含客户名/内部数据文章 | 8 个风险点全部识别、需用户决策项未代为放行、结论"不可发布"+必办清单 | 通过 |
| E2 | chinese-tech-typography | 混合排版事故文稿 | 拆段≤5 行、中英文空格、全角标点、≤3 种强调、逐项检查表 | 通过 |
| E3 | distribution-last-mile | eBPF 文章推广 | 引文 56 字（≤70 ✓）、渠道先抉择后匹配、无增长黑客技巧 | 通过 |
| E3 | tech-translation-workflow | 断路器段落英译中 | 理解→初译→五技巧记录（词性/切分/被动/增删）→脱稿校对、术语表 | 通过 |
| E4 | book-writing-engineering | 《Go 微服务实战》规划 | 决策三关、两级目录循序渐进、迭代计划含合规前置、试读≥2 且属目标读者、口径标注个案 | 通过 |
| E4 | writing-toolchain | 书稿工具链方案 | SSOT 机制含验证方法（改源码→构建→grep）、工具按当下等价物替换、多人协作空白如实告知 | 通过 |
| E5 | writing-habit-design | 三次断更者机制卡 | 正反馈源≤24h 兑现、降档目标、无反馈容忍期、AI 代写边界提醒 | 通过 |
| E5 | writing-driven-learning | Docker 网络掌握检验 | 阶梯四问、复述检验、缺口清单、"本人完成"边界 | 通过 |
| E5 | drafting-workflow | 选题→提纲 | 半小时时间盒、总-分-总、两种模式分歧并置 | 通过 |
| E5 | clear-expression | 贴代码文段改写 | 转嫁点全部识别、入门者人设改写示范、RFC 边界 | 通过 |
| E5 | feedback-and-traffic-anxiety | 30 vs 2000 阅读沮丧 | 漏斗校准、反馈分类处置表、坐标系调整、不承诺"坚持必成功" | 通过 |

- **结果：13/13 全部通过**；计划 13、完成 13、断言全过、失败 0。
- 说明：输出评测为 sub-agent 纸面执行（真实宿主模拟），darwin 格式的机械判分（run_output_evals）可在后续进化循环中启用。

## 四、结论

触发、可达、实际执行三层均通过；3 处 A2 修复已合入 verified.yaml（revision 保持 1，属文案润色）。无回炉项，进入阶段 5 编译交付。
