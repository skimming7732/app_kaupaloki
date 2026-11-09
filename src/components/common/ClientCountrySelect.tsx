import React from 'react';
import { CLIENT_COUNTRIES, findClientCountry } from '../../data/clientCountries';

export function ClientCountrySelect({ id, value, onChange, className, keepLegacy }: {
  id: string;
  value: string;
  onChange: (country: string) => void;
  className: string;
  keepLegacy?: boolean;
}) {
  const isLegacy = keepLegacy && value && !CLIENT_COUNTRIES.some((country) => country.value === value);

  return (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={className} required>
      {isLegacy && <option value={value}>{findClientCountry(value)?.label ?? value} (actual)</option>}
      {CLIENT_COUNTRIES.map((country) => (
        <option key={country.iso} value={country.value}>{country.label} ({country.iso})</option>
      ))}
    </select>
  );
}
