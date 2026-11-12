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
  { value: 'Internacional / Global', label: 'Internacional / Global', flag: '🌐', code: 'global' },
];

export function getCountryCode(paisName?: string): string {
  if (!paisName) return 'co';
  const clean = paisName.trim().toLowerCase();
  if (clean.includes('colombia')) return 'co';
  if (clean.includes('peru') || clean.includes('perú')) return 'pe';
  if (clean.includes('estados unidos') || clean.includes('usa') || clean.includes('eeuu')) return 'us';
  if (clean.includes('brasil') || clean.includes('brazil')) return 'br';
  if (clean.includes('mexico') || clean.includes('méxico')) return 'mx';
  if (clean.includes('chile')) return 'cl';
  if (clean.includes('argentina')) return 'ar';
  if (clean.includes('ecuador')) return 'ec';
  if (clean.includes('panama') || clean.includes('panamá')) return 'pa';
  if (clean.includes('uruguay')) return 'uy';
  if (clean.includes('venezuela')) return 've';
  if (clean.includes('españa') || clean.includes('espana')) return 'es';
  if (clean.includes('cripto') || clean.includes('global') || clean.includes('internacional')) return 'global';
  return 'co';
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
