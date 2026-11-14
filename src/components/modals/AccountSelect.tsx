import React, { useId } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { DetailSearchSelect } from '../common/DetailSearchSelect';
import { recordLabelClass } from './RecordDialog';
import { InstitutionLogo } from '../common/InstitutionLogo';
import type { AssetInstitution } from '../../utils/institutions';

export type Account = {
  id: string;
  activo?: string;
  institucion?: string;
  wallet?: string;
  cuenta?: string;
  red?: string;
  titular?: string;
  divisa?: string;
  saldoReal?: number | null;
  saldoCop?: number | null;
  saldoUsdt?: number | null;
  institution?: AssetInstitution | null;
};

export const accountLabel = (account: Account) =>
  account.activo || account.institucion || account.wallet || account.id;

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
  const institution = selected?.institution?.name || selected?.institucion || selected?.red;
  const logo = (account: Account, sizeClass: string) => <InstitutionLogo
    name={account.institution?.name || account.institucion || accountLabel(account)}
    logoUrl={account.institution?.logo_url} websiteUrl={account.institution?.website_url}
    sizeClass={sizeClass} />;
  const options = accounts.map((account) => {
    const title = accountLabel(account);
    const digital = account.saldoUsdt != null || Boolean(account.red || account.wallet);
    const currency = account.divisa || (digital ? 'USDT' : 'COP');
    const balance = account.saldoReal ?? account.saldoCop ?? account.saldoUsdt;
    const reference = account.cuenta || account.wallet;
    const maskedReference = reference ? '•••• ' + String(reference).slice(-4) : '';
    const institution = account.institution?.name || account.institucion || '';
    const subtitle = [...new Set([institution !== title && institution, account.titular !== title && account.titular, account.red, maskedReference].filter(Boolean))].join(' · ');
    return {
      id: account.id,
      label: title,
      search: [title, institution, currency, account.titular, account.red, reference, digital ? 'activo digital billetera' : 'activo líquido cuenta'].filter(Boolean).join(' '),
      details: (
        <span className="flex min-w-0 items-start gap-3 py-1 text-xs">
          {logo(account, 'h-10 w-10')}
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0 break-words font-bold text-foreground">{title}</span>
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{currency}</span>
            </span>
            {subtitle && <span className="block break-words text-[11px] leading-relaxed text-muted-foreground">{subtitle}</span>}
            <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-t border-border pt-1.5">
              <span className="text-[10px] text-muted-foreground">{account.saldoReal != null ? 'Saldo actual' : 'Saldo contable'}</span>
              <strong className={'break-words text-sm tabular-nums ' + (balance != null && balance < 0 ? 'text-destructive' : 'text-foreground')}>
                {balance == null ? 'No disponible' : formatCurrency(balance, currency)}
              </strong>
            </span>
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
        showSelectedDetails={!compactSummary} required />
      {selected && compactSummary && (
        <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {institution && institution !== accountLabel(selected) && <span>{institution} ·</span>}
          <span>{selectedBalance == null ? selectedCurrency + ' · Saldo no disponible' : 'Saldo ' + formatCurrency(selectedBalance, selectedCurrency)}</span>
        </p>
      )}
    </div>
  );
};
