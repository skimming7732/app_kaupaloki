export interface JurisdictionCountry {
  value: string;
  label: string;
  flag: string;
}

export const JURISDICTION_COUNTRIES: JurisdictionCountry[] = [
  { value: 'Colombia', label: 'Colombia', flag: '🇨🇴' },
  { value: 'Perú', label: 'Perú', flag: '🇵🇪' },
  { value: 'Estados Unidos', label: 'Estados Unidos', flag: '🇺🇸' },
  { value: 'Brasil', label: 'Brasil', flag: '🇧🇷' },
  { value: 'México', label: 'México', flag: '🇲🇽' },
  { value: 'Chile', label: 'Chile', flag: '🇨🇱' },
  { value: 'Argentina', label: 'Argentina', flag: '🇦🇷' },
  { value: 'Ecuador', label: 'Ecuador', flag: '🇪🇨' },
  { value: 'Panamá', label: 'Panamá', flag: '🇵🇦' },
  { value: 'Uruguay', label: 'Uruguay', flag: '🇺🇾' },
  { value: 'Venezuela', label: 'Venezuela', flag: '🇻🇪' },
  { value: 'España', label: 'España', flag: '🇪🇸' },
  { value: 'Internacional / Global', label: 'Internacional / Global', flag: '🌐' },
];

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

export function formatJurisdiction(paisName?: string): { name: string; flag: string } {
  const name = (paisName || 'Colombia').replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Colombia';
  return {
    name,
    flag: getCountryFlag(name),
  };
}
