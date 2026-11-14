import React, { useId } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { DetailSearchSelect } from '../common/DetailSearchSelect';
import { recordLabelClass } from './RecordDialog';
import { InstitutionLogo } from '../common/InstitutionLogo';
import type { AssetInstitution } from '../../utils/institutions';
import { JURISDICTION_COUNTRIES } from '../../utils/countryJurisdiction';

export type Account = {
  id: string;
  activo?: string;
  institucion?: string;
  wallet?: string;
  cuenta?: string;
  red?: string;
  titular?: string;
  divisa?: string;
  pais?: string;
  saldoReal?: number | null;
  saldoCop?: number | null;
  saldoUsdt?: number | null;
  institution?: AssetInstitution | null;
};

export const accountLabel = (account: Account) =>
  account.activo || account.institucion || account.wallet || account.id;

const normalizeDetail = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const balanceLabel = (balance: number | null | undefined, currency: string) =>
  balance == null ? 'Saldo no disponible' : formatCurrency(balance, currency) + (currency === 'COP' ? ' COP' : '');

export const AccountSelect = ({ label, accounts, name, value, onChange, compactSummary }: {
  label: string;
  accounts: Account[];
  name?: string;
  value: string;
  onChange: (id: string) => void;
  compactSummary?: boolean;
}) => {
  const id = useId();
  const selected = accounts.find((account) => account.id === value);
  const selectedCurrency = selected?.divisa || (selected?.saldoUsdt != null || selected?.wallet ? 'USDT' : 'COP');
  const selectedBalance = selected?.saldoReal ?? selected?.saldoCop ?? selected?.saldoUsdt;
  const logo = (account: Account, sizeClass: string) => {
    const countryName = normalizeDetail((account.pais || '').replace(/\s*\([^)]*\)\s*$/, ''));
    const jurisdiction = JURISDICTION_COUNTRIES.find((country) => countryName &&
      (normalizeDetail(country.value) === countryName || country.code === countryName));
    return <span className="relative inline-flex shrink-0">
      <InstitutionLogo name={account.institution?.name || account.institucion || accountLabel(account)}
        logoUrl={account.institution?.logo_url} websiteUrl={account.institution?.website_url} sizeClass={sizeClass} />
      {jurisdiction?.flagUrl && <img src={jurisdiction.flagUrl} alt={jurisdiction.label} title={'Jurisdicción: ' + jurisdiction.label}
        width={12} height={8} loading="lazy"
        className="absolute -bottom-0.5 -right-1 h-2 w-3 rounded-[1px] object-cover ring-1 ring-card"
        onError={(event) => { event.currentTarget.hidden = true; }} />}
    </span>;
  };
  const options = accounts.map((account) => {
    const title = accountLabel(account);
    const digital = account.saldoUsdt != null || Boolean(account.red || account.wallet);
    const currency = account.divisa || (digital ? 'USDT' : 'COP');
    const balance = account.saldoReal ?? account.saldoCop ?? account.saldoUsdt;
    const reference = account.cuenta || account.wallet;
    const maskedReference = reference ? '•••• ' + String(reference).slice(-4) : '';
    const institution = account.institution?.name || account.institucion || '';
    const seen = [normalizeDetail(title)];
    const subtitle = [institution, account.titular, account.red, maskedReference].filter((detail) => {
      if (!detail) return false;
      const key = normalizeDetail(detail);
      if (!key || seen.some((existing) => (` ${existing} `).includes(` ${key} `))) return false;
      seen.push(key);
      return true;
    }).join(' · ');
    return {
      id: account.id,
      label: title,
      search: [title, institution, currency, account.titular, account.red, account.pais, reference, digital ? 'activo digital billetera' : 'activo líquido cuenta'].filter(Boolean).join(' '),
      details: (
        <span className="flex min-w-0 items-center gap-2 text-xs">
          {logo(account, 'h-7 w-7')}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate font-semibold text-foreground" title={title}>{title}</span>
              <strong className={'shrink-0 text-[11px] tabular-nums ' + (balance != null && balance < 0 ? 'text-destructive' : 'text-foreground')}
                title={account.saldoReal != null ? 'Saldo actual' : 'Saldo contable'}>
                {balanceLabel(balance, currency)}
              </strong>
            </span>
            {subtitle && <span className="mt-0.5 block truncate text-[10px] text-muted-foreground" title={subtitle}>{subtitle}</span>}
          </span>
        </span>
      ),
    };
  });

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className={recordLabelClass}>{label}</label>
      <DetailSearchSelect id={id} name={name} value={value} options={options} onChange={onChange}
        placeholder="Buscar cuenta o billetera" emptyMessage="No se encontraron activos disponibles."
        leadingVisual={selected ? logo(selected, 'h-6 w-6') : undefined}
        showSelectedDetails={false} required />
      {selected && (
        <p className={(compactSummary ? 'text-[11px]' : 'text-xs') + ' text-muted-foreground'}>
          {selectedBalance == null ? 'Saldo no disponible' : 'Saldo ' + balanceLabel(selectedBalance, selectedCurrency)}
        </p>
      )}
    </div>
  );
};
