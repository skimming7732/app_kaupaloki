export function formatCop(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return '$' + new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCOP(val: number | undefined | null): string {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatUsd(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatUSD(val: number | undefined | null, decimals: number = 2): string {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatDecimal(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(amount: number | undefined | null, currencyCode: string = 'USD'): string {
  const n = Number(amount) || 0;
  if (currencyCode === 'COP') return formatCOP(n);
  return `${currencyCode} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export function formatDate(val: string | number | Date | undefined | null): string {
  if (!val) return '-';
  try {
    // If it's a string like "2026-11-05" without time, parse parts directly to avoid timezone shift
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      const [yyyy, mm, dd] = val.trim().split('-');
      const yy = yyyy.slice(-2);
      return `${dd}/${mm}/${yy}`;
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

export function computeUserAirtableCode(name: string, role: string, country: string, num: number = 1): string {
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
