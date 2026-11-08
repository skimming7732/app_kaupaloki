import React, { useId } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { DetailSearchSelect } from '../common/DetailSearchSelect';
import { recordLabelClass } from './RecordDialog';

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
  const selected = compactSummary ? accounts.find((account) => account.id === value) : undefined;
  const selectedCurrency = selected?.divisa || (selected?.saldoUsdt != null || selected?.wallet ? 'USDT' : 'COP');
  const selectedBalance = selected?.saldoReal ?? selected?.saldoCop ?? selected?.saldoUsdt;
  const institution = selected?.institucion || selected?.red;
  const options = accounts.map((account) => {
    const title = accountLabel(account);
    const digital = account.saldoUsdt != null || Boolean(account.red || account.wallet);
    const currency = account.divisa || (digital ? 'USDT' : 'COP');
    const balance = account.saldoReal ?? account.saldoCop ?? account.saldoUsdt;
    const reference = account.cuenta || account.wallet;
    const maskedReference = reference ? '•••• ' + String(reference).slice(-4) : '';
    const institution = account.institucion || account.red || '';
    return {
      id: account.id,
      label: title,
      search: [title, institution, currency, account.titular, maskedReference, digital ? 'activo digital billetera' : 'activo líquido cuenta'].filter(Boolean).join(' '),
      details: (
        <span className="block min-w-0 text-xs">
          <span className="flex items-start justify-between gap-2">
            <span className="break-words font-semibold text-foreground">{title}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{currency}</span>
          </span>
          <span className="mt-0.5 block break-words text-muted-foreground">
            {[digital ? 'Activo digital' : 'Activo líquido', institution !== title && institution, account.titular, maskedReference].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-2 block text-muted-foreground">
            {balance == null ? 'Saldo no disponible' : <>
              {account.saldoReal != null ? 'Saldo actual' : 'Saldo contable'}{' '}
              <strong className="break-words tabular-nums text-foreground">{formatCurrency(balance, currency)}</strong>
            </>}
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
        showSelectedDetails={!compactSummary} required />
      {selected && (
        <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {institution && institution !== accountLabel(selected) && <span>{institution} ·</span>}
          <span>{selectedBalance == null ? selectedCurrency + ' · Saldo no disponible' : 'Saldo ' + formatCurrency(selectedBalance, selectedCurrency)}</span>
        </p>
      )}
    </div>
  );
};
