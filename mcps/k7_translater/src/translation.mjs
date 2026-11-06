const LANGUAGE_NAMES = {
  zh: '简体中文',
  'zh-TW': '繁体中文',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
};

export function loadConfig(env = process.env) {
  const baseUrl = new URL(env.K7_TRANSLATE_BASE_URL ?? 'http://127.0.0.1:8000/v1');
  if (
    baseUrl.protocol !== 'http:' ||
    !['127.0.0.1', '[::1]'].includes(baseUrl.hostname) ||
    baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash
  ) {
    throw new Error('K7_TRANSLATE_BASE_URL 必须是本机回环地址的 HTTP URL（127.0.0.1 或 [::1]）。');
  }

  const timeoutMs = Number(env.K7_TRANSLATE_TIMEOUT_MS ?? 60_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) {
    throw new Error('K7_TRANSLATE_TIMEOUT_MS 必须是 1–600000 之间的整数。');
  }

  const model = env.K7_TRANSLATE_MODEL ?? 'Index-Translate-2B';
  if (!model.trim()) throw new Error('K7_TRANSLATE_MODEL 不能为空。');
  const promptPreset = env.K7_TRANSLATE_PROMPT_PRESET ?? 'index';
  if (!['index', 'simple'].includes(promptPreset)) {
    throw new Error('K7_TRANSLATE_PROMPT_PRESET 只能是 index 或 simple。');
  }

  return {
    baseUrl: baseUrl.href.replace(/\/+$/, ''),
    model,
    timeoutMs,
    apiKey: env.K7_TRANSLATE_API_KEY ?? '',
    promptPreset,
  };
}

export function buildPrompt(text, sourceLanguage, targetLanguage, preset = 'index') {
  const source = sourceLanguage === 'auto' ? '' : (LANGUAGE_NAMES[sourceLanguage] ?? sourceLanguage);
  const target = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage;
  if (preset === 'simple') {
    return `Translate the following ${source} text into ${target}. Output only the translation.\n\n${text}`;
  }
  return `请将以下${source}文本翻译为${target}，直接输出翻译结果，不要进行任何解释。\n\n${text}`;
}

async function request(config, path, init = {}, timeoutMs = config.timeoutMs) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  let response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error(`本地模型请求超时（${timeoutMs} ms）。`);
    }
    throw new Error(`无法连接本地模型 ${config.baseUrl}，请先启动 llama.cpp 服务。`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`本地模型返回了非 JSON 响应（HTTP ${response.status}）。`);
  }
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `本地模型返回 HTTP ${response.status}。`);
  }
  return payload;
}

export async function translate(config, { text, sourceLanguage, targetLanguage }) {
  const payload = await request(config, '/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: buildPrompt(text, sourceLanguage, targetLanguage, config.promptPreset) }],
      temperature: 0,
      max_tokens: 2048,
      stream: false,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  const translation = payload?.choices?.[0]?.message?.content?.trim();
  if (!translation) throw new Error('本地模型返回空译文，请检查模型名称和服务日志。');
  return { translation, model: config.model, source_language: sourceLanguage, target_language: targetLanguage };
}

export async function status(config) {
  const payload = await request(config, '/models', {}, Math.min(config.timeoutMs, 5_000));
  return {
    ok: true,
    endpoint: config.baseUrl,
    models: (payload?.data ?? []).flatMap((model) => model?.id ? [model.id] : []),
  };
}
