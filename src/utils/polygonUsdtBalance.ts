const USDT_POLYGON = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

export function isPolygonNetwork(network?: string | null): boolean {
  if (!network) return false;
  return /^(POLYGON|MATIC|ERC20|POL|POS)$/i.test(String(network).replace(/[\s-]+/g, ''));
}

export function isPolygonAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

// In-memory balance cache for rapid UI rendering without delay
const memoryCache: Record<string, number> = {};

export function getCachedPolygonBalance(address: string): number | null {
  const clean = address.trim().toLowerCase();
  if (memoryCache[clean] !== undefined) return memoryCache[clean];
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(`kaupaloki_polygon_${clean}`);
      if (stored !== null) {
        const val = Number(stored);
        if (Number.isFinite(val)) {
          memoryCache[clean] = val;
          return val;
        }
      }
    }
  } catch {}
  return null;
}

export function setCachedPolygonBalance(address: string, balance: number): void {
  const clean = address.trim().toLowerCase();
  memoryCache[clean] = balance;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`kaupaloki_polygon_${clean}`, String(balance));
    }
  } catch {}
}

const PUBLIC_POLYGON_RPCS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://1rpc.io/matic',
];

/**
 * Consulta el saldo USDT (PoS / ERC20) de una dirección en la red Polygon
 */
export async function readPolygonUsdtBalance(address: string, signal?: AbortSignal): Promise<number> {
  const clean = address.trim();
  if (!isPolygonAddress(clean)) {
    throw new Error('Dirección Polygon inválida.');
  }

  const cleanLower = clean.toLowerCase();
  const addressPadded = cleanLower.replace(/^0x/, '').padStart(64, '0');
  const callData = '0x70a08231' + addressPadded; // balanceOf(address)

  let lastError: any = null;

  for (const rpc of PUBLIC_POLYGON_RPCS) {
    try {
      const timeoutSignal = AbortSignal.timeout(4_000);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: combinedSignal,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: USDT_POLYGON,
              data: callData,
            },
            'latest',
          ],
        }),
      });

      if (!res.ok) continue;

      const json = await res.json();
      if (json.result && typeof json.result === 'string' && json.result.startsWith('0x')) {
        const raw = BigInt(json.result);
        const balance = Number(raw) / 1_000_000;
        setCachedPolygonBalance(cleanLower, balance);
        return balance;
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Si fallaron los RPCs por timeout de red, intentar con caché previa
  const cached = getCachedPolygonBalance(cleanLower);
  if (cached !== null) {
    return cached;
  }

  throw lastError || new Error('No se pudo consultar el saldo en la red Polygon.');
}
