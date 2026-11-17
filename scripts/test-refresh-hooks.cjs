// Exercise reload transitions with React's real hook dispatcher, without network calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const React = require('react');
const { renderToString } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const admin = { user: { id: 'test-admin' }, profile: { id: 'test-admin', role: 'super_admin' } };
global.localStorage = { getItem: () => null, setItem: () => {} };

async function loadComponent(file, chart = false) {
  const result = await build({
    entryPoints: [path.join(root, file)], bundle: true, write: false,
    platform: 'node', format: 'cjs', external: ['react'],
    plugins: [{ name: 'reload-fixtures', setup(builder) {
      builder.onLoad({ filter: /(?:InicioView|AiAssistantBubble)\.tsx$/ }, ({ path: filename }) => {
        const source = fs.readFileSync(filename, 'utf8');
        return { contents: source + (chart ? '\nexport { GrowthChart as TestChart };' : ''), loader: 'tsx', resolveDir: path.dirname(filename) };
      });
      builder.onResolve({ filter: /context\/(AuthContext|DataContext)$/ }, ({ path: name }) => ({ path: name.endsWith('AuthContext') ? 'auth' : 'data', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /services\/geminiService$/ }, () => ({ path: 'gemini', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ loader: 'js', contents: {
        auth: 'export const useAuth = () => globalThis.reloadAuth;',
        data: 'export const useData = () => ({ data: { clientes: [], gastos: [], negocios: [], efectivo: [], comprasUsdt: [], ventasUsdt: [], activosLiquidos: [], activosDigitales: [] }, metrics: {}, loading: false, capitalByPerson: [] });',
        router: 'export const useLocation = () => ({ pathname: "/gastos" }); export const Link = () => null;',
        gemini: 'export const askGeminiAssistant = () => { throw new Error("Unexpected network call"); };',
      }[name] }));
    } }],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  return mod.exports;
}

async function main() {
  const { TestChart } = await loadComponent('src/views/InicioView.tsx', true);
  const { AiAssistantBubble } = await loadComponent('src/components/ai/AiAssistantBubble.tsx');
  function ChartReload() {
    const [ready, setReady] = React.useState(false);
    if (!ready) setReady(true);
    // Inline invocation keeps the same hook chain across the two render passes.
    return TestChart({ negocios: [], loading: !ready });
  }
  function ProfileReload() {
    const [ready, setReady] = React.useState(false);
    global.reloadAuth = ready ? admin : { user: admin.user, profile: null };
    if (!ready) setReady(true);
    return AiAssistantBubble({});
  }
  for (const Component of [ChartReload, ProfileReload]) {
    const run = () => renderToString(React.createElement(Component));
    assert.doesNotThrow(run);
  }
  global.reloadAuth = { user: admin.user, profile: { role: 'operador' } };
  assert.equal(renderToString(React.createElement(AiAssistantBubble)), '');
  console.log('PASS: chart/profile reload transitions and assistant role protection');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
