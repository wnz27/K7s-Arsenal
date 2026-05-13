# Msg Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one decision-message tool usable by Codex and Claude Code, so an agent can ask the human for a blocking decision through Feishu or a fallback channel, receive the answer, and continue work.

**Architecture:** Codex and Claude Code call the same MCP server. The MCP server owns a local broker, persistent request store, message-channel adapters, and a Feishu callback HTTP endpoint. Codex plugin and Claude Code plugin only package the MCP server plus skills that teach agents when and how to call it.

**Tech Stack:** TypeScript, Node.js 20+, `@modelcontextprotocol/sdk`, `zod`, `fastify`, `vitest`, `esbuild`, file-backed JSON store, Feishu bot interactive cards.

---

## Review Of `docs/init.md`

原方案判断正确：只做 skill 不够。Skill 能规范 agent 行为，但不能稳定发消息、收回复、持久化状态。完整闭环需要 MCP tool 和 broker。

需要补强点：

- Feishu incoming webhook 只能做单向通知。闭环答复需要 Feishu bot app、事件回调或交互卡片按钮。
- MCP tool 不能长时间无限阻塞。`wait_for_decision` 必须有上限，超时返回 `pending`，由 agent 决定继续轮询、并行做别的任务，或走默认选项。
- 本地开发要有 `console` channel，不依赖 Feishu 配置也能跑通端到端。
- 消息体只发决策摘要、选项、影响、推荐项，不发密钥、完整源码、大段业务数据。
- Broker 需要独立状态存储。Agent 重启、Codex/Claude Code 会话切换后，`request_id` 仍可查询。
- Codex plugin 和 Claude Code plugin 是分发形态；核心能力必须沉到同一个 MCP server。
- `everything-claude-code` 插件在当前 Codex 插件列表和本地 cache 中未安装。外部搜索能看到同名 Claude Code 插件分发页，本计划提供兼容接入目录，不假设它已经可被本会话调用。

## Target User Flow

1. Agent 遇到阻塞决策，比如“要不要改数据库结构”。
2. Agent 调用 `msg_tool_ask_user_decision`，传入项目名、问题、上下文、选项、推荐项、超时策略。
3. Broker 写入 `request_id`，通过 Feishu interactive card 或 console channel 发给用户。
4. 用户点击 Feishu 按钮或在本地 CLI 提交选择。
5. Callback/API 校验 token，写入答案。
6. Agent 调用 `msg_tool_get_decision` 或短轮询 `msg_tool_wait_for_decision`。
7. Agent 拿到答案，按用户选择继续执行。若过期且有默认项，按默认项继续，并在最终汇报中说明。

## Product Scope

MVP 必做：

- MCP stdio server，提供决策请求、查询、短等待、取消、列表工具。
- Broker 持久化到 `msg_tool/.state/decisions.json`，写入使用临时文件加原子 rename。
- Console channel，用于本地开发和无 Feishu 环境。
- Feishu channel，使用 bot app 发 interactive card，通过 HTTPS callback 接收按钮答复。
- Codex plugin 包装：`.codex-plugin/plugin.json`、skill、`.mcp.json`。
- Claude Code plugin 包装：`.claude-plugin/plugin.json`、skill、`.mcp.json`。
- Plugin 内部必须自带可执行 MCP server bundle；安装后的 plugin 不能通过 `../` 引用仓库里的 `dist/index.js`。
- `everything-claude-code` 兼容说明：提供可复制的 MCP 配置和 skill 迁移说明。
- Vitest 单元测试和一个端到端假 channel 测试。

非 MVP：

- 多用户权限后台。
- Web 管理面板。
- 短信、邮件、Slack、Telegram channel。
- 云托管 SaaS。
- Agent 自动修改外部插件仓库。

## File Structure

```text
msg_tool/
  read.md
  README.md
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  scripts/
    bundle-plugins.mjs
  src/
    cli.ts
    config.ts
    index.ts
    schemas.ts
    broker/
      broker.ts
      store.ts
      types.ts
    channels/
      console.ts
      feishu.ts
      fake.ts
      types.ts
    http/
      callbackServer.ts
    mcp/
      server.ts
      tools.ts
    security/
      actionToken.ts
      redact.ts
  tests/
    broker.test.ts
    schemas.test.ts
    mcpTools.test.ts
    feishuCallback.test.ts
  codex-plugin/
    msg-tool/
      .codex-plugin/
        plugin.json
      .mcp.json
      server.js
      skills/
        decision-handoff/
          SKILL.md
  claude-plugin/
    msg-tool/
      .claude-plugin/
        plugin.json
      .mcp.json
      server.js
      skills/
        decision-handoff/
          SKILL.md
  integrations/
    everything-claude-code/
      README.md
      mcp-snippet.json
      skill-snippet.md
```

