import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadConfig, status, translate } from './translation.mjs';

const config = loadConfig();
const server = new McpServer({ name: 'k7-translater', version: '1.0.0' });

server.registerTool('k7_translate_text', {
  title: '本地文本翻译',
  description: '使用本机 Index-Translate 模型翻译文本。默认自动识别源语言并译成简体中文；文本最长 4000 字符。',
  inputSchema: {
    text: z.string().min(1).max(4000).refine((value) => value.trim().length > 0, '文本不能为空'),
    source_language: z.string().min(2).max(32).default('auto').describe('源语言代码，如 auto、en、zh'),
    target_language: z.string().min(2).max(32).default('zh').describe('目标语言代码，如 zh、zh-TW、en、ja、ko、fr、de、es、ru'),
  },
  outputSchema: {
    translation: z.string(),
    model: z.string(),
    source_language: z.string(),
    target_language: z.string(),
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}, async ({ text, source_language, target_language }) => {
  try {
    const result = await translate(config, {
      text,
      sourceLanguage: source_language,
      targetLanguage: target_language,
    });
    return { content: [{ type: 'text', text: result.translation }], structuredContent: result };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error.message }] };
  }
});

server.registerTool('k7_translate_status', {
  title: '检查本地翻译服务',
  description: '检查本机模型服务是否可连接，并列出它提供的模型。',
  inputSchema: {},
  outputSchema: { ok: z.boolean(), endpoint: z.string(), models: z.array(z.string()), message: z.string().optional() },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}, async () => {
  let result;
  try {
    result = await status(config);
  } catch (error) {
    result = { ok: false, endpoint: config.baseUrl, models: [], message: error.message };
  }
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
});

await server.connect(new StdioServerTransport());
