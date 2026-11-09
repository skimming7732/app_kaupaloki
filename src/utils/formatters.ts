const numberFormatters = new Map<string, Intl.NumberFormat>();

export const normalizeSearch = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function formatNumber(value: number | undefined | null, minimum = 0, maximum = minimum): string {
  const key = minimum + ':' + maximum;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: minimum, maximumFractionDigits: maximum });
    numberFormatters.set(key, formatter);
  }
  const number = Number(value);
  return formatter.format(Number.isFinite(number) ? number : 0);
}

export const formatDecimal = (amount: number, decimals = 2) => formatNumber(amount, decimals);
export const formatRate = (amount: number) => formatNumber(amount, 4);
export const formatCop = (amount: number, decimals = 2) => '$' + formatNumber(amount, decimals);
export const formatCOP = (amount: number | undefined | null) => '$' + formatNumber(amount, 0, 2);
export const formatUsd = formatCop;
export const formatUSD = (amount: number | undefined | null, decimals = 2) => '$' + formatNumber(amount, decimals);

export function formatCurrency(amount: number | undefined | null, currencyCode = 'USD'): string {
  return currencyCode === 'COP' ? formatCOP(amount) : currencyCode + ' ' + formatNumber(amount, 2);
}

export const todayBogota = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());

export function formatDate(val: string | number | Date | undefined | null): string {
  if (!val) return '-';
  try {
    // Extract calendar YYYY-MM-DD directly from any ISO date/timestamp string to avoid UTC-to-local day shift
    if (typeof val === 'string') {
      const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, yyyy, mm, dd] = match;
        return `${dd}/${mm}/${yyyy.slice(-2)}`;
      }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
}

const extractTimestampMs = (item: any): number | null => {
  if (!item) return null;
  const rawTs =
    item.createdAtAudit ||
    item.created_at_audit ||
    item.raw?.created_at_audit ||
    item.raw?.createdAtAudit ||
    item.createdAt ||
    item.created_at ||
    item.raw?.created_at ||
    item.raw?.createdAt ||
    (typeof item.fecha === 'string' && item.fecha.length > 10 && !item.fecha.includes('00:00:00') ? item.fecha : null);
  if (!rawTs) return null;
  const s = String(rawTs);
  if (s.startsWith('2026-11-06 17:27:41') || s.startsWith('2026-11-06T17:27:41')) {
    return null;
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
};

const extractCodeSequence = (item: any): number | null => {
  if (!item) return null;
  const num = item.numero ?? item.raw?.numero;
  if (num !== undefined && num !== null && Number.isFinite(Number(num))) {
    return Number(num);
  }
  const code = String(item.codigo || item.origen || '');
  const match = code.match(/(\d+)(?:-FEE|-PAGO|-INGRESO)?$/i);
  return match ? Number(match[1]) : null;
};

export function compareChronologicalAsc(a: any, b: any, useSequenceFallback = false): number {
  const dateA = String(a?.fecha || '').slice(0, 10);
  const dateB = String(b?.fecha || '').slice(0, 10);
  const dateCmp = dateA.localeCompare(dateB);
  if (dateCmp !== 0) return dateCmp;

  const tsA = extractTimestampMs(a);
  const tsB = extractTimestampMs(b);
  if (tsA !== null && tsB !== null && tsA !== tsB) {
    return tsA - tsB;
  }
  if (tsA !== null && tsB === null) return 1;
  if (tsA === null && tsB !== null) return -1;

  const codeA = String(a?.origen || a?.codigo || '');
  const codeB = String(b?.origen || b?.codigo || '');
  if (codeA && codeB) {
    if (codeB === codeA + '-FEE') return -1;
    if (codeA === codeB + '-FEE') return 1;
  }

  if (useSequenceFallback) {
    const seqA = extractCodeSequence(a);
    const seqB = extractCodeSequence(b);
    if (seqA !== null && seqB !== null && seqA !== seqB) {
      return seqA - seqB;
    }
  }
  return 0;
}

export function compareChronologicalDesc(a: any, b: any): number {
  return -compareChronologicalAsc(a, b, true);
}

export function computeUserCode(name: string, role: string, country: string, num: number = 1): string {
  let rolePrefix = 'OP';
  const r = (role || '').toUpperCase();
  if (r.includes('SUPER') || r === 'SUPER ADMIN') {
    rolePrefix = 'SA';
  } else if (r.includes('ADMIN') || r === 'ADMINISTRADOR') {
    rolePrefix = 'AD';
  } else if (r.includes('CLIENT') || r === 'CLIENTE') {
    rolePrefix = 'CL';
  } else if (r.includes('DISPERS')) {
    rolePrefix = 'DS';
  } else {
    rolePrefix = 'OP';
  }
  const paddedNum = String(num || 1).padStart(3, '0');
  const firstWord = (name || 'USR').trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'USR';
  const cleanCountry = (country || 'COL').trim().slice(0, 3).toUpperCase();
  return `U${rolePrefix}${paddedNum}-${firstWord}-${cleanCountry}`;
}

export const fallbackBanderaUrl: Record<string, string> = {
  BRL: 'https://flagcdn.com/w80/br.png',
  PEN: 'https://flagcdn.com/w80/pe.png',
  'USD-EC': 'https://flagcdn.com/w80/ec.png',
  HNL: 'https://flagcdn.com/w80/hn.png',
  VES: 'https://flagcdn.com/w80/ve.png',
  USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
  'USD-PY': 'https://flagcdn.com/w80/py.png',
  USD: 'https://flagcdn.com/w80/us.png',
  ARS: 'https://flagcdn.com/w80/ar.png',
  UYU: 'https://flagcdn.com/w80/uy.png',
  CLP: 'https://flagcdn.com/w80/cl.png',
  COP: 'https://flagcdn.com/w80/co.png',
  MXN: 'https://flagcdn.com/w80/mx.png',
};
