type Portal = { dispersiones?: { comprobanteUrl?: string | null }[]; [key: string]: unknown };
type Dependencies = {
  openPortal: (token: string, pin: string) => Promise<Portal | null>;
  signReceipts: (paths: string[]) => Promise<Map<string, string>>;
};

export function createPortalHandler({ openPortal, signReceipts }: Dependencies) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin') || 'https://app.kaupaloki.co';
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (!['https://app.kaupaloki.co', 'http://localhost:5173'].includes(origin)) return reply({ error: 'Origen no permitido' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply({ error: 'Método no permitido' }, 405);
    try {
      const raw = await req.text();
      if (raw.length > 2048) return reply({ error: 'Solicitud inválida' }, 400);
      const { token, pin } = JSON.parse(raw);
      if (typeof token !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)
        || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return reply(null);
      // The existing RPC validates the PIN, expiration and attempt lockout before any signing.
      const portal = await openPortal(token, pin);
      if (!portal) return reply(null);
      const receipts = (portal.dispersiones || []).flatMap(row => (row.comprobanteUrl || '').split(',').map(value => value.trim()).filter(Boolean));
      const paths = [...new Set(receipts.filter(value => value.startsWith('storage:dispersiones/')).map(value => value.slice(8)))];
      const signed = paths.length ? await signReceipts(paths) : new Map<string, string>();
      for (const row of portal.dispersiones || []) {
        row.comprobanteUrl = (row.comprobanteUrl || '').split(',').map(value => value.trim()).flatMap(value => {
          if (value.startsWith('storage:dispersiones/')) return signed.get(value.slice(8)) || [];
          return /^https:\/\//i.test(value) ? [value] : [];
        }).join(',') || null;
      }
      return reply(portal);
    } catch {
      return reply({ error: 'No se pudo abrir el portal. Inténtalo nuevamente.' }, 500);
    }
  };
}
