# Msg Tool Deployment Guide

Msg Tool can run in three shapes:

- Local MCP server for development.
- Codex or Claude Code plugin with bundled `server.js`.
- Feishu callback server for remote button replies.

## Prerequisites

- Node.js 20 or newer.
- npm.
- Optional Feishu app with bot permission and interactive card callback enabled.

## Build

One-click local install:

```bash
cd msg_tool
bash scripts/install.sh
```

Fast install without tests:

```bash
cd msg_tool
bash scripts/install.sh --skip-tests
```

From repository root:

```bash
cd msg_tool
npm install
npm run typecheck
npm test
npm run build
npm run bundle:plugins
```

Expected outputs:

- `dist/index.js`: stdio MCP server.
- `dist/cli.js`: local CLI.
- `codex-plugin/msg-tool/server.js`: bundled Codex plugin server.
- `claude-plugin/msg-tool/server.js`: bundled Claude Code plugin server.

## Environment

Create a local `.env` or export values in the shell that starts the MCP server:

```bash
export MSG_TOOL_STATE_DIR="$PWD/.state"
export MSG_TOOL_CHANNEL="console"
export MSG_TOOL_SHARED_SECRET="$(openssl rand -hex 32)"
```

For Feishu:

```bash
export MSG_TOOL_CHANNEL="feishu"
export MSG_TOOL_BROKER_PORT="8787"
export MSG_TOOL_PUBLIC_BASE_URL="https://your-public-callback.example.com"
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
export FEISHU_RECEIVE_ID_TYPE="open_id"
export FEISHU_RECEIVE_ID="ou_xxx"
export FEISHU_VERIFICATION_TOKEN="xxx"
```

Never commit real `.env` values.

## Local Console Deployment

Use console mode first. It verifies MCP and persistence without Feishu.

```bash
cd msg_tool
MSG_TOOL_STATE_DIR="$PWD/.state" \
MSG_TOOL_CHANNEL=console \
MSG_TOOL_SHARED_SECRET=dev-secret \
node dist/index.js
```

For manual CLI inspection:

```bash
node dist/cli.js list --status pending
node dist/cli.js get <request_id>
node dist/cli.js answer <request_id> <option_id> --note "approved"
```

## Feishu Callback Deployment

Start callback server:

```bash
cd msg_tool
MSG_TOOL_STATE_DIR="$PWD/.state" \
MSG_TOOL_CHANNEL=feishu \
MSG_TOOL_SHARED_SECRET="$MSG_TOOL_SHARED_SECRET" \
FEISHU_APP_ID="$FEISHU_APP_ID" \
FEISHU_APP_SECRET="$FEISHU_APP_SECRET" \
FEISHU_RECEIVE_ID_TYPE="$FEISHU_RECEIVE_ID_TYPE" \
FEISHU_RECEIVE_ID="$FEISHU_RECEIVE_ID" \
FEISHU_VERIFICATION_TOKEN="$FEISHU_VERIFICATION_TOKEN" \
node dist/cli.js callback
```

Expose `POST /callbacks/feishu` and `GET /healthz` through HTTPS. Local development can use a tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Configure Feishu event/callback URL:

```text
https://<public-host>/callbacks/feishu
```

Health check:

```bash
curl -sS http://127.0.0.1:8787/healthz
```

Expected:

```json
{"ok":true}
```

## Codex Plugin Deployment

Build bundle first:

```bash
cd msg_tool
npm run bundle:plugins
```

Plugin directory:

```text
msg_tool/codex-plugin/msg-tool
```

MCP config inside plugin:

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

Install or link this plugin according to your Codex Desktop plugin flow. Set:

```bash
export MSG_TOOL_CHANNEL=console
export MSG_TOOL_SHARED_SECRET="$(openssl rand -hex 32)"
```

## Claude Code Plugin Deployment

Build bundle first:

```bash
cd msg_tool
npm run bundle:plugins
```

Plugin directory:

```text
msg_tool/claude-plugin/msg-tool
```

MCP config uses plugin-local `server.js`, not repository `dist`:

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

After installing the plugin, configure:

- `shared_secret`: long random string.
- `channel`: `console` or `feishu`.

## everything-claude-code Compatibility

This repository includes snippets:

```text
msg_tool/integrations/everything-claude-code/
  README.md
  mcp-snippet.json
  skill-snippet.md
```

Use `mcp-snippet.json` only after replacing absolute paths and secrets:

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

## Operational Notes

- State is stored in `${MSG_TOOL_STATE_DIR}/decisions.json`.
- Stdio MCP logs must go to stderr only.
- Plugin bundles must be regenerated after source changes.
- Feishu button replies require valid `MSG_TOOL_SHARED_SECRET`.
- Feishu cards should contain summaries, never secrets or full source files.

## Troubleshooting

No MCP tools appear:

```bash
node --check dist/index.js
node --check codex-plugin/msg-tool/server.js
```

Feishu button returns unauthorized:

- Check `MSG_TOOL_SHARED_SECRET` matches sender and callback server.
- Check Feishu verification token.
- Check callback URL points to current server.

Console answer fails:

```bash
node dist/cli.js list --status pending
node dist/cli.js get <request_id>
```

Plugin still uses old code:

```bash
npm run build
npm run bundle:plugins
```
