export function formatCop(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatUsd(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDecimal(amount: number, decimals = 2): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
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
