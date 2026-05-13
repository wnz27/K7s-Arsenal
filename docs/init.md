<!--
 * @Author: 27
 * @LastEditors: 27
 * @Date: 2026-05-12 23:12:07
 * @LastEditTime: 2026-05-12 23:12:10
 * @FilePath: /K7s-Arsenal/docs/init.md
 * @description: type some description
-->
## 原始需求
讨论一个需求，如果我想做一个 skill 或者 plugin 给 codex 和 claude code 使用，功能是，比如我让 codex 和 cc 在电脑上帮我处理一个项目，但是这时候我有事出去了，而这时候项目过程中 cc 和 codex 需要我做一个决策，那么此时 cc 和 codex 可以使用 飞书或者其他消息机制给我发个消息，我来做个决策给到 cc 或者 codex，这个功能是否有办法实现？


## 初始方案
能实现。最佳形态：**plugin + MCP server + 消息服务**。  
单独做 skill 不够，skill 只能教 Codex/Claude Code “遇到决策时怎么做”，但真正发飞书、收回复、存状态，需要工具层。

推荐架构：

```text
Codex / Claude Code
  -> MCP tool: ask_user_decision(...)
  -> Decision Broker 服务
  -> 飞书机器人/Slack/Telegram/邮件/短信
  -> 你点按钮或回复
  -> Broker 存决策
  -> MCP tool: wait_for_decision(...) / get_decision(...)
  -> Agent 继续干活
```

关键点：

- **Codex 侧**：做 Codex plugin，里面带 skill + MCP 配置 + scripts。
- **Claude Code 侧**：直接接同一个 MCP server。
- **飞书侧**：普通 incoming webhook 只能发消息，不能稳定收回复；要做完整闭环，需要飞书机器人应用 + 事件回调，或交互卡片按钮。
- **Broker**：小服务即可，Node/Go/Python 都行。存 `request_id、问题、选项、状态、答案、过期时间`。
- **Agent 行为**：遇到阻塞决策时调用 `ask_user_decision`，然后轮询 `get_decision`，或者超时走默认策略。
- **安全**：消息里不要发密钥、完整源码、大段隐私数据。只发决策摘要、选项、影响、建议。

工具设计可以很简单：

```text
ask_user_decision({
  project,
  question,
  context,
  options,
  recommended_option,
  timeout_minutes
}) -> { request_id, status }

get_decision({ request_id }) -> {
  status: pending | answered | expired,
  answer,
  note
}
```

结论：  
**可做，而且跨 Codex + Claude Code 最合理方案是 MCP。** Skill 负责规范工作流，plugin 负责给 Codex 打包，MCP server 负责真实收发消息。飞书能做，但需要机器人应用，不只是 webhook。