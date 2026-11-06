import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useEffect, useId, useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { supabase } from '../../lib/supabase';
import { AccountSelect, accountLabel, type Account } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddDispersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddDispersionModal = ({ isOpen, onClose }: AddDispersionModalProps) =>
  isOpen ? <DispersionForm onClose={onClose} /> : null;

const DispersionForm = ({ onClose }: Pick<AddDispersionModalProps, 'onClose'>) => {
  const { data, createDispersion } = useAirtable();
  const clientInputId = useId();
  const [clienteId, setClienteId] = useState('');
  const [accountId, setAccountId] = useState('');
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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const monto = Number(fields.get('monto'));
    const account = accounts.find((item) => item.id === accountId);
    if (!clienteId || !account || !Number.isFinite(monto) || monto <= 0) {
      setError('Selecciona un cliente y una cuenta de origen e ingresa un monto mayor que cero.');
      return;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      const success = await createDispersion({
        clienteId,
        monto,
        origenFondosId: account.id,
        origenFondos: accountLabel(account),
        fecha: fields.get('fecha'),
        referencia: String(fields.get('referencia')).trim(),
        comprobanteUrl: String(fields.get('comprobanteUrl')).trim(),
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
    <RecordDialog title="Registrar dispersión" description="Registra una transferencia a un cliente desde una cuenta operativa." icon="ri-send-plane-line" busy={busy} error={error} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={clientInputId} className={recordLabelClass}>Cliente</label>
            <ClientSearchSelect id={clientInputId} value={clienteId} onChange={setClienteId} required inputClassName="min-h-11" />
          </div>
          <AccountSelect label="Cuenta de origen" accounts={accounts} value={accountId} onChange={setAccountId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={recordLabelClass}>
              <span>Monto (COP)</span>
              <input type="number" name="monto" step="any" min="0" required className={recordFieldClass} />
            </label>
            <label className={recordLabelClass}>
              <span>Fecha</span>
              <input type="date" name="fecha" required defaultValue={new Date().toISOString().slice(0, 10)} className={recordFieldClass} />
            </label>
          </div>
          <label className={recordLabelClass}>
            <span>Referencia (opcional)</span>
            <input name="referencia" className={recordFieldClass} />
          </label>
          <label className={recordLabelClass}>
            <span>Enlace del comprobante (opcional)</span>
            <input type="url" name="comprobanteUrl" pattern="https?://.+" placeholder="https://…" className={recordFieldClass} />
          </label>
        </fieldset>
        <RecordActions busy={busy} label="Registrar dispersión" onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
