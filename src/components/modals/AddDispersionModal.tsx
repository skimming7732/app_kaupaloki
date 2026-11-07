import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useEffect, useId, useState } from 'react';
import { useAirtable, type NormalizedData } from '../../context/AirtableContext';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { supabase } from '../../lib/supabase';
import { AccountSelect, accountLabel, type Account } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddDispersionModalProps {
  isOpen: boolean;
  record?: NormalizedData['dispersiones'][number];
  onClose: () => void;
}

export const AddDispersionModal = ({ isOpen, onClose, record }: AddDispersionModalProps) =>
  isOpen ? <DispersionForm key={record?.id} onClose={onClose} record={record} /> : null;

const DispersionForm = ({ onClose, record }: Pick<AddDispersionModalProps, 'onClose' | 'record'>) => {
  const { data, createDispersion, updateDispersion, deleteDispersion } = useAirtable();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const clientInputId = useId();
  const [clienteId, setClienteId] = useState(record?.clienteId || '');
  const [accountId, setAccountId] = useState(record?.origenFondosId || '');
  const [remoteAccounts, setRemoteAccounts] = useState<Account[]>([]);
  const [useLegacyAccounts, setUseLegacyAccounts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accounts = useLegacyAccounts ? data.activosLiquidos as Account[] : remoteAccounts;

  useEffect(() => {
    let active = true;
    void supabase.rpc('cuentas_para_dispersion').then(({ data: accounts, error }) => {
      if (!active) return;
      if (error?.code === 'PGRST202') setUseLegacyAccounts(true);
      else if (error) setError('No se pudieron cargar las cuentas de origen.');
      else setRemoteAccounts(accounts || []);
    });
    return () => { active = false; };
  }, []);

    const handleDelete = async () => {
    if (!record) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar esta dispersión por ${formatCOP(record.monto)}?`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ok = await deleteDispersion(record.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar la dispersión.');
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const monto = parseAmountInput(String(fields.get('monto') ?? ''));
    const account = accounts.find((item) => item.id === accountId || (!accountId && accountLabel(item) === record?.origenFondos));
    if (!clienteId || !account || !Number.isFinite(monto) || monto <= 0) {
      setError('Selecciona un cliente y una cuenta de origen e ingresa un monto mayor que cero.');
      return;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      const success = await (record ? updateDispersion : createDispersion)({
        id: record?.id,
        clienteId,
        monto,
        origenFondosId: account.id,
        origenFondos: accountLabel(account),
        fecha: fields.get('fecha'),
        referencia: String(fields.get('referencia')).trim(),
        comprobanteUrl: record ? undefined : await uploadReceipt(fields.get('comprobante'), 'dispersiones'),
      });
      if (!success) throw new Error();
      finishSound(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo registrar la dispersión.');
    } finally {
      finishSound(false);
      setBusy(false);
    }
  };

  return (
    <RecordDialog title={record ? "Editar dispersión" : "Registrar dispersión"} description="Registra una transferencia a un cliente desde una cuenta operativa." icon="ri-send-plane-line" busy={busy} error={error} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={clientInputId} className={recordLabelClass}>Cliente</label>
            <ClientSearchSelect id={clientInputId} value={clienteId} onChange={setClienteId} required inputClassName="min-h-11" />
          </div>
          <AccountSelect label="Cuenta de origen" accounts={accounts} value={accountId || accounts.find((item) => accountLabel(item) === record?.origenFondos)?.id || ''} onChange={setAccountId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={recordLabelClass}>
              <span>Monto (COP)</span>
              <input type="text" inputMode="decimal" name="monto" defaultValue={record ? formatAmountInput(String(record.monto)) : undefined} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
            </label>
            <label className={recordLabelClass}>
              <span>Fecha</span>
              <input type="date" name="fecha" required defaultValue={record?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10)} className={recordFieldClass} />
            </label>
          </div>
          <label className={recordLabelClass}>
            <span>Referencia (opcional)</span>
            <input name="referencia" defaultValue={record?.referencia} className={recordFieldClass} />
          </label>
          {!record && <ReceiptInput />}
        </fieldset>
        <RecordActions busy={busy} label={record ? "Guardar cambios" : "Registrar dispersión"} onClose={onClose} onDelete={record && isAdmin ? handleDelete : undefined} deleteLabel="Eliminar dispersión" />
      </form>
    </RecordDialog>
  );
};
