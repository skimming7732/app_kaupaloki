const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const directory = path.join(__dirname, '../supabase/functions/ai-assistant');
const compile = (name) => ts.transpile(fs.readFileSync(path.join(directory, name), 'utf8'), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
});
const catalog = { exports: {} };
vm.runInNewContext(compile('catalog.ts'), { exports: catalog.exports, module: catalog });
const readerCode = compile('reader.ts');

function fixture({ role = 'administrador', status = 'activo', valid = true, rowCount = 1205 } = {}) {
  const requests = [];
  const module = { exports: {} };
  vm.runInNewContext(readerCode, {
    exports: module.exports, module, require: () => catalog.exports,
    URL, AbortSignal,
    Deno: { env: { get: (name) => name === 'SUPABASE_URL' ? 'https://db.example.test' : 'public-test-key' } },
    fetch: async (input, options = {}) => {
      const url = new URL(input);
      requests.push({ url, options });
      assert.equal(options.method || 'GET', 'GET');
      assert.equal(options.headers.Authorization, 'Bearer test-session');
      if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: 'user-admin' }), { status: valid ? 200 : 401 });
      if (url.pathname === '/rest/v1/profiles') return new Response(JSON.stringify([{ role, status }]));
      if (url.pathname === '/rest/v1/rpc/listar_perfiles_dashboard') return new Response(JSON.stringify([
        { id: 'a', full_name: 'Operadora ficticia', role: 'operador', two_factor_secret: 'must-never-leave' },
        { id: 'b', full_name: 'Operador ficticio', role: 'operador' },
      ]));
      if (url.pathname === '/rest/v1/resumen_liquidacion') return new Response(JSON.stringify([
        { total_activos_liquidos_cop: 668819603.9999049, total_activos_digitales_usdt: 185238.071927, rate_usdt_cop: 3280, updated_at: '2026-11-13T17:00:00Z' },
      ]), { headers: { 'content-range': '0-0/1' } });
      assert.equal(url.pathname, '/rest/v1/negocios');
      const offset = Number(url.searchParams.get('offset'));
      const limit = Number(url.searchParams.get('limit'));
      const selected = url.searchParams.get('select').split(',');
      const rows = Array.from({ length: Math.max(0, Math.min(limit, rowCount - offset)) }, (_, i) => {
        const number = offset + i;
        const row = { id: String(number), created_by: number === 0 ? null : number % 2 ? 'a' : 'b', created_by_name: number === 0 ? null : number % 2 ? 'Operadora ficticia' : 'Operador ficticio', ingreso_cop: 100, fecha: '2026-11-12' };
        return Object.fromEntries(selected.map((column) => [column, row[column]]));
      });
      return new Response(JSON.stringify(rows), { headers: { 'content-range': `${offset}-${offset + rows.length - 1}/${rowCount}` } });
    },
  });
  return { ...module.exports, requests };
}
const request = () => new Request('https://edge.example.test', { headers: { Authorization: 'Bearer test-session' } });

(async () => {
  const noAuth = fixture();
  await assert.rejects(() => noAuth.createReader(new Request('https://edge.example.test')), (e) => e.status === 401);
  assert.equal(noAuth.requests.length, 0);
  for (const configuration of [{ role: 'operador' }, { status: 'inactivo' }]) {
    const denied = fixture(configuration);
    await assert.rejects(() => denied.createReader(request()), (e) => e.status === 403);
    assert.equal(denied.requests.length, 2);
  }
  const invalid = fixture({ valid: false });
  await assert.rejects(() => invalid.createReader(request()), (e) => e.status === 401);
  const setup = fixture();
  const reader = await setup.createReader(request());
  const assets = await reader.run('calcular_activos', {});
  assert.equal(assets.valoresCOPFormateados.totalActivos, '1,276,400,479.92');
  assert.equal(setup.requests.at(-1).url.searchParams.get('order'), 'updated_at.desc.nullslast,id.asc');
  const activity = await reader.run('resumir_datos', { tabla: 'negocios', agrupar_por: ['created_by'], sumar: ['ingreso_cop'] });
  assert.equal(activity.totalFiltrado, 1205);
  assert.equal(activity.procesados, 1205);
  assert.equal(activity.completo, true);
  assert.equal(activity.grupos.find((g) => g.created_by === 'a').cantidad, 602);
  assert.equal(activity.grupos.find((g) => g.created_by === null).cantidad, 1);
  assert.equal(activity.grupos.find((g) => g.created_by === 'a').ingreso_cop, 60200);
  assert.equal(setup.requests.filter((r) => r.url.pathname.endsWith('/negocios')).length, 2);
  const page = await reader.run('consultar_datos', { tabla: 'negocios', columnas: ['id', 'fecha'], filtros: [{ columna: 'fecha', operador: 'gte', valor: '2026-11-12' }], limite: 20 });
  assert.equal(page.esMuestra, true);
  assert.equal(page.filas.length, 20);
  assert.equal(setup.requests.at(-1).url.searchParams.get('fecha'), 'gte.2026-11-12');
  const before = setup.requests.length;
  for (const [name, args] of [
    ['borrar_todo', {}],
    ['consultar_datos', { tabla: '../auth/users' }],
    ['consultar_datos', { tabla: 'profiles', columnas: ['two_factor_secret'] }],
    ['consultar_datos', { tabla: 'cash_tokens', columnas: ['token_code'] }],
    ['consultar_datos', { tabla: 'negocios', filtros: [{ columna: 'fecha', operador: 'delete', valor: 'x' }] }],
    ['consultar_datos', { tabla: 'negocios', ordenar_por: 'id;delete' }],
    ['resumir_datos', { tabla: 'negocios', sumar: ['created_by_name'] }],
  ]) await assert.rejects(() => reader.run(name, args));
  assert.equal(setup.requests.length, before);
  const users = await reader.run('consultar_datos', { tabla: 'usuarios', columnas: ['id', 'full_name'] });
  assert.equal(users.totalFiltrado, 2);
  assert.ok(!JSON.stringify(users).includes('must-never-leave'));
  const limitedSetup = fixture({ rowCount: 20001 });
  const limited = await (await limitedSetup.createReader(request())).run('resumir_datos', { tabla: 'negocios', agrupar_por: ['created_by'] });
  assert.equal(limited.completo, false);
  assert.equal(limited.procesados, 20000);
  const metadata = await reader.run('referencia_tecnica', { tema: 'formulas', nombre: 'calcular_ganancia_liquidacion' });
  assert.ok(metadata.sql[0].definition.includes('ganancia_esperada_cop'));
  const redacted = setup.redact({ nested: { two_factor_secret: 'hidden', note: 'sb_secret_abcdefghijklmnopqrstuvwxyz' }, token: 'eyJabc.def.signature' });
  assert.ok(!JSON.stringify(redacted).includes('hidden'));
  assert.ok(!JSON.stringify(redacted).includes('sb_secret_'));
  assert.ok(!JSON.stringify(redacted).includes('eyJabc'));
  console.log('Read-only reader checks passed: auth/roles, RLS headers, pagination, exact user counts, null authors, filters, protected columns, blocked mutations, bounded totals, technical formulas and redaction.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
