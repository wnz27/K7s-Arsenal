import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPrompt, loadConfig, status, translate } from '../src/translation.mjs';

const config = loadConfig({ K7_TRANSLATE_BASE_URL: 'http://127.0.0.1:8000/v1' });

test('only accepts loopback model endpoints', () => {
  assert.throws(() => loadConfig({ K7_TRANSLATE_BASE_URL: 'https://api.example.com/v1' }), /本机回环地址/);
  assert.throws(() => loadConfig({ K7_TRANSLATE_BASE_URL: 'http://192.168.1.2:8000/v1' }), /本机回环地址/);
  assert.equal(config.baseUrl, 'http://127.0.0.1:8000/v1');
});

test('matches the local Index-Translate prompt and request format', async (t) => {
  let url;
  let request;
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    url = input;
    request = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: '你好，世界。  ' } }] });
  });

  const result = await translate(config, { text: 'Hello, world.', sourceLanguage: 'auto', targetLanguage: 'zh' });
  assert.equal(result.translation, '你好，世界。');
  assert.equal(url, 'http://127.0.0.1:8000/v1/chat/completions');
  assert.equal(request.messages[0].content, buildPrompt('Hello, world.', 'auto', 'zh'));
  assert.equal(request.messages[0].content, '请将以下文本翻译为简体中文，直接输出翻译结果，不要进行任何解释。\n\nHello, world.');
  assert.equal(request.model, 'Index-Translate-2B');
  assert.equal(request.temperature, 0);
  assert.equal(request.chat_template_kwargs.enable_thinking, false);
  assert.equal(buildPrompt('你好', 'zh', 'en'), '请将以下简体中文文本翻译为英语，直接输出翻译结果，不要进行任何解释。\n\n你好');
  assert.equal(buildPrompt('你好', 'zh', 'en', 'simple'), 'Translate the following 简体中文 text into 英语. Output only the translation.\n\n你好');
});

test('uses the configured endpoint for model status instead of the default port', async (t) => {
  const customConfig = loadConfig({ K7_TRANSLATE_BASE_URL: 'http://127.0.0.1:8001/v1' });
  let requestUrl;
  t.mock.method(globalThis, 'fetch', async (url) => {
    requestUrl = url;
    return Response.json({ data: [{ id: 'Index-Translate-2B' }] });
  });
  const result = await status(customConfig);
  assert.equal(requestUrl, 'http://127.0.0.1:8001/v1/models');
  assert.equal(result.endpoint, 'http://127.0.0.1:8001/v1');
  assert.deepEqual(result.models, ['Index-Translate-2B']);
  assert.equal(result.ok, true);
});

test('reports an empty translation from the model', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ message: { content: '  ' } }] }));
  await assert.rejects(
    translate(config, { text: 'hello', sourceLanguage: 'auto', targetLanguage: 'zh' }),
    /空译文/,
  );
});
