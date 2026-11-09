import { formatAmountField, formatAmountInput, parseAmountInput, parseFinalAmount } from '../../utils/amountInput';
import React, { useEffect, useId, useRef, useState } from 'react';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { useData, type NormalizedData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCOP, formatNumber, normalizeSearch } from '../../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { ClientCountrySelect } from '../common/ClientCountrySelect';
import { AmountEntryMode, type AmountMode } from '../common/AmountEntryMode';

export type EditableNegocio = NormalizedData['negocios'][number];

interface AddNegocioModalProps {
  negocio?: EditableNegocio;
  initialClienteId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';
const secondaryClass = 'min-h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50';
const primaryClass = 'min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';

export const AddNegocioModal: React.FC<AddNegocioModalProps> = ({ isOpen, onClose, negocio, initialClienteId }) =>
  isOpen ? <NegocioDialog key={negocio?.id ?? initialClienteId ?? 'new'} onClose={onClose} negocio={negocio} initialClienteId={initialClienteId} /> : null;

const NegocioDialog = ({ onClose, negocio, initialClienteId }: Omit<AddNegocioModalProps, 'isOpen'>) => {
  const { data, createNegocio, createCliente, updateNegocio, deleteNegocio } = useData();
  const { profile } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const clientField = useRef<HTMLDivElement>(null);
  const restoreClientFocus = useRef(false);
  const id = useId();

  const [clienteId, setClienteId] = useState(() =>
    negocio
      ? data.clientes.find((client) => client.id === negocio.clienteId || client.codigo === negocio.clienteCodigo)?.id
        || negocio.clienteId || ''
      : initialClienteId || ''
  );
  const [divisaCode, setDivisaCode] = useState(negocio?.divisaCodigo || '');
  const [monto, setMonto] = useState(() => negocio ? formatAmountInput(String(negocio.montoDivisa)) : '');
  const [montoFinal, setMontoFinal] = useState('');
  const [amountMode, setAmountMode] = useState<AmountMode>('initial');
  const [tasa, setTasa] = useState(negocio ? formatAmountInput(String(negocio.tasaCambio)) : '');
  const getBogotaToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());
  const [fecha, setFecha] = useState(() => negocio ? negocio.fecha.slice(0, 10) : getBogotaToday());
  const [showClientModal, setShowClientModal] = useState(false);
  const [authorId, setAuthorId] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPais, setNewClientPais] = useState('COLOMBIA');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (!isCreatingClient && restoreClientFocus.current) {
      restoreClientFocus.current = false;
      clientField.current?.querySelector('input')?.focus();
    }
  }, [isCreatingClient]);

  const authorizedCurrencies = profile?.authorized_currencies;
  const currencies = profile?.role === 'operador' && authorizedCurrencies?.length
    ? data.divisas.filter((currency) => authorizedCurrencies.includes(currency.codigo))
    : data.divisas;
  const selectedCurrency = currencies.find((currency) => currency.codigo === divisaCode);
  const authorName = negocio?.createdByName?.trim() ||
    (negocio?.createdBy && (data.usuarios.find((user) => user.id === negocio.createdBy)?.nombre || negocio.createdBy));
  const canAssignAuthor = Boolean(negocio && !authorName &&
    (profile?.role === 'administrador' || profile?.role === 'super_admin'));
  const fromFinal = amountMode === 'final';
  const parsedTasa = parseAmountInput(tasa);
  const parsedFinal = parseFinalAmount(montoFinal, 2);
  const parsedMonto = fromFinal
    ? (Number.isFinite(parsedTasa) && parsedTasa > 0 ? parsedFinal / parsedTasa : NaN)
    : parseAmountInput(monto);
  const ingresoCOP = parsedMonto * parsedTasa;
  const canSubmit = Boolean(clienteId && selectedCurrency && fecha &&
    parsedMonto > 0 && parsedTasa > 0 && Number.isFinite(ingresoCOP));

  const changeAmountMode = (mode: AmountMode) => {
    if (mode === amountMode) return;
    if (mode === 'final' && ingresoCOP > 0 && Number.isFinite(ingresoCOP)) {
      setMontoFinal(formatNumber(ingresoCOP, 0, 2));
    } else if (mode === 'initial' && parsedMonto > 0 && Number.isFinite(parsedMonto)) {
      setMonto(formatNumber(parsedMonto, 0, 20));
    }
    setAmountMode(mode);
  };

    const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';

  const handleDelete = async () => {
    if (!negocio) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el negocio ${negocio.codigo}? Esta acción recalculará automáticamente los saldos de clientes y estadísticas.`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const ok = await deleteNegocio(negocio.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el negocio.');
      setSaving(false);
    }
  };

  const backToBusiness = () => {
    restoreClientFocus.current = true;
    setIsCreatingClient(false);
    setError('');
  };

  const handleCreateClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !newClientName.trim()) return;
    setSaving(true);
    setError('');
    const finishSound = prepareSuccessSound();

    try {
      const result = await createCliente(newClientName.trim(), newClientPais.trim());
      if (!result?.success || !result.id) throw new Error('No se pudo crear el cliente. Inténtalo de nuevo.');
      finishSound(true);
      setClienteId(result.id);
      backToBusiness();
    } catch (err) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !canSubmit || !selectedCurrency) return;
    setSaving(true);
    setError('');
    const finishSound = prepareSuccessSound();

    try {
      const fields = {
        fecha,
        clienteId,
        divisaCodigo: selectedCurrency.codigo,
        montoDivisa: parsedMonto,
        tasaCambio: parsedTasa,
        ingresoCOP,
      };
      const success = negocio
        ? await updateNegocio({
          ...fields, id: negocio.id, divisaId: selectedCurrency.id,
          ...(canAssignAuthor && authorId ? { authorId } : {}),
        })
        : await createNegocio(fields);
      if (!success) throw new Error('No se pudo guardar el negocio.');
      finishSound(true);
      onClose();
    } catch (err) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'No se pudo registrar el negocio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id + '-title'}
      onCancel={(event) => {
        event.preventDefault();
        if (saving) return;
        if (isCreatingClient) backToBusiness();
        else onClose();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <header className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
          <i className={isCreatingClient ? 'ri-user-add-line' : 'ri-exchange-dollar-line'} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h2 id={id + '-title'} className="text-lg font-bold">
            {isCreatingClient ? 'Agregar cliente' : negocio ? 'Editar negocio ' + negocio.codigo : 'Registrar negocio'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isCreatingClient ? 'El cliente quedará seleccionado para esta operación.' : negocio ? 'Actualiza los datos de la operación.' : 'Registra una operación de cambio y consulta el ingreso en COP.'}
          </p>
        </div>
        <button
          type="button"
          onClick={isCreatingClient ? backToBusiness : onClose}
          disabled={saving}
          aria-label={isCreatingClient ? 'Volver al negocio' : 'Cerrar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <i className="ri-close-line" aria-hidden="true" />
        </button>
      </header>

      {error && (
        <p role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive sm:mx-6">
          {error}
        </p>
      )}

      {isCreatingClient ? (
        <form onSubmit={handleCreateClient} className="space-y-4 p-4 sm:p-6">
          <div>
            <label htmlFor={id + '-name'} className={labelClass}>Nombre completo o empresa</label>
            <input
              id={id + '-name'}
              autoFocus
              required
              autoCapitalize="characters"
              value={newClientName}
              onChange={(event) => setNewClientName(event.currentTarget.value.toUpperCase())}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={id + '-country'} className={labelClass}>País</label>
            <ClientCountrySelect
              id={id + '-country'}
              value={newClientPais}
              onChange={setNewClientPais}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={backToBusiness} disabled={saving} className={secondaryClass}>Volver</button>
            <button type="submit" disabled={saving || !newClientName.trim()} className={primaryClass}>
              {saving ? 'Guardando…' : 'Guardar y seleccionar'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
          {negocio && (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <i className="ri-user-3-line" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Creado por</p>
                {canAssignAuthor ? (
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <input type="search" aria-label="Buscar usuario" placeholder="Buscar por nombre o correo"
                      value={authorSearch} onChange={(event) => setAuthorSearch(event.target.value)} className={fieldClass} />
                    <select aria-label="Elegir usuario" value={authorId} onChange={(event) => setAuthorId(event.target.value)} className={fieldClass}>
                      <option value="">Sin registro</option>
                      {data.usuarios.filter((user) =>
                        ['administrador', 'super_admin', 'operador', 'dispersor'].includes(user.rol) &&
                        (user.id === authorId || normalizeSearch(user.nombre + ' ' + user.correo).includes(normalizeSearch(authorSearch.trim())))
                      ).map((user) => (
                        <option key={user.id} value={user.id}>{user.nombre}{user.correo ? ' · ' + user.correo : ''}</option>
                      ))}
                    </select>
                  </div>
                ) : <p className="truncate text-sm font-semibold">{authorName || 'Sin registro'}</p>}
              </div>
            </div>
          )}
          <div ref={clientField}>
            <label htmlFor={id + '-client'} className={labelClass}>Cliente</label>
            <ClientSearchSelect
              id={id + '-client'}
              value={clienteId}
              onChange={setClienteId}
              onAddNewClient={(query) => {
                setNewClientName(clienteId ? '' : (query || '').trim().toUpperCase());
                setNewClientPais('COLOMBIA');
                setIsCreatingClient(true);
                setError('');
              }}
              inputClassName="min-h-11"
              required
            />

          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencySelect currencies={currencies} value={divisaCode} onChange={setDivisaCode} />

            <div>
              <label htmlFor={id + '-date'} className={labelClass}>Fecha de operación</label>
              <input id={id + '-date'} type="date" required value={fecha} onChange={(event) => setFecha(event.target.value)} className={fieldClass} />
            </div>
          </div>

          <AmountEntryMode mode={amountMode} onChange={changeAmountMode} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id + '-amount'} className={labelClass}>{fromFinal ? 'Monto final en COP' : 'Monto en divisa'}</label>
              <input id={id + '-amount'} type="text" inputMode="decimal" required value={fromFinal ? montoFinal : monto}
                onChange={(event) => {
                  const amount = formatAmountField(event.currentTarget);
                  if (amount !== undefined) (fromFinal ? setMontoFinal : setMonto)(amount);
                }}
                placeholder="Ej. 5,000.50" className={fieldClass} />
              {fromFinal && montoFinal && !Number.isFinite(parsedFinal) && (
                <p className="mt-1 text-xs text-destructive">Ingresa un monto positivo con hasta dos decimales.</p>
              )}
            </div>
            <div>
              <label htmlFor={id + '-rate'} className={labelClass}>Tasa de cambio en COP</label>
              <input id={id + '-rate'} type="text" inputMode="decimal" required value={tasa} onChange={(event) => { const rate = formatAmountField(event.currentTarget); if (rate !== undefined) setTasa(rate); }} placeholder="Ej. 3,950.0000" className={fieldClass} />
              {fromFinal && parsedTasa === 0 && (
                <p className="mt-1 text-xs text-destructive">Usa una tasa mayor que cero para calcular el monto inicial.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">{fromFinal ? 'Monto inicial calculado' : 'Ingreso estimado en COP'}</span>
            <output htmlFor={id + '-amount ' + id + '-rate'} className="font-mono text-lg font-bold tabular-nums text-primary">
              {fromFinal
                ? (Number.isFinite(parsedMonto) ? formatNumber(parsedMonto, 0, 12) + (divisaCode ? ' ' + divisaCode : '') : '—')
                : formatCOP(ingresoCOP)}
            </output>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div>
              {negocio && isAdmin && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="min-h-11 rounded-xl px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <i className="ri-delete-bin-line" />
                  <span>Eliminar negocio</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={saving} className={secondaryClass}>Cancelar</button>
              <button type="submit" disabled={saving || !canSubmit} className={primaryClass}>
                {saving ? 'Guardando…' : negocio ? 'Guardar cambios' : 'Registrar negocio'}
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
};
