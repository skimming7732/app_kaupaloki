// Optional integration check: real Gemini with supplied read-only database fixtures.
// The database/auth transport is simulated; this never creates a user or bypasses production authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const directory = path.join(__dirname, '../supabase/functions/ai-assistant');
const fixtures = JSON.parse(process.env.AI_LIVE_FIXTURES || '{}');
const prompts = JSON.parse(process.env.AI_LIVE_PROMPTS || '[]');
const key = process.env.GEMINI_API_KEY;
if (!key || !prompts.length) throw new Error('Set GEMINI_API_KEY, AI_LIVE_FIXTURES and AI_LIVE_PROMPTS explicitly.');
const source = (name) => fs.readFileSync(path.join(directory, name), 'utf8');
const compile = (name) => ts.transpile(source(name), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS });
const catalog = { exports: {} };
vm.runInNewContext(compile('catalog.ts'), { exports: catalog.exports, module: catalog });
const toolInvocations = [];
async function transport(input, options = {}) {
  const url = new URL(input);
  if (url.hostname === 'generativelanguage.googleapis.com') return fetch(input, options);
  assert.equal(url.hostname, 'database-fixture.test');
  assert.equal(options.method || 'GET', 'GET');
  if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: 'fixture-admin' }));
  if (url.pathname === '/rest/v1/profiles' && url.searchParams.get('select') === 'role,status') return new Response(JSON.stringify([{ role: 'administrador', status: 'activo' }]));
  const table = url.pathname.endsWith('/rpc/listar_perfiles_dashboard') ? 'usuarios' : url.pathname.split('/').at(-1);
  if (!Object.hasOwn(fixtures, table)) return new Response('{}', { status: 403 });
  let rows = [...fixtures[table]];
  for (const [column, filter] of url.searchParams) {
    if (['select', 'order', 'offset', 'limit'].includes(column)) continue;
    const index = filter.indexOf('.');
    const op = filter.slice(0, index);
    const expected = filter.slice(index + 1);
    rows = rows.filter((row) => {
      const actual = row[column];
      switch (op) {
        case 'eq': return String(actual) === expected;
        case 'neq': return String(actual) !== expected;
        case 'gte': return actual >= expected;
        case 'gt': return actual > expected;
        case 'lte': return actual <= expected;
        case 'lt': return actual < expected;
        case 'is': return expected === 'null' ? actual == null : String(actual) === expected;
        case 'ilike': return String(actual).toLowerCase().includes(expected.replace(/%/g, '').toLowerCase());
        default: throw new Error('Unexpected fixture filter');
      }
    });
  }
  if (table === 'usuarios') return new Response(JSON.stringify(rows));
  const total = rows.length;
  const order = url.searchParams.get('order')?.split(',')[0].split('.');
  if (order) rows.sort((a, b) => String(a[order[0]] ?? '').localeCompare(String(b[order[0]] ?? '')) * (order[1] === 'desc' ? -1 : 1));
  const offset = Number(url.searchParams.get('offset') || 0);
  const limit = Number(url.searchParams.get('limit') || 1000);
  const selected = url.searchParams.get('select')?.split(',');
  rows = rows.slice(offset, offset + limit).map((row) => selected ? Object.fromEntries(selected.map((column) => [column, row[column] ?? null])) : row);
  return new Response(JSON.stringify(rows), { headers: { 'content-range': `${offset}-${offset + rows.length - 1}/${total}` } });
}
const env = { get: (name) => ({ GEMINI_API_KEY: key, SUPABASE_URL: 'https://database-fixture.test', SUPABASE_ANON_KEY: 'fixture-public-key' })[name] };
const reader = { exports: {} };
vm.runInNewContext(compile('reader.ts'), { exports: reader.exports, module: reader, require: () => catalog.exports, Deno: { env }, fetch: transport, URL, AbortSignal });
let handler;
vm.runInNewContext(ts.transpile(source('index.ts').replace(/^import .*;\r?\n/gm, ''), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), {
  ...reader.exports,
  createReader: async (request) => {
    const api = await reader.exports.createReader(request);
    return { run: async (name, args) => { toolInvocations.push({ name, args }); return api.run(name, args); } };
  },
  Deno: { env, serve: (fn) => { handler = fn; } }, fetch: transport, Response, AbortSignal,
});
(async () => {
  for (const { prompt, expected, context = {} } of prompts) {
    toolInvocations.length = 0;
    const response = await handler(new Request('https://fixture-edge.test', { method: 'POST', headers: { Authorization: 'Bearer fixture-session' }, body: JSON.stringify({ prompt, history: [], context: { tabTitle: 'Dispersiones', ...context } }) }));
    const result = await response.json();
    console.log(JSON.stringify({ prompt, status: response.status, tools: toolInvocations, ...result }));
    assert.equal(response.status, 200);
    assert.ok(toolInvocations.length > 0, 'A database/technical tool must be used');
    if (expected) assert.ok(new RegExp(expected, 'i').test(result.reply), `Expected ${expected}`);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
