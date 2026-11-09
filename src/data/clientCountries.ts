import { normalizeSearch } from '../utils/formatters';

export const CLIENT_COUNTRIES = [
  ['Argentina', 'ARG'],
  ['Belice', 'BLZ'],
  ['Bolivia', 'BOL'],
  ['Brasil', 'BRA'],
  ['Canadá', 'CAN'],
  ['Chile', 'CHL'],
  ['China', 'CHN'],
  ['Colombia', 'COL'],
  ['Costa Rica', 'CRI'],
  ['Cuba', 'CUB'],
  ['Ecuador', 'ECU'],
  ['El Salvador', 'SLV'],
  ['España', 'ESP'],
  ['Estados Unidos', 'USA'],
  ['Guatemala', 'GTM'],
  ['Guinea Ecuatorial', 'GNQ'],
  ['Honduras', 'HND'],
  ['Hong Kong', 'HKG'],
  ['México', 'MEX'],
  ['Nicaragua', 'NIC'],
  ['Panamá', 'PAN'],
  ['Paraguay', 'PRY'],
  ['Perú', 'PER'],
  ['Portugal', 'PRT'],
  ['Puerto Rico', 'PRI'],
  ['República Dominicana', 'DOM'],
  ['Uruguay', 'URY'],
  ['Venezuela', 'VEN'],
].map(([label, iso]) => ({ label, iso, value: normalizeSearch(label).toUpperCase() }));

export function findClientCountry(value: string) {
  const country = normalizeSearch(value.trim()).toUpperCase().replace(/\s*\([A-Z]{3}\)$/, '');
  return CLIENT_COUNTRIES.find((option) =>
    option.value === country || option.iso === country || (option.iso === 'USA' && country === 'EEUU')
  );
}

export function getClientCountryIso(value?: string) {
  return value ? findClientCountry(value)?.iso ?? value.trim().toUpperCase().slice(0, 3) : 'COL';
}
