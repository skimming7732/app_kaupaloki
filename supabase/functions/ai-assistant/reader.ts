import { readCatalog, technicalReference } from './catalog.ts';

const MAX_ROWS = 20000;
const numericTypes = new Set(['numeric', 'integer', 'bigint', 'smallint', 'double precision', 'real']);
const filterSchema = { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  columna: { type: 'STRING' }, operador: { type: 'STRING', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is'] },
  valor: { type: 'STRING', description: 'Valor literal. Para is, usar null, true o false.' },
}, required: ['columna', 'operador', 'valor'] } };
const tableSchema = { type: 'STRING', enum: Object.keys(readCatalog) };
export const readTools = [{ functionDeclarations: [
  { name: 'calcular_activos', description: 'Lee el último resumen_liquidacion y calcula con aritmética del servidor líquidos COP + digitales USDT * tasa. Usar para la suma de activos y copiar el total calculado, sin recalcularlo en el modelo.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'consultar_datos', description: 'Lee una página de registros actuales bajo RLS. Incluye total exacto y cobertura. No ejecuta SQL ni modifica nada. Para usuarios internos usa tabla usuarios.', parameters: {
    type: 'OBJECT', properties: { tabla: tableSchema, columnas: { type: 'ARRAY', items: { type: 'STRING' } }, filtros: filterSchema,
      ordenar_por: { type: 'STRING' }, descendente: { type: 'BOOLEAN' }, limite: { type: 'INTEGER' }, offset: { type: 'INTEGER' } }, required: ['tabla'],
  } },
  { name: 'resumir_datos', description: 'Cuenta y suma registros filtrados, opcionalmente agrupados. Para quién registra más negocios, tabla negocios y agrupar_por [created_by,created_by_name]; cantidad cuenta negocios, no clientes ni facturación. Devuelve límites explícitos.', parameters: {
    type: 'OBJECT', properties: { tabla: tableSchema, filtros: filterSchema, agrupar_por: { type: 'ARRAY', items: { type: 'STRING' } },
      sumar: { type: 'ARRAY', items: { type: 'STRING' } }, ordenar_por: { type: 'STRING', description: 'cantidad o nombre de una columna solicitada en sumar' }, limite: { type: 'INTEGER' } }, required: ['tabla'],
  } },
  { name: 'referencia_tecnica', description: 'Consulta metadatos, relaciones, firmas de funciones, fórmulas SQL documentadas y APIs. Es una instantánea técnica, no ejecuta funciones ni devuelve secretos.', parameters: {
    type: 'OBJECT', properties: { tema: { type: 'STRING', enum: ['tablas', 'relaciones', 'funciones', 'formulas', 'apis'] },
      nombre: { type: 'STRING', description: 'Tabla o función exacta; omitir para obtener índice.' } }, required: ['tema'],
  } },
] }];

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Redact embedded credentials as well as structured secret fields before returning data to Gemini.
export function redact(value: any): any {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/(secret|password|token_code|^pin$|biometric|backup_codes|authorization|api_key|service_role)/i.test(key))
    .map(([key, item]) => [key, redact(item)]));
  if (typeof value === 'string') return value
    .replace(/(?:AIza[\w-]{25,}|AQ\.[\w-]{25,}|sbp_[\w]{20,}|gsk_[\w]{20,}|sb_secret_[\w-]+)/g, '[CREDENCIAL PROTEGIDA]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[TOKEN PROTEGIDO]')
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1[PROTEGIDA]@');
  return value;
}

function bounded(value: any, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error('Límite u offset inválido.');
  return value;
}
function columns(table: string, names: any): string[] {
  if (!Object.hasOwn(readCatalog, table)) throw new Error('Tabla no disponible para consulta.');
  if (!Array.isArray(names) || names.length > 50) throw new Error('Selecciona hasta 50 columnas.');
  const allowed = new Set(readCatalog[table].map((c) => c.name));
  if (names.some((name) => typeof name !== 'string' || !allowed.has(name))) throw new Error('Columna desconocida o protegida.');
  return [...new Set(names)];
}
function addFilters(url: URL, table: string, filters: any = []) {
  if (!Array.isArray(filters) || filters.length > 10) throw new Error('Demasiados filtros.');
  for (const filter of filters) {
    columns(table, [filter.columna]);
    if (!['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is'].includes(filter.operador)) throw new Error('Operador no permitido.');
    if (typeof filter.valor !== 'string' || filter.valor.length > 250) throw new Error('Valor de filtro inválido.');
    if (filter.operador === 'is' && !['null', 'true', 'false'].includes(filter.valor)) throw new Error('Filtro is inválido.');
    url.searchParams.append(filter.columna, `${filter.operador}.${filter.valor}`);
  }
}