## MCP Tool Contract

### `msg_tool_ask_user_decision`

Creates one human decision request and sends it through a channel.

Input:

```ts
{
  project: string;
  question: string;
  context?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    impact?: string;
  }>;
  recommended_option_id?: string;
  default_option_id?: string;
  timeout_minutes?: number;
  channel?: "console" | "feishu";
  priority?: "normal" | "urgent";
}
```

Output:

```ts
{
  request_id: string;
  status: "pending";
  expires_at: string;
  poll_after_seconds: number;
  channel: "console" | "feishu";
  message_ref?: string;
}
```

Tool annotations:

```ts
{
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
}
```

### `msg_tool_get_decision`

Reads current decision state.

Input:

```ts
{ request_id: string }
```

Output:

```ts
{
  request_id: string;
  status: "pending" | "answered" | "expired" | "cancelled";
  selected_option_id?: string;
  answer_label?: string;
  note?: string;
  answered_at?: string;
  expires_at: string;
  source?: "human" | "default";
}
```

### `msg_tool_wait_for_decision`

Short bounded poll for agents that can wait briefly.

Input:

```ts
{
  request_id: string;
  max_wait_seconds?: number;
  poll_interval_seconds?: number;
}
```

Rules:

- `max_wait_seconds` default `30`, maximum `120`.
- Returns same shape as `msg_tool_get_decision`.
- Never waits beyond request expiry.

### `msg_tool_cancel_decision`

Cancels a pending request when agent no longer needs it.

Input:

```ts
{
  request_id: string;
  reason: string;
}
```

Output:

```ts
{
  request_id: string;
  status: "cancelled";
  cancelled_at: string;
}
```

### `msg_tool_list_decisions`

Lists recent requests for debugging and recovery.

Input:

```ts
{
  status?: "pending" | "answered" | "expired" | "cancelled";
  limit?: number;
}
```

Output:

```ts
{
  decisions: Array<{
    request_id: string;
    project: string;
    question: string;
    status: string;
    created_at: string;
    expires_at: string;
  }>
}
```

## Environment

```bash
MSG_TOOL_STATE_DIR=msg_tool/.state
MSG_TOOL_CHANNEL=console
MSG_TOOL_BROKER_PORT=8787
MSG_TOOL_PUBLIC_BASE_URL=https://example-tunnel.example.com
MSG_TOOL_SHARED_SECRET=change-me-with-a-long-random-value
FEISHU_APP_ID=cli_aabbccddeeff
FEISHU_APP_SECRET=feishu-app-secret
FEISHU_RECEIVE_ID_TYPE=open_id
FEISHU_RECEIVE_ID=ou_xxxxxxxxxxxxx
FEISHU_VERIFICATION_TOKEN=feishu-verification-token
FEISHU_ENCRYPT_KEY=feishu-encrypt-key
```

Security rules:

- `.env` never committed.
- `.env.example` contains variable names and safe fake values only.
- Callback server binds `127.0.0.1` in local mode.
- Feishu production callback uses HTTPS tunnel or remote deployment.
- All Feishu button values include signed action token.
- Tool output redacts secrets with `redactSecrets`.

## Data Model

```ts
export type DecisionStatus = "pending" | "answered" | "expired" | "cancelled";

export interface DecisionOption {
  id: string;
  label: string;
  description?: string;
  impact?: string;
}

export interface DecisionRequest {
  request_id: string;
  project: string;
  question: string;
  context?: string;
  options: DecisionOption[];
  recommended_option_id?: string;
  default_option_id?: string;
  channel: "console" | "feishu";
  priority: "normal" | "urgent";
  status: DecisionStatus;
  created_at: string;
  expires_at: string;
  selected_option_id?: string;
  note?: string;
  answered_at?: string;
  cancelled_at?: string;
  source?: "human" | "default";
  message_ref?: string;
}
```

