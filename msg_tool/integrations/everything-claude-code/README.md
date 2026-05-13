# everything-claude-code Compatibility

Current Codex session does not have an enabled `everything-claude-code` plugin or local `everything-claude-code` command. This directory is a compatibility pack for a fork or local install of that plugin.

Use `mcp-snippet.json` to add the msg-tool MCP server to a compatible Claude Code plugin or user config after running:

```bash
cd msg_tool
npm install
npm run bundle:plugins
```

Then copy `skill-snippet.md` behavior into the plugin skill that handles blocked decisions.
