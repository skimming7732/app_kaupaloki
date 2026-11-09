const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export function isTronNetwork(network?: string | null) {
  return /^(TRC20|TRON(?:\(?TRC20\)?)?)$/i.test((network || 'TRC20').replace(/[\s-]+/g, ''));
}

export function isTronAddress(value: string) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value);
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

export async function readTronUsdtBalance(address: string, signal: AbortSignal): Promise<number> {
  const parameter = await encodeBalanceOwner(address);
  const response = await fetch('https://api.trongrid.io/walletsolidity/triggerconstantcontract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    body: JSON.stringify({
      owner_address: address,
      contract_address: USDT_TRC20,
      function_selector: 'balanceOf(address)',
      parameter,
      visible: true,
    }),
  });
  if (!response.ok) throw new Error('No se pudo consultar TRON.');

  const result = await response.json();
  const raw = result?.constant_result?.[0];
  if (result?.result?.result !== true || typeof raw !== 'string' || !/^[a-f0-9]{64}$/i.test(raw)) {
    throw new Error('TRON no devolvió un saldo verificable.');
  }

  // USDT on TRON uses six decimals. A confirmed zero is also a valid balance.
  return Number(BigInt('0x' + raw)) / 1_000_000;
}