## Task Plan

### Task 1: Project Scaffold

**Files:**
- Create: `msg_tool/package.json`
- Create: `msg_tool/tsconfig.json`
- Create: `msg_tool/vitest.config.ts`
- Create: `msg_tool/.env.example`
- Create: `msg_tool/README.md`
- Create: `msg_tool/src/config.ts`
- Create: `msg_tool/scripts/bundle-plugins.mjs`

- [ ] **Step 1: Create package manifest**

Use this exact `package.json`:

```json
{
  "name": "@k7s-arsenal/msg-tool",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "msg-tool-mcp": "./dist/index.js",
    "msg-tool": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "bundle:plugins": "node scripts/bundle-plugins.mjs",
    "dev:mcp": "tsx src/index.ts",
    "dev:callback": "tsx src/cli.ts callback",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "fastify": "^5.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.25.0",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
cd msg_tool
npm install
```

Expected: `package-lock.json` created, install exits `0`.

- [ ] **Step 3: Add TypeScript config**

Use strict ESM config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Add Vitest config**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text"]
    }
  }
});
```

- [ ] **Step 5: Add minimal config module**

Create `src/config.ts` so `tsc` has a real source file from Task 1 onward:

```ts
export interface RuntimeConfig {
  stateDir: string;
  channel: "console" | "feishu";
  brokerPort: number;
  publicBaseUrl?: string;
  sharedSecret?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const channel = env.MSG_TOOL_CHANNEL === "feishu" ? "feishu" : "console";

  return {
    stateDir: env.MSG_TOOL_STATE_DIR ?? "msg_tool/.state",
    channel,
    brokerPort: Number(env.MSG_TOOL_BROKER_PORT ?? "8787"),
    publicBaseUrl: env.MSG_TOOL_PUBLIC_BASE_URL,
    sharedSecret: env.MSG_TOOL_SHARED_SECRET
  };
}
```

- [ ] **Step 6: Add plugin bundle script**

Create `scripts/bundle-plugins.mjs`:

```js
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codexOut = resolve(root, "codex-plugin/msg-tool/server.js");
const claudeOut = resolve(root, "claude-plugin/msg-tool/server.js");

await mkdir(dirname(codexOut), { recursive: true });
await mkdir(dirname(claudeOut), { recursive: true });

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: codexOut,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: { js: "#!/usr/bin/env node" }
});

await copyFile(codexOut, claudeOut);
```

- [ ] **Step 7: Run baseline checks**

Run:

```bash
npm run typecheck
npm test
```

Expected: typecheck passes against `src/config.ts`; test command reports no tests until Task 2 adds tests.

### Task 2: Schemas And Validation

**Files:**
- Create: `msg_tool/src/schemas.ts`
- Create: `msg_tool/src/broker/types.ts`
- Create: `msg_tool/tests/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from "vitest";
import { AskDecisionInputSchema, WaitDecisionInputSchema } from "../src/schemas";

