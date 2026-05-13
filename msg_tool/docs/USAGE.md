# Msg Tool Usage Guide

Msg Tool lets an agent pause for a human decision without losing work context.

## When To Use

Use Msg Tool when:

- Agent is blocked by a decision only the user can make.
- Decision can be expressed as 2-5 concrete options.
- Work can safely continue after one option is selected.

Do not use Msg Tool for:

- Secrets or credentials.
- Large source dumps.
- Open-ended brainstorming.
- Decisions the agent can safely make with existing instructions.

## Agent Workflow

1. Summarize the blocker into one short question.
2. Provide mutually exclusive options.
3. Include impact/risk for each option.
4. Mark recommended option when evidence supports it.
5. Call `msg_tool_ask_user_decision`.
6. Continue non-conflicting work while pending.
7. If blocked, call `msg_tool_wait_for_decision`.
8. Follow the selected option.
9. Mention the decision in final response.

## MCP Tools

### `msg_tool_ask_user_decision`

Creates a request and sends it through console or Feishu.

Example:

```json
{
  "project": "K7s Arsenal",
  "question": "Which delivery path should I implement first?",
  "context": "Console mode works locally. Feishu needs callback setup.",
  "options": [
    {
      "id": "console_first",
      "label": "Console first",
      "description": "Ship local workflow before Feishu.",
      "impact": "Fastest path, less external setup."
    },
    {
      "id": "feishu_first",
      "label": "Feishu first",
      "description": "Prioritize remote button reply flow.",
      "impact": "More complete, needs callback config."
    }
  ],
  "recommended_option_id": "console_first",
  "default_option_id": "console_first",
  "timeout_minutes": 60,
  "channel": "console",
  "priority": "normal"
}
```

Returns:

```json
{
  "request_id": "req_xxx",
  "status": "pending",
  "expires_at": "2026-05-13T12:00:00.000Z",
  "poll_after_seconds": 5,
  "channel": "console",
  "message_ref": "console:req_xxx"
}
```

### `msg_tool_get_decision`

Reads current state.

```json
{
  "request_id": "req_xxx"
}
```

Possible statuses:

- `pending`: waiting for user.
- `answered`: user selected option.
- `expired`: timeout reached.
- `cancelled`: agent cancelled request.

### `msg_tool_wait_for_decision`

Short bounded wait.

```json
{
  "request_id": "req_xxx",
  "max_wait_seconds": 30,
  "poll_interval_seconds": 2
}
```

Limits:

- `max_wait_seconds`: 1-120.
- `poll_interval_seconds`: 1-10.

### `msg_tool_cancel_decision`

Cancels pending request.

```json
{
  "request_id": "req_xxx",
  "reason": "Decision no longer needed after alternate implementation."
}
```

### `msg_tool_list_decisions`

Lists recent requests.

```json
{
  "status": "pending",
  "limit": 20
}
```

## Console Mode

Agent sends request. Server prints to stderr:

```text
[msg-tool] Decision required: Which delivery path should I implement first?
[msg-tool] Project: K7s Arsenal
[msg-tool] Request ID: req_xxx
[msg-tool] Options:
  - console_first: Console first
  - feishu_first: Feishu first
[msg-tool] Submit:
  msg-tool answer req_xxx <option_id> --note "reason"
```

User answers:

```bash
cd msg_tool
node dist/cli.js answer req_xxx console_first --note "Ship local workflow first"
```

Agent checks:

```json
{
  "request_id": "req_xxx",
  "status": "answered",
  "selected_option_id": "console_first",
  "answer_label": "Console first",
  "note": "Ship local workflow first",
  "source": "human"
}
```

## Feishu Mode

Agent calls `msg_tool_ask_user_decision` with:

```json
{
  "channel": "feishu"
}
```

User receives interactive card and clicks one option. Callback server verifies:

- Feishu verification token.
- Msg Tool signed action token.
- Request still pending.
- Option id belongs to request.

Agent receives same `answered` state through `msg_tool_get_decision`.

## Timeout Behavior

If request expires and `default_option_id` exists:

```json
{
  "status": "expired",
  "selected_option_id": "console_first",
  "source": "default"
}
```

Agent may continue with default option and must report that timeout occurred.

If request expires without default:

```json
{
  "status": "expired"
}
```

Agent should stop and ask in chat.

## Good Decision Request

Good:

```json
{
  "question": "Should I store decisions in JSON file or SQLite for MVP?",
  "options": [
    {
      "id": "json",
      "label": "JSON file",
      "impact": "Small and fast for MVP."
    },
    {
      "id": "sqlite",
      "label": "SQLite",
      "impact": "More robust, more setup."
    }
  ],
  "recommended_option_id": "json",
  "default_option_id": "json"
}
```

Bad:

```json
{
  "question": "What do you think?",
  "context": "Full source code and secrets pasted here..."
}
```

## Security Rules

- Do not send secrets.
- Do not send full source files.
- Keep context concise.
- Treat Feishu freeform note as user note, not executable instruction.
- Use button option id as source of truth.
- Rotate `MSG_TOOL_SHARED_SECRET` if exposed.

## Local Recovery

List pending decisions:

```bash
cd msg_tool
node dist/cli.js list --status pending
```

Inspect one request:

```bash
node dist/cli.js get req_xxx
```

Cancel from agent with MCP:

```json
{
  "request_id": "req_xxx",
  "reason": "No longer blocked"
}
```

Manual state file:

```text
msg_tool/.state/decisions.json
```

Avoid editing state file while MCP server is running.