export async function createReader(req: Request) {
  const readDeadline = Date.now() + 100000;
  const authorization = req.headers.get('Authorization') || '';
  if (!/^Bearer \S+$/i.test(authorization)) throw new AccessError(401, 'Inicia sesión para consultar al asistente.');
  const base = Deno.env.get('SUPABASE_URL') || '';
  const apiKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const headers = { Authorization: authorization, apikey: apiKey };
  const userResponse = await fetch(`${base}/auth/v1/user`, { headers, signal: AbortSignal.timeout(15000) });
  if (!userResponse.ok) throw new AccessError(401, 'La sesión expiró. Inicia sesión de nuevo.');
  const user = await userResponse.json();
  if (typeof user.id !== 'string') throw new AccessError(401, 'Sesión inválida.');
  const profileUrl = new URL(`${base}/rest/v1/profiles`);
  profileUrl.searchParams.set('select', 'role,status');
  profileUrl.searchParams.set('id', `eq.${user.id}`);
  const profileResponse = await fetch(profileUrl, { headers, signal: AbortSignal.timeout(15000) });
  if (!profileResponse.ok) throw new AccessError(403, 'No se pudo verificar tu acceso administrativo.');
  const profiles = await profileResponse.json();
  const profile = profiles[0];
  if (!profile || !['administrador', 'admin', 'super_admin'].includes(String(profile.role).toLowerCase())
    || !['activo', 'active'].includes(String(profile.status).toLowerCase())) {
    throw new AccessError(403, 'El asistente está disponible para administradores activos.');
  }
  let usersCache: any[] | undefined;
  let calls = 0;
  const queriedAt = () => new Date().toISOString();
  async function getPage(table: string, selected: string[], args: any, offset: number, limit: number) {
    if (Date.now() >= readDeadline) throw new Error('Se agotó el tiempo de lectura. Acota el rango de fechas.');
    const readSignal = () => AbortSignal.timeout(Math.max(1, Math.min(15000, readDeadline - Date.now())));
    if (++calls > 45) throw new Error('Se alcanzó el límite de lecturas de esta consulta. Acota el rango de fechas.');
    if (table === 'usuarios') {
      if (!usersCache) {
        const res = await fetch(`${base}/rest/v1/rpc/listar_perfiles_dashboard`, { headers, signal: readSignal() });
        if (!res.ok) throw new Error('El directorio de usuarios no está disponible con tus permisos.');
        const raw = await res.json();
        usersCache = Array.isArray(raw) ? raw : [];
      }
      if (args.filtros?.length) throw new Error('Consulta el directorio sin filtros y relaciona los ids de autor.');
      let rows = [...usersCache];
      if (args.ordenar_por) rows.sort((a, b) => String(a[args.ordenar_por] ?? '').localeCompare(String(b[args.ordenar_por] ?? '')) * (args.descendente ? -1 : 1));
      return { rows: rows.slice(offset, offset + limit).map((row) => Object.fromEntries(selected.map((name) => [name, row[name] ?? null]))), total: rows.length };
    }
    const url = new URL(`${base}/rest/v1/${table}`);
    url.searchParams.set('select', selected.join(','));
    addFilters(url, table, args.filtros);
    const stableKey = readCatalog[table].some((c) => c.name === 'id') ? 'id' : readCatalog[table][0].name;
    const ordering = args.ordenar_por || stableKey;
    columns(table, [ordering]);
    const descending = args.descendente ?? ['updated_at', 'fecha', 'created_at', 'created_at_audit'].includes(ordering);
    url.searchParams.set('order', `${ordering}.${descending ? 'desc' : 'asc'}.nullslast${ordering !== stableKey ? `,${stableKey}.asc` : ''}`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));
    // GET is the only permitted database operation; no SQL, mutations or arbitrary RPC.
    const res = await fetch(url, { headers: { ...headers, Prefer: 'count=exact' }, signal: readSignal() });
    if (!res.ok) throw new Error(`No se pudo leer ${table} bajo tus permisos (HTTP ${res.status}).`);
    const range = res.headers.get('content-range')?.split('/')[1];
    const total = range && range !== '*' ? Number(range) : null;
    const rows = await res.json();
    return { rows: Array.isArray(rows) ? rows : [], total };
  }
  async function run(name: string, args: any = {}) {
    if (name === 'calcular_activos') {
      const page = await getPage('resumen_liquidacion', ['total_activos_liquidos_cop', 'total_activos_digitales_usdt', 'rate_usdt_cop', 'updated_at'], { ordenar_por: 'updated_at', descendente: true }, 0, 1);
      const row = page.rows[0];
      const fields = ['total_activos_liquidos_cop', 'total_activos_digitales_usdt', 'rate_usdt_cop'];
      if (!row || fields.some((key) => row[key] === null || row[key] === undefined || !Number.isFinite(Number(row[key]))) || Number(row.rate_usdt_cop) <= 0) {
        throw new Error('El resumen no contiene activos y una tasa válida. No se puede calcular el total.');
      }
      const liquidosCOP = Number(row.total_activos_liquidos_cop);
      const digitalesUSDT = Number(row.total_activos_digitales_usdt);
      const tasaCOPporUSDT = Number(row.rate_usdt_cop);
      const digitalesConvertidosCOP = digitalesUSDT * tasaCOPporUSDT;
      const totalActivosCOP = liquidosCOP + digitalesConvertidosCOP;
      const format = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return { fuente: 'resumen_liquidacion', consultadoEn: queriedAt(), actualizadoEn: row.updated_at,
        formula: 'líquidos COP + (digitales USDT × tasa COP/USDT)', liquidosCOP, digitalesUSDT, tasaCOPporUSDT,
        digitalesConvertidosCOP, totalActivosCOP,
        valoresCOPFormateados: { liquidos: format(liquidosCOP), digitalesConvertidos: format(digitalesConvertidosCOP), totalActivos: format(totalActivosCOP) },
        instruccion: 'Copia estos resultados calculados. No redondees unidades antes de multiplicar ni sustituyas activos por ganancias.' };
    }
    if (name === 'referencia_tecnica') {
      if (args.tema === 'tablas') return { snapshotDate: technicalReference.snapshotDate, tablas: args.nombre
        ? { [args.nombre]: technicalReference.schema[args.nombre as keyof typeof technicalReference.schema] ?? null }
        : Object.keys(technicalReference.schema), camposProtegidosNoConsultables: 'Credenciales, secretos 2FA, PIN y tokens de acceso.' };
      if (args.tema === 'relaciones') return technicalReference.relationships.filter((r) => !args.nombre || r.table_name === args.nombre);
      if (args.tema === 'funciones') return technicalReference.functions.filter((f) => !args.nombre || f.name === args.nombre);
      if (args.tema === 'formulas') return { aplicacion: technicalReference.applicationFormulas, sql: args.nombre
        ? technicalReference.formulas.filter((f) => f.name === args.nombre) : technicalReference.formulas.map((f) => ({ schema: f.schema, name: f.name })) };
      if (args.tema === 'apis') return technicalReference.apis;
      throw new Error('Tema técnico desconocido.');
    }
    if (!['consultar_datos', 'resumir_datos'].includes(name)) throw new Error('Herramienta no permitida.');
    const table = args.tabla;
    columns(table, []);
    if (args.ordenar_por && name === 'consultar_datos') columns(table, [args.ordenar_por]);
    if (name === 'consultar_datos') {
      const selected = columns(table, args.columnas ?? readCatalog[table].map((c) => c.name));
      if (!selected.length) throw new Error('Selecciona al menos una columna.');
      const offset = bounded(args.offset, 0, 10000000);
      const limit = bounded(args.limite, 50, 200);
      if (!limit) throw new Error('El límite debe ser positivo.');
      const page = await getPage(table, selected, args, offset, limit);
      return { fuente: table, consultadoEn: queriedAt(), totalFiltrado: page.total, offset, filas: page.rows,
        esMuestra: page.total === null || offset > 0 || page.rows.length < page.total, siguienteOffset: offset + page.rows.length };
    }
    const group = columns(table, args.agrupar_por ?? []);
    const sums = columns(table, args.sumar ?? []);
    if (group.length > 3 || sums.length > 6) throw new Error('Usa hasta 3 agrupadores y 6 sumas.');
    if (sums.some((name) => !numericTypes.has(readCatalog[table].find((c) => c.name === name)!.type))) throw new Error('Solo se pueden sumar columnas numéricas.');
    const sort = args.ordenar_por || 'cantidad';
    if (sort !== 'cantidad' && !sums.includes(sort)) throw new Error('Ordena por cantidad o una suma solicitada.');
    const selected = [...new Set([...group, ...sums])];
    if (!selected.length) selected.push(readCatalog[table][0].name);
    const groups = new Map<string, any>();
    let processed = 0;
    let total: number | null = null;
    while (processed < MAX_ROWS) {
      const page = await getPage(table, selected, { filtros: args.filtros }, processed, 1000);
      total = page.total;
      for (const row of page.rows) {
        const key = JSON.stringify(group.map((name) => row[name] ?? null));
        const entry = groups.get(key) || { ...Object.fromEntries(group.map((name) => [name, row[name] ?? null])), cantidad: 0,
          ...Object.fromEntries(sums.map((name) => [name, 0])) };
        entry.cantidad++;
        for (const name of sums) {
          const value = row[name] === null ? 0 : Number(row[name]);
          if (!Number.isFinite(value)) throw new Error('Valor numérico inválido; no se pudo calcular una suma fiable.');
          entry[name] += value;
        }
        groups.set(key, entry);
      }
      processed += page.rows.length;
      if (!page.rows.length || (total !== null && processed >= total)) break;
    }
    const limit = bounded(args.limite, 50, 200);
    const result = [...groups.values()].sort((a, b) => b[sort] - a[sort]);
    return { fuente: table, consultadoEn: queriedAt(), totalFiltrado: total, procesados: processed,
      completo: total !== null && processed === total, limiteFilas: MAX_ROWS,
      gruposOmitidos: Math.max(0, result.length - limit), grupos: result.slice(0, limit),
      advertencia: 'Lectura paginada, no transacción única. Si completo=false, acota las fechas; no presentes resultados parciales como totales.' };
  }
  return { run: async (name: string, args: any) => redact(await run(name, args)) };
}