describe("decision input schemas", () => {
  it("accepts a valid decision request", () => {
    const parsed = AskDecisionInputSchema.parse({
      project: "K7s Arsenal",
      question: "Use Feishu callback app or console fallback first?",
      options: [
        { id: "feishu", label: "Feishu first" },
        { id: "console", label: "Console first" }
      ],
      recommended_option_id: "console",
      timeout_minutes: 30
    });
    expect(parsed.channel).toBe("console");
    expect(parsed.priority).toBe("normal");
  });

  it("rejects unknown recommended option", () => {
    expect(() =>
      AskDecisionInputSchema.parse({
        project: "K7s Arsenal",
        question: "Pick one",
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" }
        ],
        recommended_option_id: "c"
      })
    ).toThrow(/recommended_option_id/);
  });

  it("caps wait duration", () => {
    expect(() =>
      WaitDecisionInputSchema.parse({
        request_id: "req_abc",
        max_wait_seconds: 121
      })
    ).toThrow(/max_wait_seconds/);
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm test -- schemas.test.ts
```

Expected: fails because `src/schemas.ts` does not exist.

- [ ] **Step 3: Implement schemas**

Core rules:

- `project`: 1-120 chars.
- `question`: 1-2000 chars.
- `context`: max 4000 chars.
- `options`: 2-8 unique ids.
- `timeout_minutes`: default 60, range 5-1440.
- `channel`: default `console`.
- `priority`: default `normal`.

Implementation shape:

```ts
import { z } from "zod";

export const DecisionOptionSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  impact: z.string().max(1000).optional()
});

export const AskDecisionInputSchema = z
  .object({
    project: z.string().min(1).max(120),
    question: z.string().min(1).max(2000),
    context: z.string().max(4000).optional(),
    options: z.array(DecisionOptionSchema).min(2).max(8),
    recommended_option_id: z.string().optional(),
    default_option_id: z.string().optional(),
    timeout_minutes: z.number().int().min(5).max(1440).default(60),
    channel: z.enum(["console", "feishu"]).default("console"),
    priority: z.enum(["normal", "urgent"]).default("normal")
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    for (const option of value.options) {
      if (ids.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: `duplicate option id: ${option.id}`
        });
      }
      ids.add(option.id);
    }
    for (const key of ["recommended_option_id", "default_option_id"] as const) {
      const selected = value[key];
      if (selected && !ids.has(selected)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must match one option id`
        });
      }
    }
  });

export const GetDecisionInputSchema = z.object({
  request_id: z.string().min(1).max(128)
});

export const WaitDecisionInputSchema = z.object({
  request_id: z.string().min(1).max(128),
  max_wait_seconds: z.number().int().min(1).max(120).default(30),
  poll_interval_seconds: z.number().int().min(1).max(10).default(2)
});
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
npm test -- schemas.test.ts
```

Expected: all schema tests pass.

### Task 3: Persistent Store

**Files:**
- Create: `msg_tool/src/broker/store.ts`
- Modify: `msg_tool/src/broker/types.ts`
- Create: `msg_tool/tests/broker.test.ts`

- [ ] **Step 1: Write store tests**

Test cases:

- creates empty state when no file exists.
- writes decision and reads it back.
- updates answer atomically.
- preserves stored timestamps/status exactly; expiry is broker responsibility, not store responsibility.

- [ ] **Step 2: Implement `JsonDecisionStore`**

Rules:

- State path defaults to `msg_tool/.state/decisions.json`.
- Writes go to `decisions.json.tmp`, then `rename`.
- Store methods return cloned data to avoid accidental mutation.

Interface:

```ts
export interface DecisionStore {
  list(filter?: { status?: DecisionStatus; limit?: number }): Promise<DecisionRequest[]>;
  get(requestId: string): Promise<DecisionRequest | undefined>;
  save(decision: DecisionRequest): Promise<void>;
  update(requestId: string, updater: (current: DecisionRequest) => DecisionRequest): Promise<DecisionRequest>;
}
```

- [ ] **Step 3: Run store tests**

Run:

```bash
npm test -- broker.test.ts
```

Expected: store tests pass.

### Task 4: Broker Logic

**Files:**
- Create: `msg_tool/src/broker/broker.ts`
- Create: `msg_tool/src/channels/types.ts`
- Create: `msg_tool/src/channels/fake.ts`
- Modify: `msg_tool/tests/broker.test.ts`

- [ ] **Step 1: Define channel interface**

```ts
export interface DecisionChannel {
  name: "console" | "feishu";
  send(decision: DecisionRequest): Promise<{ message_ref?: string }>;
}
```

- [ ] **Step 2: Implement `DecisionBroker`**

Required methods:

- `ask(input)`: validate, create id with `crypto.randomUUID()`, persist pending decision, send channel, persist `message_ref`.
- `get(requestId)`: load, expire pending requests if needed, apply `default_option_id` with `source: "default"` when present, return state.
- `wait(requestId, maxWaitSeconds, pollIntervalSeconds)`: bounded loop using `setTimeout`.
- `answer(requestId, optionId, note, source)`: reject non-pending, reject unknown option.
- `cancel(requestId, reason)`: cancel pending only.
- `list(filter)`: return recent decisions sorted newest first.

- [ ] **Step 3: Test broker flow**

Expected test flow:

```ts
const fakeChannel = new FakeDecisionChannel("console");
const broker = new DecisionBroker(store, {
  console: fakeChannel
});

const request = await broker.ask({
  project: "K7s Arsenal",
  question: "Pick channel",
  options: [
    { id: "console", label: "Console" },
    { id: "feishu", label: "Feishu" }
  ],
  channel: "console"
});
await broker.answer(request.request_id, "console", "Ship MVP first", "human");
const decision = await broker.get(request.request_id);
expect(decision.status).toBe("answered");
expect(decision.selected_option_id).toBe("console");
expect(fakeChannel.sent).toHaveLength(1);
```

- [ ] **Step 4: Test expiry/default in broker**

Expected test flow:

```ts
const request = await broker.ask({
  project: "K7s Arsenal",
  question: "Continue after timeout?",
  options: [
    { id: "stop", label: "Stop" },
    { id: "continue", label: "Continue" }
  ],
  default_option_id: "stop",
  timeout_minutes: 5,
  channel: "console"
});

await store.update(request.request_id, (current) => ({
  ...current,
  expires_at: new Date(Date.now() - 1000).toISOString()
}));

const decision = await broker.get(request.request_id);
expect(decision.status).toBe("expired");
expect(decision.source).toBe("default");
expect(decision.selected_option_id).toBe("stop");
```

- [ ] **Step 5: Run broker tests**

Run:

```bash
npm test -- broker.test.ts
```

Expected: broker tests pass.

### Task 5: MCP Server Tools

**Files:**
- Create: `msg_tool/src/mcp/server.ts`
- Create: `msg_tool/src/mcp/tools.ts`
- Create: `msg_tool/src/index.ts`
- Create: `msg_tool/tests/mcpTools.test.ts`

- [ ] **Step 1: Register tools**

Tool names:

- `msg_tool_ask_user_decision`
- `msg_tool_get_decision`
- `msg_tool_wait_for_decision`
- `msg_tool_cancel_decision`
- `msg_tool_list_decisions`

- [ ] **Step 2: Return structured content**

Each MCP response returns:

```ts
{
  content: [
    {
      type: "text",
      text: JSON.stringify(result, null, 2)
    }
  ],
  structuredContent: result
}
```

- [ ] **Step 3: Keep logs on stderr**

`src/index.ts` must never write logs to stdout. Stdio MCP stdout carries JSON-RPC only.

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: `dist/index.js` created, TypeScript exits `0`.

### Task 6: Console Channel And CLI

**Files:**
- Create: `msg_tool/src/channels/console.ts`
- Create: `msg_tool/src/cli.ts`
- Modify: `msg_tool/README.md`

- [ ] **Step 1: Implement console send**

Console channel writes human-readable decision request to stderr:

```text
[msg-tool] Decision required: <question>
[msg-tool] Request ID: <request_id>
[msg-tool] Options:
  - console: Console
  - feishu: Feishu
[msg-tool] Submit:
  msg-tool answer <request_id> <option_id> --note "reason"
```

- [ ] **Step 2: Implement CLI commands**

Commands:

```bash
msg-tool answer <request_id> <option_id> --note "text"
msg-tool get <request_id>
msg-tool list --status pending
msg-tool callback
```

- [ ] **Step 3: Test console flow**

Run:

```bash
npm run build
node dist/cli.js list --status pending
```

Expected: valid JSON list, no crash when state file is absent.

### Task 7: Security Helpers

**Files:**
- Create: `msg_tool/src/security/actionToken.ts`
- Create: `msg_tool/src/security/redact.ts`
- Create: `msg_tool/tests/feishuCallback.test.ts`

- [ ] **Step 1: Implement action tokens**

Token payload:

```ts
{
  request_id: string;
  option_id: string;
  expires_at: string;
}
```

Signature:

```ts
HMAC_SHA256(MSG_TOOL_SHARED_SECRET, `${request_id}.${option_id}.${expires_at}`)
```

Validation rejects:

- missing secret.
- malformed token.
- expired decision.
- mismatched signature.

- [ ] **Step 2: Implement redaction**

Redact values matching:

- `FEISHU_APP_SECRET=...`
- `MSG_TOOL_SHARED_SECRET=...`
- bearer tokens.
- strings longer than 200 chars after `secret`, `token`, `password`, `key`.

- [ ] **Step 3: Run security tests**

Run:

```bash
npm test -- feishuCallback.test.ts
```

Expected: token and redaction tests pass.

### Task 8: Feishu Channel And Callback

**Files:**
- Create: `msg_tool/src/channels/feishu.ts`
- Create: `msg_tool/src/http/callbackServer.ts`
- Modify: `msg_tool/src/cli.ts`
- Modify: `msg_tool/tests/feishuCallback.test.ts`

- [ ] **Step 1: Implement Feishu client**

Create a small client inside `src/channels/feishu.ts`:

```ts
interface FeishuClient {
  getTenantAccessToken(): Promise<string>;
  sendInteractiveCard(input: {
    receiveIdType: string;
    receiveId: string;
    card: Record<string, unknown>;
  }): Promise<{ messageId: string }>;
}
```

Client rules:

- Fetch tenant token from `POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal`.
- Request body contains `app_id` from `FEISHU_APP_ID` and `app_secret` from `FEISHU_APP_SECRET`.
- Cache `tenant_access_token` until 60 seconds before `expire`.
- Send card through `POST https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=<FEISHU_RECEIVE_ID_TYPE>`.
- Message body uses `receive_id`, `msg_type: "interactive"`, and `content` as JSON string.
- Throw actionable errors that include Feishu `code` and `msg`, but never include app secret or access token.

- [ ] **Step 2: Send interactive card**

Feishu card content:

- Title: `Decision required: <project>`.
- Body: question, concise context, recommendation, expiry.
- Buttons: one button per option.
- Button value: signed action token.

Payload shape:

```ts
{
  config: { wide_screen_mode: true },
  header: {
    title: { tag: "plain_text", content: `Decision required: ${decision.project}` },
    template: decision.priority === "urgent" ? "red" : "blue"
  },
  elements: [
    { tag: "markdown", content: `**Question**\n${decision.question}` },
    { tag: "markdown", content: `**Context**\n${decision.context ?? "No extra context."}` },
    { tag: "markdown", content: `**Expires**\n${decision.expires_at}` },
    {
      tag: "action",
      actions: decision.options.map((option) => ({
        tag: "button",
        text: { tag: "plain_text", content: option.label },
        type: option.id === decision.recommended_option_id ? "primary" : "default",
        value: { action_token: signActionToken(decision, option.id) }
      }))
    }
  ]
}
```

- [ ] **Step 3: Implement callback routes**

Routes:

```text
GET  /healthz
POST /callbacks/feishu
```

Callback behavior:

- handles Feishu URL verification challenge.
- validates verification token or decrypted callback payload.
- validates signed action token.
- calls `broker.answer`.
- returns Feishu-compatible success response.

- [ ] **Step 4: Test Feishu client and callback**

Run:

```bash
npm test -- feishuCallback.test.ts
```

Expected:

- token request caches tenant token.
- send request posts `interactive` message.
- valid button event answers request.
- invalid signature returns `401`.

### Task 9: Codex Plugin Package

**Files:**
- Create: `msg_tool/codex-plugin/msg-tool/.codex-plugin/plugin.json`
- Create: `msg_tool/codex-plugin/msg-tool/.mcp.json`
- Create: `msg_tool/codex-plugin/msg-tool/server.js` through `npm run bundle:plugins`
- Create: `msg_tool/codex-plugin/msg-tool/skills/decision-handoff/SKILL.md`

- [ ] **Step 1: Add Codex plugin manifest**

Manifest content:

```json
{
  "name": "msg-tool",
  "version": "0.1.0",
  "description": "Ask the human for blocking agent decisions through MCP and message channels.",
  "author": {
    "name": "K7s Arsenal"
  },
  "license": "MIT",
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "interface": {
    "displayName": "Msg Tool",
    "shortDescription": "Ask for human decisions through message channels.",
    "developerName": "K7s Arsenal",
    "category": "Productivity",
    "capabilities": ["Interactive", "MCP"]
  }
}
```

- [ ] **Step 2: Add plugin MCP config**

```json
{
  "mcpServers": {
    "msg-tool": {
      "command": "node",
      "args": ["${CODEX_PLUGIN_ROOT}/server.js"],
      "env": {
        "MSG_TOOL_STATE_DIR": "${CODEX_PLUGIN_DATA}/state",
        "MSG_TOOL_CHANNEL": "${MSG_TOOL_CHANNEL}",
        "MSG_TOOL_SHARED_SECRET": "${MSG_TOOL_SHARED_SECRET}"
      }
    }
  }
}
```

Rule: no Codex plugin MCP config may reference `../` or any repo-local `dist/` path. Installed plugin must run from its own root.

- [ ] **Step 3: Add Codex skill**

Skill behavior:

- Trigger when blocked on user choice.
- Summarize decision into short options.
- Call `msg_tool_ask_user_decision`.
- Continue non-conflicting work while pending.
- If no safe work remains, call `msg_tool_wait_for_decision`.
- Never send secrets or full source files.

- [ ] **Step 4: Build Codex plugin server bundle**

Run:

```bash
cd msg_tool
npm run bundle:plugins
```

Expected: `codex-plugin/msg-tool/server.js` exists and is executable by `node`.

### Task 10: Claude Code Plugin Package

**Files:**
- Create: `msg_tool/claude-plugin/msg-tool/.claude-plugin/plugin.json`
- Create: `msg_tool/claude-plugin/msg-tool/.mcp.json`
- Create: `msg_tool/claude-plugin/msg-tool/server.js` through `npm run bundle:plugins`
- Create: `msg_tool/claude-plugin/msg-tool/skills/decision-handoff/SKILL.md`

- [ ] **Step 1: Add Claude plugin manifest**

```json
{
  "name": "msg-tool",
  "description": "Ask the human for blocking agent decisions through MCP and message channels.",
  "version": "0.1.0",
  "author": {
    "name": "K7s Arsenal"
  },
  "skills": "./skills/",
  "mcpServers": "./.mcp.json",
  "userConfig": {
    "shared_secret": {
      "type": "string",
      "title": "Shared secret",
      "description": "Long random secret used to sign action tokens.",
      "sensitive": true,
      "required": true
    },
    "channel": {
      "type": "string",
      "title": "Default channel",
      "description": "Message channel to use by default.",
      "default": "console"
    }
  }
}
```

- [ ] **Step 2: Add Claude MCP config**

```json
{
  "mcpServers": {
    "msg-tool": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      "env": {
        "MSG_TOOL_STATE_DIR": "${CLAUDE_PLUGIN_DATA}/state",
        "MSG_TOOL_CHANNEL": "${user_config.channel}",
        "MSG_TOOL_SHARED_SECRET": "${user_config.shared_secret}"
      }
    }
  }
}
```

Rule: no Claude plugin MCP config may reference `../` or any repo-local `dist/` path. Installed marketplace plugins are copied into cache and cannot traverse outside plugin root.

- [ ] **Step 3: Build Claude plugin server bundle**

Run:

```bash
cd msg_tool
npm run bundle:plugins
```

Expected: `claude-plugin/msg-tool/server.js` exists and is executable by `node`.

- [ ] **Step 4: Local Claude test**

Run:

```bash
claude --plugin-dir ./msg_tool/claude-plugin/msg-tool
```

Inside Claude Code:

```text
/mcp
```

Expected: `msg-tool` MCP server appears and exposes decision tools.

### Task 11: `everything-claude-code` Compatibility

**Files:**
- Create: `msg_tool/integrations/everything-claude-code/README.md`
- Create: `msg_tool/integrations/everything-claude-code/mcp-snippet.json`
- Create: `msg_tool/integrations/everything-claude-code/skill-snippet.md`

- [ ] **Step 1: Document current availability**

Write:

```md
Current Codex session does not have an enabled `everything-claude-code` plugin. This integration is a compatibility pack. Apply it to a fork or local install of that plugin only after reviewing its plugin structure.
```

- [ ] **Step 2: Provide MCP snippet**

```json
{
  "mcpServers": {
    "msg-tool": {
      "command": "node",
      "args": ["/absolute/path/to/K7s-Arsenal/msg_tool/claude-plugin/msg-tool/server.js"],
      "env": {
        "MSG_TOOL_STATE_DIR": "/absolute/path/to/K7s-Arsenal/msg_tool/.state",
        "MSG_TOOL_CHANNEL": "console",
        "MSG_TOOL_SHARED_SECRET": "set-in-your-shell"
      }
    }
  }
}
```

- [ ] **Step 3: Provide skill snippet**

Snippet rules:

- Use `msg_tool_ask_user_decision` only for blocking decisions.
- Keep options mutually exclusive.
- Include recommendation and risk.
- Resume work after answer.
- If expired and default option exists, continue with default and report it.

### Task 12: End-To-End Verification

**Files:**
- Modify: `msg_tool/README.md`

- [ ] **Step 1: Run all local checks**

```bash
cd msg_tool
npm run typecheck
npm test
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 2: Test MCP server with inspector**

Run:

```bash
cd msg_tool
npx @modelcontextprotocol/inspector node dist/index.js
```

Expected: inspector lists all `msg_tool_*` tools; `msg_tool_ask_user_decision` creates pending request.

- [ ] **Step 3: Test console loop**

Run:

```bash
cd msg_tool
MSG_TOOL_CHANNEL=console node dist/index.js
```

Expected: MCP server starts over stdio with no stdout logs. Use inspector to call ask/get/answer through CLI.

- [ ] **Step 4: Test Feishu loop**

Run:

```bash
cd msg_tool
MSG_TOOL_CHANNEL=feishu node dist/cli.js callback
```

Expected:

- `/healthz` returns `{"ok":true}`.
- Feishu URL challenge succeeds.
- Button click updates matching `request_id`.
- Invalid action token fails.

## Agent Skill Content

Both Codex and Claude Code plugin skills use same behavior:

```md
---
description: Use when agent work is blocked by a user decision that can be summarized into concrete options.
---

# Decision Handoff

When a task is blocked by a human choice:

1. Decide if the question is truly blocking. If safe progress remains, continue that work first.
2. Summarize the decision in one concise question.
3. Provide 2-5 mutually exclusive options.
4. Mark one recommended option when evidence supports it.
5. Include impact and risk, not full source code or secrets.
6. Call `msg_tool_ask_user_decision`.
7. Store `request_id` in working notes.
8. Continue non-conflicting work while pending.
9. If blocked, call `msg_tool_wait_for_decision` with a bounded wait.
10. On answer, follow the selected option and mention it in the final response.
11. On expiry with default option, follow the default and mention expiry.
12. On expiry without default, stop and ask in chat.
```

## Acceptance Criteria

- Codex can load MCP tools from the Codex plugin package.
- Claude Code can load MCP tools from the Claude plugin package.
- Plugin MCP configs use bundled `server.js` and never traverse outside plugin root.
- Agent can create a decision request with `msg_tool_ask_user_decision`.
- User can answer through console channel.
- User can answer through Feishu interactive card callback.
- `msg_tool_get_decision` returns `answered` with selected option.
- Expired request with default option returns `expired` and `source: "default"`.
- Secrets never appear in MCP stdout, Feishu card text, or test snapshots.
- Build, typecheck, and tests pass.

## Risks And Mitigations

- Feishu callback requires public HTTPS. Mitigation: use console channel for local MVP, use tunnel or remote deploy for Feishu.
- MCP stdio breaks if app logs to stdout. Mitigation: all logs go to stderr; tests assert stdout silence for startup path.
- Agent may ask vague questions. Mitigation: plugin skill requires concrete options, recommendation, impact.
- External plugin structure can change. Mitigation: keep `everything-claude-code` integration as snippet pack, not hard dependency.
- Long waits can stall agents. Mitigation: cap wait tool at 120 seconds and return `pending`.
- Prompt injection through message replies. Mitigation: button choices are option ids; freeform note is treated as human note, not executable instruction.

## References

- MCP transports and security: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- Claude Code MCP setup and plugin-provided MCP servers: https://code.claude.com/docs/en/mcp
- Claude Code plugin structure: https://code.claude.com/docs/en/plugins
- `everything-claude-code` external plugin listing found during review: https://www.claudepluginhub.com/plugins/littlebearbond-everything-claude-code

## Self-Review

Spec coverage:

- Cross Codex and Claude Code usage covered by Task 9 and Task 10.
- Message decision flow covered by Tasks 4-8.
- Feishu limitation addressed with bot app callback in Task 8.
- Skill plus plugin split covered by architecture and Tasks 9-10.
- `everything-claude-code` request covered by Task 11 as compatibility pack because plugin is not enabled locally.

Placeholder scan:

- No deferred feature is required for MVP.
- No task depends on an undefined file path.
- All external secrets use `.env` variables and fake example values.

Type consistency:

- `request_id`, `selected_option_id`, `recommended_option_id`, and `default_option_id` use same names across schemas, broker, store, and MCP outputs.
- Status values remain `pending | answered | expired | cancelled`.
- Channel values remain `console | feishu`, with `fake` limited to tests.
