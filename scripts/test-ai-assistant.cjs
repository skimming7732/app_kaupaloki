const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/ai-assistant/index.ts'), 'utf8');
const code = ts.transpile(source.replace(/^import .*;\r?\n/, ''), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
});

async function invoke({ key = 'test-key', history = [], prompt = 'Pregunta actual', response, status = 200, method = 'POST' } = {}) {
  let handler;
  let sent;
  vm.runInNewContext(code, {
    Deno: {
      env: { get: (name) => name === 'GEMINI_API_KEY' ? key : undefined },
      serve: (fn) => { handler = fn; },
    },
    Response, AbortSignal,
    fetch: async (url, options) => {
      sent = { url, headers: options.headers, body: JSON.parse(options.body) };
      return new Response(JSON.stringify(response ?? {
        candidates: [{ content: { parts: [{ thought: true, text: 'internal' }, { text: 'Respuesta' }, { text: ' correcta' }] } }],
      }), { status });
    },
  });
  const result = await handler(new Request('https://example.test', {
    method, ...(method === 'POST' ? { body: JSON.stringify({ prompt, history, context: { tabTitle: 'Clientes' } }) } : {}),
  }));
  return { result, sent, body: method === 'OPTIONS' ? null : await result.json() };
}

(async () => {
  const success = await invoke({ history: [
    { role: 'user', content: 'Anterior' },
    { role: 'assistant', content: 'Respuesta anterior' },
    { role: 'user', content: 'Pregunta actual' },
  ] });
  assert.equal(success.body.reply, 'Respuesta correcta');
  assert.equal(success.sent.body.contents.length, 3);
  assert.equal(success.sent.body.contents[1].role, 'model');
  assert.equal(success.sent.body.contents[2].parts[0].text, 'Pregunta actual');
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('Clientes'));
  assert.ok(success.sent.url.endsWith('/gemini-3.5-flash-lite:generateContent'));
  assert.equal(success.sent.headers['x-goog-api-key'], 'test-key');
  const missing = await invoke({ key: '' });
  assert.equal(missing.result.status, 500);
  assert.equal(missing.sent, undefined);
  assert.equal((await invoke({ prompt: ' ' })).result.status, 400);
  const quota = await invoke({ status: 429, response: { error: { message: 'provider-secret' } } });
  assert.equal(quota.result.status, 429);
  assert.ok(quota.body.error.includes('cuota'));
  assert.ok(!JSON.stringify(quota.body).includes('provider-secret'));
  assert.equal((await invoke({ status: 403 })).result.status, 502);
  assert.equal((await invoke({ response: { candidates: [] } })).result.status, 502);
  const cors = await invoke({ method: 'OPTIONS' });
  assert.equal(cors.result.status, 200);
  assert.equal(cors.sent, undefined);
  console.log('AI assistant: 7 scenarios passed (Gemini payload, missing key, invalid prompt, quota, provider failure, empty reply, CORS).');
})().catch((err) => { console.error(err); process.exitCode = 1; });
