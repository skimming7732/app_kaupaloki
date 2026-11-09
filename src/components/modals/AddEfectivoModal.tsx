import { formatAmountField, parseAmountInput } from '../../utils/amountInput';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { todayBogota } from '../../utils/formatters';
import React, { useId, useState } from 'react';
import { useData } from '../../context/DataContext';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { accountLabel } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddEfectivoModalProps {
  isOpen: boolean;
  initialClienteId?: string;
  onClose: () => void;
}

export const AddEfectivoModal = ({ isOpen, initialClienteId, onClose }: AddEfectivoModalProps) =>
  isOpen ? <EfectivoForm key={initialClienteId} initialClienteId={initialClienteId} onClose={onClose} /> : null;

const EfectivoForm = ({ initialClienteId, onClose }: Omit<AddEfectivoModalProps, 'isOpen'>) => {
  const { data, createMovimientoEfectivo, createCliente } = useData();
  const id = useId();
  const [tipo, setTipo] = useState<'Ingreso' | 'Pago'>('Pago');
  const [clienteId, setClienteId] = useState(initialClienteId || '');
  const [name, setName] = useState('');
  const [addingClient, setAddingClient] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cashAccount = data.activosLiquidos.find((account) =>
    account.activo?.trim().toUpperCase() === 'EFECTIVO-CAJA' && (account.divisa || 'COP').toUpperCase() === 'COP',
  );

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
    const finishSound = prepareSuccessSound();
    try {
      const result = await createCliente(name.trim(), String(fields.get('pais')).trim());
      if (!result?.success || !result.id) throw new Error();
      setClienteId(result.id);
      finishSound(true);
      back();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo guardar el cliente.');
    } finally {
      finishSound(false);
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const montoCop = parseAmountInput(String(fields.get('monto') ?? ''));
    const referencia = String(fields.get('referencia')).trim();
    if (!referencia) {
      setError('Ingresa una referencia o PIN.');
      return;
    }
    if (!cashAccount) {
      setError('La cuenta EFECTIVO-CAJA no está disponible.');
      return;
    }
    if ((tipo === 'Pago' && !clienteId) || !Number.isFinite(montoCop) || montoCop <= 0) {
      setError('Completa el cliente si es un pago e ingresa un monto mayor que cero.');
      return;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      const success = await createMovimientoEfectivo({
        tipo, montoCop, clienteId, origenFondosId: cashAccount.id, origenFondos: accountLabel(cashAccount),
        fecha: fields.get('fecha'), referencia,
      });
      if (!success) throw new Error();
      finishSound(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo registrar el movimiento.');
    } finally {
      finishSound(false);
      setBusy(false);
    }
  };

  return (
    <RecordDialog
      title={addingClient ? 'Agregar cliente' : 'Registrar movimiento de efectivo'}
      description={addingClient ? 'El cliente quedará asignado al movimiento.' : 'Registra un ingreso o un pago en la caja de efectivo.'}
      icon={addingClient ? 'ri-user-add-line' : 'ri-money-dollar-circle-line'}
      busy={busy} error={error} onClose={addingClient ? back : onClose}
    >
      {addingClient && (
        <form onSubmit={saveClient} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <label className={recordLabelClass}>
              <span>Nombre completo o empresa</span>
              <input autoFocus required autoCapitalize="characters" value={name} onChange={(event) => setName(event.currentTarget.value.toUpperCase())} className={recordFieldClass} />
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
            <fieldset className="space-y-1.5 sm:col-span-2">
              <legend className="text-sm font-medium">Tipo de movimiento</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'Pago', label: 'Pago a cliente', detail: 'Salida', icon: 'ri-arrow-up-circle-line' },
                  { value: 'Ingreso', label: 'Ingreso a caja', detail: 'Entrada', icon: 'ri-arrow-down-circle-line' },
                ] as const).map((option) => (
                  <label key={option.value} className="cursor-pointer">
                    <input type="radio" name="tipo" value={option.value} checked={tipo === option.value}
                      onChange={() => setTipo(option.value)} className="peer sr-only" />
                    <span className="flex h-full flex-col gap-1 rounded-xl border border-input p-3 text-sm peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                      <i className={option.icon + ' text-lg'} aria-hidden="true" />
                      <strong>{option.label}</strong>
                      <span className="text-xs text-muted-foreground">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={recordLabelClass}>
              <span>Fecha</span>
              <input name="fecha" type="date" required defaultValue={todayBogota()} className={recordFieldClass} />
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
                setName(clienteId ? '' : (query || '').trim().toUpperCase());
                setError('');
                setAddingClient(true);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <p className={recordLabelClass}>Cuenta de caja</p>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <i className="ri-safe-2-line text-base text-emerald-500" aria-hidden="true" />
                Efectivo (Caja)
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                <i className="ri-lock-line" aria-hidden="true" /> EFECTIVO-CAJA
              </span>
            </div>
            {!cashAccount && <p className="text-xs text-destructive">La cuenta EFECTIVO-CAJA no está disponible.</p>}
          </div>
          <label className={recordLabelClass}>
            <span>Monto (COP)</span>
            <input name="monto" type="text" inputMode="decimal" pattern="[0-9,]+([.][0-9]*)?|[.][0-9]+" required placeholder="1,250.00" onChange={(event) => { const input = event.currentTarget; if (formatAmountField(input) === undefined) input.value = input.value.replace(/[^0-9,.]/g, ''); }} className={recordFieldClass} />
          </label>
          <label className={recordLabelClass}>
            <span>Referencia o PIN</span>
            <input name="referencia" required className={recordFieldClass} />
          </label>
        </fieldset>
        <RecordActions busy={busy} submitDisabled={!cashAccount} label={tipo === 'Pago' ? 'Registrar pago' : 'Registrar ingreso'} onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
