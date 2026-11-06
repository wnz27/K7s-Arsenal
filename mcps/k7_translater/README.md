# K7 Translate MCP

通过 MCP 为 Agent 提供本地文本翻译，默认使用 Index-Translate-2B 模型。MCP 使用 stdio，翻译请求只发送到本机回环地址上的 OpenAI 兼容模型服务。

每个 Agent 可以启动自己的 MCP 进程，共用同一个本地模型服务。使用本 MCP 无需安装浏览器扩展。

## 环境要求

- Node.js 20 或更新版本。
- 支持 stdio MCP 的 Agent 或客户端。
- 一个本地 OpenAI 兼容模型服务，提供 `/v1/models` 和 `/v1/chat/completions` 接口。

## 安装 MCP 依赖

克隆仓库并安装依赖；已有仓库副本时，直接进入 `mcps/k7_translater` 运行 `npm ci`：

```bash
git clone https://github.com/wnz27/K7s-Arsenal.git
cd K7s-Arsenal/mcps/k7_translater
npm ci
```

MCP 依赖与模型分别安装。`npm ci` 只安装 MCP 的 Node.js 依赖，不会下载模型。

## 启动本地模型

已有本地 OpenAI 兼容模型服务时，可以直接使用，并在后面的 Agent 配置中填写对应端口和模型 ID。

使用默认的 Index-Translate-2B 模型时：

1. 按 [llama.cpp 官方说明](https://github.com/ggml-org/llama.cpp) 安装支持该模型的版本，确保 `llama` 命令可用。
2. 从 [Index-Translate-2B-GGUF 模型仓库](https://huggingface.co/IndexTeam/Index-Translate-2B-GGUF) 下载 `Index-Translate-2B.Q4_K_M.gguf`。
3. 将下方模型路径替换为实际文件位置，在单独终端中启动服务：

```bash
llama serve \
  --model /path/to/models/Index-Translate-2B.Q4_K_M.gguf \
  --alias Index-Translate-2B \
  --host 127.0.0.1 --port 8000 --ctx-size 8192 --reasoning off
```

端口需要改成你本机闲置的端口，不懂的可以让你的agent直接随机一个端口并告诉你端口号即可。

保持该终端运行，所有本机 Agent 的 MCP 进程都可使用这个模型服务。用以下命令检查，响应中的 `data` 应包含 `Index-Translate-2B`：

```bash
curl http://127.0.0.1:8000/v1/models
```
需要跟上面启动翻译服务的端口号保持一致。

使用其他模型时，按服务提供的模型 ID 设置 `K7_TRANSLATE_MODEL`；若 Index 提示词不适用，可把 `K7_TRANSLATE_PROMPT_PRESET` 设为 `simple`。

## 接入 Agent

在支持 stdio MCP 的客户端配置中加入以下服务器。将 `/absolute/path/to/K7s-Arsenal` 替换为仓库在你电脑上的实际绝对路径。

下面是使用 `mcpServers` 的客户端配置示例：

```json
{
  "mcpServers": {
    "k7_translater": {
      "command": "node",
      "args": [
        "/absolute/path/to/K7s-Arsenal/mcps/k7_translater/src/index.mjs"
      ],
      "env": {
        "K7_TRANSLATE_BASE_URL": "http://127.0.0.1:8000/v1",
        "K7_TRANSLATE_MODEL": "Index-Translate-2B"
      }
    }
  }
}
```

如果桌面客户端找不到 `node`，将 `command` 改为 Node.js 20+ 可执行文件的绝对路径。每个 Agent 各配置一次，它们共用模型服务。保存配置后，按客户端要求重启或重新加载 MCP。

Codex 使用 TOML 配置时，可在用户级 `~/.codex/config.toml` 中加入等价配置：

```toml
[mcp_servers.k7_translater]
command = "node"
args = ["/absolute/path/to/K7s-Arsenal/mcps/k7_translater/src/index.mjs"]

[mcp_servers.k7_translater.env]
K7_TRANSLATE_BASE_URL = "http://127.0.0.1:8000/v1"
K7_TRANSLATE_MODEL = "Index-Translate-2B"
```

客户端配置中的 `env` 由该客户端在启动 MCP 进程时传入，修改后需要重新加载对应 MCP。直接在终端运行 `node src/index.mjs` 时，应在终端设置环境变量；它不会自动读取 Agent 的配置文件。

## 工具

| 工具 | 用途 |
| --- | --- |
| `k7_translate_text` | 翻译 `text`（最多 4000 字符）；`source_language` 默认 `auto`，`target_language` 默认 `zh`。|
| `k7_translate_status` | 检查本机模型服务并列出可用模型。|

常用语言代码：`zh`（简体中文）、`zh-TW`（繁体中文）、`en`、`ja`、`ko`、`fr`、`de`、`es`、`ru`。例如把 `Hello, world.` 翻成简体中文，调用 `k7_translate_text` 并传入 `{"text":"Hello, world.","target_language":"zh"}`。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `K7_TRANSLATE_BASE_URL` | `http://127.0.0.1:8000/v1` | 本机模型服务地址；仅接受 `127.0.0.1` 或 `[::1]` 的 HTTP URL。|
| `K7_TRANSLATE_MODEL` | `Index-Translate-2B` | 服务暴露的模型 ID。|
| `K7_TRANSLATE_PROMPT_PRESET` | `index` | `index` 使用 Index-Translate 提示词；`simple` 使用通用翻译提示词。|
| `K7_TRANSLATE_TIMEOUT_MS` | `60000` | 单次模型请求的超时时间，范围为 1–600000 毫秒。|
| `K7_TRANSLATE_API_KEY` | 空 | 本机服务需要 Bearer 认证时填写。|

## 验证与排查

在 Agent 中调用 `k7_translate_status`，确认 `ok` 为 `true`，再调用 `k7_translate_text` 进行翻译。

连接失败时，检查模型进程是否正在运行、配置端口是否一致，以及 `/v1/models` 返回的模型 ID 是否与 `K7_TRANSLATE_MODEL` 相同。单次文本超过 4000 字符时，先分段再调用翻译工具。

开发者可在本目录运行测试：

```bash
npm test
```
