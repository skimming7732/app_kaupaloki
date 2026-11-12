const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export function isTronNetwork(network?: string | null) {
  return /^(TRC20|TRON(?:\(?TRC20\)?)?)$/i.test((network || 'TRC20').replace(/[\s-]+/g, ''));
}

export function isTronAddress(value: string) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
}

// In-memory balance cache for rapid UI rendering without delay
const memoryCache: Record<string, number> = {};

export function getCachedTronBalance(address: string): number | null {
  const clean = address.trim();
  if (memoryCache[clean] !== undefined) return memoryCache[clean];
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(`kaupaloki_tron_${clean}`);
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

export function setCachedTronBalance(address: string, balance: number): void {
  const clean = address.trim();
  memoryCache[clean] = balance;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`kaupaloki_tron_${clean}`, String(balance));
    }
  } catch {}
}

async function encodeBalanceOwner(address: string) {
  if (!isTronAddress(address)) throw new Error('Dirección TRON inválida.');

  let value = 0n;
  for (const char of address) value = value * 58n + BigInt(BASE58.indexOf(char));
  const hex = value.toString(16).padStart(50, '0');
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], (part) => Number.parseInt(part, 16));
  const payload = bytes.slice(0, 21);
  const firstHash = await crypto.subtle.digest('SHA-256', payload);
  const checksum = new Uint8Array(await crypto.subtle.digest('SHA-256', firstHash));
  if (bytes.length !== 25 || bytes[0] !== 0x41 || bytes.slice(21).some((byte, index) => byte !== checksum[index])) {
    throw new Error('Dirección TRON inválida.');
  }
  return hex.slice(2, 42).padStart(64, '0');
}

/**
 * Consulta el saldo USDT (TRC20) desde TronScan (alta velocidad ~200ms)
 */
async function fetchBalanceFromTronscan(address: string, signal: AbortSignal): Promise<number> {
  const timeoutSignal = AbortSignal.timeout(4_000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const url = `https://apilist.tronscanapi.com/api/account/token_asset_overview?address=${encodeURIComponent(address)}`;
  const response = await fetch(url, { signal: combinedSignal });
  if (!response.ok) throw new Error(`TronScan responded with ${response.status}`);

  const json = await response.json();
  const tokenList: Array<{ tokenId?: string; tokenSymbol?: string; balance?: number | string }> = json?.data || [];
  const usdt = tokenList.find((t) => t.tokenId === USDT_TRC20 || String(t.tokenSymbol).toUpperCase() === 'USDT');

  if (usdt && usdt.balance !== undefined && usdt.balance !== null) {
    const rawVal = Number(usdt.balance);
    if (Number.isFinite(rawVal)) {
      return rawVal / 1_000_000;
    }
  }

  // Si la cuenta existe en Tron pero no tiene token USDT, el saldo es 0
  if (json?.totalAssetInUsd !== undefined || tokenList.length > 0) {
    return 0;
  }

  throw new Error('TronScan no devolvió datos concluyentes.');
}

/**
 * Consulta el saldo llamando al contrato TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t en Trongrid
 */
async function fetchBalanceFromTrongrid(address: string, signal: AbortSignal): Promise<number> {
  const parameter = await encodeBalanceOwner(address);
  const timeoutSignal = AbortSignal.timeout(5_000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const response = await fetch('https://api.trongrid.io/walletsolidity/triggerconstantcontract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: combinedSignal,
    body: JSON.stringify({
      owner_address: address,
      contract_address: USDT_TRC20,
      function_selector: 'balanceOf(address)',
      parameter,
      visible: true,
    }),
  });

  if (!response.ok) throw new Error('No se pudo consultar TRON en Trongrid.');

  const result = await response.json();
  const raw = result?.constant_result?.[0];
  if (result?.result?.result !== true || typeof raw !== 'string' || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error('TRON no devolvió un saldo verificable.');
  }

  return Number(BigInt('0x' + raw)) / 1_000_000;
}

/**
 * Lee el saldo USDT de una dirección TRON con estrategia multi-fuente ultrarrápida y fallback de caché
 */
export async function readTronUsdtBalance(address: string, signal: AbortSignal): Promise<number> {
  const cleanAddress = address.trim();

  try {
    // 1. Intento primario ultra rápido: TronScan API (~200ms)
    const balance = await fetchBalanceFromTronscan(cleanAddress, signal);
    setCachedTronBalance(cleanAddress, balance);
    return balance;
  } catch (err1) {
    // 2. Intento secundario: Trongrid RPC directo
    try {
      const balance = await fetchBalanceFromTrongrid(cleanAddress, signal);
      setCachedTronBalance(cleanAddress, balance);
      return balance;
    } catch (err2) {
      // 3. Si ambas fallaron por red o timeout, usar caché previo si existe
      const cached = getCachedTronBalance(cleanAddress);
      if (cached !== null) {
        return cached;
      }
      throw err2;
    }
  }
}
