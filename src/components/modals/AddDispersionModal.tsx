import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useEffect, useId, useState } from 'react';
import { useData, type NormalizedData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canDeleteRole } from '../../utils/roles';
import { formatCOP, todayBogota } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { ClientCountrySelect } from '../common/ClientCountrySelect';
import { supabase } from '../../lib/supabase';
import { AccountSelect, accountLabel, type Account } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddDispersionModalProps {
  isOpen: boolean;
  record?: NormalizedData['dispersiones'][number];
  initialClienteId?: string;
  onClose: () => void;
}

export const AddDispersionModal = ({ isOpen, onClose, record, initialClienteId }: AddDispersionModalProps) =>
  isOpen ? <DispersionForm key={record?.id ?? initialClienteId} onClose={onClose} record={record} initialClienteId={initialClienteId} /> : null;

const DispersionForm = ({ onClose, record, initialClienteId }: Pick<AddDispersionModalProps, 'onClose' | 'record' | 'initialClienteId'>) => {
  const { data, createDispersion, updateDispersion, deleteDispersion, createCliente } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const canDelete = canDeleteRole(profile?.role);
  const clientInputId = useId();
  const [clienteId, setClienteId] = useState(record?.clienteId || initialClienteId || '');
  const [accountId, setAccountId] = useState(record?.origenFondosId || '');
  const [remoteAccounts, setRemoteAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Fallback seamless a data.activosLiquidos si remoteAccounts aún está cargando o está vacío
  const accounts = React.useMemo(() => {
    if (remoteAccounts.length > 0) return remoteAccounts;
    const local = (data.activosLiquidos || []).filter((a: any) =>
      !a.divisa || String(a.divisa).trim().toUpperCase() === 'COP'
    );
    return local as Account[];
  }, [remoteAccounts, data.activosLiquidos]);

  // Inline client creation states (popup sobre popup)
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPais, setNewClientPais] = useState('COLOMBIA');
  const [clientSaving, setClientSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.rpc('cuentas_para_dispersion').then(({ data: rpcAccounts, error: rpcError }) => {
      if (!active) return;
      if (rpcError) {
        console.warn('cuentas_para_dispersion warning:', rpcError);
      } else if (Array.isArray(rpcAccounts) && rpcAccounts.length > 0) {
        setRemoteAccounts(rpcAccounts);
      }
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

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientSaving || !newClientName.trim()) return;
    setClientSaving(true);
    setError('');
    const finishSound = prepareSuccessSound();

    try {
      const result = await createCliente(newClientName.trim().toUpperCase(), newClientPais.trim());
      if (!result?.success || !result.id) throw new Error('No se pudo crear el cliente. Inténtalo de nuevo.');
      finishSound(true);
      setClienteId(result.id);
      setIsCreatingClient(false);
    } catch (err) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally {
      setClientSaving(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const monto = parseAmountInput(String(fields.get('monto') ?? ''));
    const costoInput = String(fields.get('costo') ?? '').trim();
    const costoCop = costoInput ? parseAmountInput(costoInput) : 0;
    const account = accounts.find((item) => item.id === accountId || (!accountId && accountLabel(item) === record?.origenFondos));
    if (!clienteId || !account || !Number.isFinite(monto) || monto <= 0) {
      setError('Selecciona un cliente y una cuenta de origen e ingresa un monto mayor que cero.');
      return;
    }

    if (!Number.isFinite(costoCop) || costoCop < 0 || /\.\d{3,}$/.test(costoInput)) {
      setError('Ingresa un costo válido con hasta dos decimales.');
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
        costoCop,
        origenFondosId: account.id,
        origenFondos: accountLabel(account),
        fecha: fields.get('fecha'),
        referencia: String(fields.get('referencia') || '').trim().toUpperCase(),
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
    <>
      <RecordDialog
        title={record ? "Editar dispersión" : "Registrar dispersión"}
        description="Registra una transferencia a un cliente desde una cuenta operativa."
        icon="ri-send-plane-line"
        busy={busy}
        error={error}
        onClose={onClose}
      >
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={clientInputId} className={recordLabelClass}>Cliente</label>
              <ClientSearchSelect
                id={clientInputId}
                value={clienteId}
                onChange={setClienteId}
                onAddNewClient={(query) => {
                  setNewClientName((query || '').trim().toUpperCase());
                  setNewClientPais('COLOMBIA');
                  setIsCreatingClient(true);
                  setError('');
                }}
                required
                inputClassName="min-h-11"
              />
            </div>
            <AccountSelect label="Cuenta de origen" accounts={accounts} value={accountId || accounts.find((item) => accountLabel(item) === record?.origenFondos)?.id || ''} onChange={setAccountId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={recordLabelClass}>
                <span>Monto (COP)</span>
                <input type="text" inputMode="decimal" name="monto" defaultValue={record ? formatAmountInput(String(record.monto)) : undefined} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
              </label>
              <label className={recordLabelClass}>
                <span>Costo de dispersión (COP)</span>
                <input type="text" inputMode="decimal" name="costo" placeholder="0.00"
                  defaultValue={record?.costoCop ? formatAmountInput(String(record.costoCop)) : ''}
                  onChange={(event) => formatAmountField(event.currentTarget)} className={recordFieldClass} />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={recordLabelClass}>
                <span>Fecha</span>
                <input type="date" name="fecha" required defaultValue={record?.fecha?.slice(0, 10) || todayBogota()} className={recordFieldClass} />
              </label>
              <label className={recordLabelClass}>
                <span>Referencia (opcional)</span>
                <input
                  name="referencia"
                  defaultValue={record?.referencia}
                  onChange={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }}
                  className={recordFieldClass + ' uppercase'}
                  placeholder="REFERENCIA O DESTINATARIO"
                />
              </label>
            </div>
            {!record && <ReceiptInput disabled={busy} />}
          </fieldset>
          <RecordActions busy={busy} label={record ? "Guardar cambios" : "Registrar dispersión"} onClose={onClose} onDelete={record && canDelete ? handleDelete : undefined} deleteLabel="Eliminar dispersión" />
        </form>
      </RecordDialog>

      {/* Popup sobre popup: Crear Cliente */}
      {isCreatingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                  <i className="ri-user-add-line" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Agregar cliente</h3>
                  <p className="text-[11px] text-muted-foreground">Quedará seleccionado en esta dispersión</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingClient(false)}
                disabled={clientSaving}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="dispersion-new-client-name" className={recordLabelClass}>
                  <span>Nombre completo o empresa</span>
                  <input
                    id="dispersion-new-client-name"
                    type="text"
                    autoFocus
                    required
                    autoCapitalize="characters"
                    value={newClientName}
                    onChange={(event) => setNewClientName(event.currentTarget.value.toUpperCase())}
                    placeholder="EJ. DANIEL RAMÍREZ"
                    className={recordFieldClass + ' uppercase'}
                  />
                </label>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="dispersion-new-client-country" className={recordLabelClass}>
                  <span>País</span>
                  <ClientCountrySelect
                    id="dispersion-new-client-country"
                    value={newClientPais}
                    onChange={setNewClientPais}
                    className={recordFieldClass}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(false)}
                  disabled={clientSaving}
                  className="min-h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={clientSaving || !newClientName.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {clientSaving ? 'Guardando…' : 'Guardar y seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
