# Msg Tool

MCP decision broker for Codex and Claude Code. Agents call MCP tools when blocked by human choice; the broker sends a concise decision request through console or Feishu and stores the answer for later polling.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## One-Click Install

```bash
bash scripts/install.sh
```

## Console Flow

```bash
npm run build
node dist/cli.js list --status pending
node dist/cli.js answer <request_id> <option_id> --note "reason"
```

## MCP

```bash
node dist/index.js
```

Stdio logs go to stderr only. stdout is reserved for MCP JSON-RPC.

## Docs

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Usage Guide](docs/USAGE.md)
