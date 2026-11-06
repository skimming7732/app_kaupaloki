import React from 'react';
import { recordFieldClass, recordLabelClass } from './RecordDialog';

export type Account = { id: string; activo?: string; institucion?: string; wallet?: string; cuenta?: string; red?: string };

export const accountLabel = (account: Account) =>
  [account.activo || account.institucion || account.wallet || account.id, account.cuenta || account.red].filter(Boolean).join(' · ');

export const AccountSelect = ({ label, accounts, value, onChange }: {
  label: string;
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <label className={recordLabelClass}>
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} required className={recordFieldClass}>
      <option value="">{accounts.length ? 'Seleccionar cuenta' : 'Sin cuentas configuradas'}</option>
      {accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}
    </select>
  </label>
);
