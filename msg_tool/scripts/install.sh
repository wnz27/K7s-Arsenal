#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Msg Tool one-click installer

Usage:
  bash scripts/install.sh [options]

Options:
  --channel <console|feishu>  Default message channel. Default: console
  --state-dir <path>          Decision state directory. Default: <msg_tool>/.state
  --skip-tests                Skip npm test during install.
  --force-env                 Rewrite .env from current options.
  -h, --help                  Show this help.

Examples:
  bash scripts/install.sh
  bash scripts/install.sh --skip-tests
  bash scripts/install.sh --channel feishu
EOF
}

log() {
  printf '[msg-tool install] %s\n' "$*"
}

fail() {
  printf '[msg-tool install] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

version_major() {
  "$1" --version | sed -E 's/^v?([0-9]+).*/\1/'
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
tool_root="$(cd "$script_dir/.." && pwd -P)"
channel="console"
state_dir="$tool_root/.state"
skip_tests="false"
force_env="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      [[ $# -ge 2 ]] || fail "--channel requires a value"
      channel="$2"
      shift 2
      ;;
    --state-dir)
      [[ $# -ge 2 ]] || fail "--state-dir requires a value"
      state_dir="$2"
      shift 2
      ;;
    --skip-tests)
      skip_tests="true"
      shift
      ;;
    --force-env)
      force_env="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

[[ "$channel" == "console" || "$channel" == "feishu" ]] || fail "--channel must be console or feishu"

require_command node
require_command npm

node_major="$(version_major node)"
[[ "$node_major" -ge 20 ]] || fail "Node.js 20+ required. Current: $(node --version)"

cd "$tool_root"

log "Using Node $(node --version)"
log "Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

env_file="$tool_root/.env"
if [[ ! -f "$env_file" || "$force_env" == "true" ]]; then
  log "Writing .env"
  secret="$(generate_secret)"
  cat > "$env_file" <<EOF
MSG_TOOL_STATE_DIR=$state_dir
MSG_TOOL_CHANNEL=$channel
MSG_TOOL_BROKER_PORT=8787
MSG_TOOL_PUBLIC_BASE_URL=https://example-tunnel.example.com
MSG_TOOL_SHARED_SECRET=$secret
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=replace-me
FEISHU_RECEIVE_ID_TYPE=open_id
FEISHU_RECEIVE_ID=ou_xxx
FEISHU_VERIFICATION_TOKEN=replace-me
FEISHU_ENCRYPT_KEY=replace-me
EOF
else
  log "Keeping existing .env"
fi

log "Typechecking"
npm run typecheck

if [[ "$skip_tests" != "true" ]]; then
  log "Running tests"
  npm test
else
  log "Skipping tests"
fi

log "Building MCP server"
npm run build

log "Bundling plugins"
npm run bundle:plugins

log "Checking generated entrypoints"
node --check dist/index.js
node --check dist/cli.js
node --check codex-plugin/msg-tool/server.js
node --check claude-plugin/msg-tool/server.js

cat <<EOF

Msg Tool installed.

Next:
  cd "$tool_root"
  set -a
  source .env
  set +a

Run local CLI:
  node dist/cli.js list --status pending

Run MCP server:
  node dist/index.js

Plugin bundles:
  $tool_root/codex-plugin/msg-tool
  $tool_root/claude-plugin/msg-tool

Docs:
  $tool_root/docs/DEPLOYMENT.md
  $tool_root/docs/USAGE.md
EOF
