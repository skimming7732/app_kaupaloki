const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/ai-assistant/index.ts'), 'utf8');
const code = ts.transpile(source.replace(/^import .*;\r?\n/gm, ''), {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None,
});

async function invoke({ key = 'test-key', history = [], prompt = 'Pregunta actual', response, status = 200, method = 'POST', context = { tabTitle: 'Clientes' }, responses, run } = {}) {
  let handler;
  let sent;
  const calls = [];
  const executed = [];
  class AccessError extends Error {}
  vm.runInNewContext(code, {
    AccessError, redact: (value) => value, readTools: [{ functionDeclarations: [] }],
    createReader: async () => ({ run: async (name, args) => { executed.push({ name, args }); return run ? run(name, args) : { completo: true, grupos: [{ usuario: 'Usuario ficticio', cantidad: 89 }] }; } }),
    Deno: {
      env: { get: (name) => name === 'GEMINI_API_KEY' ? key : undefined },
      serve: (fn) => { handler = fn; },
    },
    Response, AbortSignal,
    Date: class extends Date { constructor(value) { super(value ?? '2026-11-14T02:00:00Z'); } },
    fetch: async (url, options) => {
      sent = { url, headers: options.headers, body: JSON.parse(options.body) };
      calls.push(sent);
      return new Response(JSON.stringify(responses?.shift() ?? response ?? {
        candidates: [{ content: { parts: [{ thought: true, text: 'internal' }, { text: 'Respuesta' }, { text: ' correcta' }] } }],
      }), { status });
    },
  });
  const result = await handler(new Request('https://example.test', {
    method, ...(method === 'POST' ? { body: JSON.stringify({ prompt, history, context }) } : {}),
  }));
  return { result, sent, calls, executed, body: method === 'OPTIONS' ? null : await result.json() };
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
  const summarySource = fs.readFileSync(path.join(__dirname, '../src/services/aiOperationSummary.ts'), 'utf8');
  const summaryModule = { exports: {} };
  vm.runInNewContext(ts.transpile(summarySource, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), {
    exports: summaryModule.exports, module: summaryModule,
  });
  const { summarizeUsdtOperations } = summaryModule.exports;
  const purchases = summarizeUsdtOperations([
    ...Array.from({ length: 30 }, () => ({ fecha: '2026-11-13', usdtComprado: 1, valorComprado: 4000, divisaCodigo: 'COP', estado: 'pendiente' })),
    { fecha: '2026-11-12', usdtComprado: 10, valorComprado: 40000, divisaCodigo: 'COP', estado: 'recibido' },
    { fecha: '2026-11-12T00:00:00Z', usdtComprado: 5, valorComprado: 5, divisaCodigo: 'USD', estado: 'pendiente' },
  ], 'compra');
  assert.equal(purchases.totalRegistros, 32);
  assert.equal(purchases.porFecha[1].cantidad, 2);
  assert.equal(purchases.porFecha[1].usdt, 15);
  assert.equal(purchases.porFecha[1].importesPorDivisa.COP, 40000);
  assert.equal(purchases.porFecha[1].importesPorDivisa.USD, 5);
  assert.equal(purchases.porFecha[1].estados.pendiente, 1);
  assert.equal(summarizeUsdtOperations([{ fecha: '' }], 'compra').sinFecha, 1);
  assert.equal(summarizeUsdtOperations([{ fecha: '2026-11-12', usdtVendido: 5, totalCOP: 20000 }], 'venta').porFecha[0].usdt, 5);
  const crossTab = await invoke({ context: { tabTitle: 'Dispersiones', usdtOperations: {
    source: 'loaded_snapshot', loading: false, syncedAt: '2026-11-13T16:00:00Z', compras: purchases,
    ventas: summarizeUsdtOperations([], 'venta'),
  } } });
  const instructions = crossTab.sent.body.systemInstruction.parts[0].text;
  assert.ok(instructions.includes('Hoy: 2026-11-13. Ayer: 2026-11-12.'));
  assert.ok(instructions.includes('"cantidad":2'));
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('Consulta sus tablas con resumir_datos'));
  assert.ok(instructions.includes('MUESTRAS PARCIALES'));
  const capitalModule = { exports: {} };
  const capitalSource = fs.readFileSync(path.join(__dirname, '../src/utils/capitalSocios.ts'), 'utf8').replace(/^import .*;\r?\n/, '');
  vm.runInNewContext(ts.transpile(capitalSource, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }), {
    exports: capitalModule.exports, module: capitalModule,
  });
  const capital = capitalModule.exports.summarizeCapitalPeople([
    { socio_id: 'a', tipo: 'CONTRATO', monto_cop: 100000 },
    { socio_id: 'a', tipo: 'RETIRO', monto_cop: 70000 },
    { socio_id: 'a', tipo: 'DIVIDENDO', monto_cop: 900000 },
    { socio_id: 'b', tipo: 'CONTRATO', monto_cop: 50000 },
    { socio_id: 'b', tipo: 'INTERES', monto_cop: 300000 },
  ], [{ id: 'a', nombre: 'Socio ficticio', tipo: 'SOCIO' }, { id: 'b', nombre: 'Inversionista ficticio', tipo: 'INVERSIONISTA' }]);
  assert.equal(capital[0].nombre, 'Inversionista ficticio');
  assert.equal(capital[0].capitalCOP, 50000);
  assert.equal(capital[1].capitalCOP, 30000);
  const capitalAndAssets = await invoke({ context: { capitalByPerson: capital, metrics: {
    totalActivosLiquidos: 1000000, totalActivosDigitales: 100, rateUsdtCop: 3280,
  } } });
  const assetInstructions = capitalAndAssets.sent.body.systemInstruction.parts[0].text;
  assert.ok(assetInstructions.includes('"totalActivosCOP":1328000'));
  assert.ok(assetInstructions.includes('Inversionista ficticio'));
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('El navegador no proporcionó el desglose de capital por persona'));
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('El navegador no proporcionó activos/tasa'));
  const toolResult = await invoke({ responses: [
    { candidates: [{ content: { role: 'model', parts: [{ thoughtSignature: 'preserved-signature', functionCall: { name: 'resumir_datos', args: { tabla: 'negocios', agrupar_por: ['created_by'] } } }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ text: 'Usuario ficticio: 89 negocios' }] } }] },
  ] });
  assert.equal(toolResult.body.reply, 'Usuario ficticio: 89 negocios');
  assert.equal(toolResult.executed[0].name, 'resumir_datos');
  assert.equal(toolResult.calls[1].body.contents.at(-2).parts[0].thoughtSignature, 'preserved-signature');
  assert.equal(toolResult.calls[1].body.contents.at(-1).parts[0].functionResponse.response.resultado.grupos[0].cantidad, 89);
  const toolError = await invoke({ run: () => { throw new Error('Consulta no permitida'); }, responses: [
    { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'borrar_todo', args: {} } }] } }] },
    { candidates: [{ content: { role: 'model', parts: [{ text: 'No puedo modificar datos.' }] } }] },
  ] });
  assert.equal(toolError.calls[1].body.contents.at(-1).parts[0].functionResponse.response.resultado.datosNoDisponibles, true);
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('NUNCA sustituyas un usuario por un cliente'));
  assert.ok(success.sent.body.systemInstruction.parts[0].text.includes('Frontend: Ganancia Esperada = líquidos COP'));
  console.log('Tool loop checks passed (database results, signatures, tool errors, user/client distinction, corrected formulas).');
  console.log('Capital/assets checks passed (net contributions, withdrawals, exclusion of profits, COP conversion, unavailable context).');
  console.log('AI assistant: provider scenarios and USDT regression checks passed (cross-tab purchases, >20 records, states, currencies, missing dates, sales, Bogota midnight, missing context).');
})().catch((err) => { console.error(err); process.exitCode = 1; });
