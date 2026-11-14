export interface JurisdictionCountry {
  value: string;
  label: string;
  flag: string;
  code: string;
  flagUrl?: string;
}

export const JURISDICTION_COUNTRIES: JurisdictionCountry[] = [
  { value: 'Colombia', label: 'Colombia', flag: '🇨🇴', code: 'co', flagUrl: 'https://flagcdn.com/w40/co.png' },
  { value: 'Perú', label: 'Perú', flag: '🇵🇪', code: 'pe', flagUrl: 'https://flagcdn.com/w40/pe.png' },
  { value: 'Estados Unidos', label: 'Estados Unidos', flag: '🇺🇸', code: 'us', flagUrl: 'https://flagcdn.com/w40/us.png' },
  { value: 'Brasil', label: 'Brasil', flag: '🇧🇷', code: 'br', flagUrl: 'https://flagcdn.com/w40/br.png' },
  { value: 'México', label: 'México', flag: '🇲🇽', code: 'mx', flagUrl: 'https://flagcdn.com/w40/mx.png' },
  { value: 'Chile', label: 'Chile', flag: '🇨🇱', code: 'cl', flagUrl: 'https://flagcdn.com/w40/cl.png' },
  { value: 'Argentina', label: 'Argentina', flag: '🇦🇷', code: 'ar', flagUrl: 'https://flagcdn.com/w40/ar.png' },
  { value: 'Ecuador', label: 'Ecuador', flag: '🇪🇨', code: 'ec', flagUrl: 'https://flagcdn.com/w40/ec.png' },
  { value: 'Panamá', label: 'Panamá', flag: '🇵🇦', code: 'pa', flagUrl: 'https://flagcdn.com/w40/pa.png' },
  { value: 'Uruguay', label: 'Uruguay', flag: '🇺🇾', code: 'uy', flagUrl: 'https://flagcdn.com/w40/uy.png' },
  { value: 'Venezuela', label: 'Venezuela', flag: '🇻🇪', code: 've', flagUrl: 'https://flagcdn.com/w40/ve.png' },
  { value: 'España', label: 'España', flag: '🇪🇸', code: 'es', flagUrl: 'https://flagcdn.com/w40/es.png' },
  { value: 'Bolivia', label: 'Bolivia', flag: '', code: 'bo', flagUrl: 'https://flagcdn.com/w40/bo.png' },
  { value: 'Costa Rica', label: 'Costa Rica', flag: '', code: 'cr', flagUrl: 'https://flagcdn.com/w40/cr.png' },
  { value: 'Guatemala', label: 'Guatemala', flag: '', code: 'gt', flagUrl: 'https://flagcdn.com/w40/gt.png' },
  { value: 'Honduras', label: 'Honduras', flag: '', code: 'hn', flagUrl: 'https://flagcdn.com/w40/hn.png' },
  { value: 'Nicaragua', label: 'Nicaragua', flag: '', code: 'ni', flagUrl: 'https://flagcdn.com/w40/ni.png' },
  { value: 'Paraguay', label: 'Paraguay', flag: '', code: 'py', flagUrl: 'https://flagcdn.com/w40/py.png' },
  { value: 'República Dominicana', label: 'República Dominicana', flag: '', code: 'do', flagUrl: 'https://flagcdn.com/w40/do.png' },
  { value: 'Unión Europea', label: 'Unión Europea', flag: '', code: 'eu', flagUrl: 'https://flagcdn.com/w40/eu.png' },
  { value: 'Internacional / Global', label: 'Internacional / Global', flag: '🌐', code: 'global' },
];

export function getCountryCode(paisName?: string): string {
  if (!paisName) return 'co';
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const clean = normalize(paisName.replace(/\s*\([^)]*\)\s*$/, ''));
  const country = JURISDICTION_COUNTRIES.find((item) => normalize(item.value) === clean || item.code === clean);
  if (country) return country.code;
  const aliases: Record<string, string> = { usa: 'us', us: 'us', eeuu: 'us', 'united states': 'us', brazil: 'br', col: 'co', per: 'pe', mex: 'mx', pan: 'pa', pry: 'py', global: 'global' };
  return aliases[clean] || 'global';
}

export function getCountryFlag(paisName?: string): string {
  if (!paisName) return '🇨🇴';
  const clean = paisName.trim().toLowerCase();
  if (clean.includes('colombia')) return '🇨🇴';
  if (clean.includes('peru') || clean.includes('perú')) return '🇵🇪';
  if (clean.includes('estados unidos') || clean.includes('usa') || clean.includes('eeuu')) return '🇺🇸';
  if (clean.includes('brasil') || clean.includes('brazil')) return '🇧🇷';
  if (clean.includes('mexico') || clean.includes('méxico')) return '🇲🇽';
  if (clean.includes('chile')) return '🇨🇱';
  if (clean.includes('argentina')) return '🇦🇷';
  if (clean.includes('ecuador')) return '🇪🇨';
  if (clean.includes('panama') || clean.includes('panamá')) return '🇵🇦';
  if (clean.includes('uruguay')) return '🇺🇾';
  if (clean.includes('venezuela')) return '🇻🇪';
  if (clean.includes('españa') || clean.includes('espana')) return '🇪🇸';
  if (clean.includes('cripto') || clean.includes('global') || clean.includes('internacional')) return '🌐';
  return '🏳️';
}

export function getCountryFlagUrl(paisName?: string): string | undefined {
  const code = getCountryCode(paisName);
  if (code === 'global') return undefined;
  return `https://flagcdn.com/w40/${code}.png`;
}

export function formatJurisdiction(paisName?: string): { name: string; flag: string; code: string; flagUrl?: string } {
  const name = (paisName || 'Colombia').replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Colombia';
  const code = getCountryCode(name);
  return {
    name,
    flag: getCountryFlag(name),
    code,
    flagUrl: code !== 'global' ? `https://flagcdn.com/w40/${code}.png` : undefined,
  };
}
