import React, { useId, useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { AccountSelect, accountLabel } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddEfectivoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEfectivoModal = ({ isOpen, onClose }: AddEfectivoModalProps) =>
  isOpen ? <EfectivoForm onClose={onClose} /> : null;

const EfectivoForm = ({ onClose }: Pick<AddEfectivoModalProps, 'onClose'>) => {
  const { data, createMovimientoEfectivo, createCliente } = useAirtable();
  const id = useId();
  const [tipo, setTipo] = useState<'Ingreso' | 'Pago'>('Pago');
  const [clienteId, setClienteId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const back = () => {
    setAddingClient(false);
    setError('');
  };

  const saveClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !name.trim()) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await createCliente(name.trim(), String(fields.get('pais')).trim());
      if (!result?.success || !result.id) throw new Error();
      setClienteId(result.id);
      back();
    } catch {
      setError('No se pudo guardar el cliente. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const montoCop = Number(fields.get('monto'));
    const account = data.activosLiquidos.find((item) => item.id === accountId);
    if (!account || (tipo === 'Pago' && !clienteId) || !Number.isFinite(montoCop) || montoCop <= 0) {
      setError('Selecciona una cuenta, completa el cliente si es un pago e ingresa un monto mayor que cero.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const success = await createMovimientoEfectivo({
        tipo, montoCop, clienteId, origenFondosId: account.id, origenFondos: accountLabel(account),
        fecha: fields.get('fecha'), referencia: String(fields.get('referencia')).trim(),
      });
      if (!success) throw new Error();
      onClose();
    } catch {
      setError('No se pudo registrar el movimiento. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <RecordDialog
      title={addingClient ? 'Agregar cliente' : 'Registrar movimiento de efectivo'}
      description={addingClient ? 'El cliente quedará asignado al movimiento.' : 'Registra un ingreso o un pago y elige la cuenta de caja.'}
      icon={addingClient ? 'ri-user-add-line' : 'ri-money-dollar-circle-line'}
      busy={busy} error={error} onClose={addingClient ? back : onClose}
    >
      {addingClient && (
        <form onSubmit={saveClient} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className={recordLabelClass}>
              <span>Nombre completo o empresa</span>
              <input autoFocus required value={name} onChange={(event) => setName(event.target.value)} className={recordFieldClass} />
            </label>
            <label className={recordLabelClass}>
              <span>País</span>
              <input name="pais" defaultValue="Colombia" className={recordFieldClass} />
            </label>
          </fieldset>
          <RecordActions busy={busy} label="Guardar y seleccionar" onClose={back} />
        </form>
      )}
      <form hidden={addingClient} onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy || addingClient} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={recordLabelClass}>
              <span>Tipo de movimiento</span>
              <select value={tipo} onChange={(event) => setTipo(event.target.value as 'Ingreso' | 'Pago')} className={recordFieldClass}>
                <option value="Pago">Pago a cliente</option>
                <option value="Ingreso">Ingreso a caja</option>
              </select>
            </label>
            <label className={recordLabelClass}>
              <span>Fecha</span>
              <input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={recordFieldClass} />
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={id} className={recordLabelClass}>Cliente {tipo === 'Ingreso' && '(opcional)'}</label>
            <ClientSearchSelect
              id={id}
              value={clienteId}
              onChange={setClienteId}
              required={tipo === 'Pago'}
              inputClassName="min-h-11"
              onAddNewClient={(query) => {
                setName(clienteId ? '' : (query || '').trim());
                setError('');
                setAddingClient(true);
              }}
            />
          </div>
          <AccountSelect label="Cuenta de caja" accounts={data.activosLiquidos} value={accountId} onChange={setAccountId} />
          <label className={recordLabelClass}>
            <span>Monto (COP)</span>
            <input name="monto" type="number" step="any" min="0" required className={recordFieldClass} />
          </label>
          <label className={recordLabelClass}>
            <span>Referencia o PIN (opcional)</span>
            <input name="referencia" className={recordFieldClass} />
          </label>
        </fieldset>
        <RecordActions busy={busy} label={tipo === 'Pago' ? 'Registrar pago' : 'Registrar ingreso'} onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
