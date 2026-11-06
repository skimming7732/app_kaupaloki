import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { recordFieldClass, recordLabelClass } from './RecordDialog';

export type Account = {
  id: string; activo?: string; institucion?: string; wallet?: string; cuenta?: string; red?: string;
  divisa?: string; saldoReal?: number; saldoCop?: number; saldoUsdt?: number;
};

export const accountLabel = (account: Account) =>
  account.activo || account.institucion || account.wallet || account.id;

export const accountOptionLabel = (account: Account) => {
  const name = accountLabel(account);
  const currency = account.divisa || (account.saldoUsdt != null || account.red ? 'USDT' : 'COP');
  const balance = account.saldoReal ?? account.saldoCop ?? account.saldoUsdt;
  const detail = [name, account.institucion, account.red, account.cuenta && 'Cuenta ' + account.cuenta];
  const balanceLabel = balance == null ? currency
    : 'Saldo ' + (currency === 'COP' ? 'COP ' : '') + formatCurrency(balance, currency);
  return [...new Set(detail.filter(Boolean)), balanceLabel].join(' · ');
};

export const AccountSelect = ({ label, accounts, value, onChange }: {
  label: string;
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) => {
  const selected = accounts.find((account) => account.id === value);
  return (
    <label className={recordLabelClass}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required className={recordFieldClass}>
        <option value="">{accounts.length ? 'Seleccionar cuenta' : 'Sin cuentas configuradas'}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {accountOptionLabel(account)}
          </option>
        ))}
      </select>
      {selected && (
        <span className="block text-xs font-normal text-muted-foreground">
          {accountOptionLabel(selected)}
        </span>
      )}
    </label>
  );
};
