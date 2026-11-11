import { formatAmountField, formatAmountInput, parseAmountInput, parseFinalAmount } from '../../utils/amountInput';
import React, { useEffect, useId, useRef, useState } from 'react';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { useData, type NormalizedData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCOP, formatNumber, normalizeSearch } from '../../utils/formatters';
import { canDeleteRole } from '../../utils/roles';
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
  const canDelete = canDeleteRole(profile?.role);
  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'administrador';
  const isOperador = profile?.role === 'operador';
  const canAssignAuthor = isSuperAdmin || isAdmin;
  const [clienteId, setClienteId] = useState(() =>
    negocio
      ? data.clientes.find((client) => client.id === negocio.clienteId || client.codigo === negocio.clienteCodigo)?.id
        || negocio.clienteId || ''
      : initialClienteId || ''
  );
  const [authorId, setAuthorId] = useState(() => negocio?.createdBy || profile?.id || '');
  const [authorSearch, setAuthorSearch] = useState('');
  const currencies = isOperador
    ? data.divisas.filter((currency) => (profile?.authorizedCurrencies || []).includes(currency.codigo))
    : data.divisas;
  const initialCurrency = negocio?.divisaCodigo || currencies[0]?.codigo || 'USDT';
  const [divisaCode, setDivisaCode] = useState(initialCurrency);
  const [fecha, setFecha] = useState(() => negocio?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState(() => (negocio ? formatAmountInput(String(negocio.montoDivisa)) : ''));
  const [tasa, setTasa] = useState(() => (negocio ? formatAmountInput(String(negocio.tasaCambio)) : ''));
  const [amountMode, setAmountMode] = useState<AmountMode>('initial');
  const [montoFinal, setMontoFinal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPais, setNewClientPais] = useState('COLOMBIA');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const clientField = useRef<HTMLDivElement>(null);
  const restoreClientFocus = useRef(false);
  const id = useId();

  const selectedCurrency = data.divisas.find((currency) => currency.codigo === divisaCode);
  const fromFinal = amountMode === 'final';
  const parsedTasa = tasa.trim() === '' ? 0 : parseAmountInput(tasa);
  const parsedFinal = parseFinalAmount(montoFinal);
  const parsedMonto = fromFinal
    ? (Number.isFinite(parsedFinal) && parsedTasa > 0 ? parsedFinal / parsedTasa : NaN)
    : parseAmountInput(monto);
  const ingresoCOP = fromFinal
    ? (Number.isFinite(parsedFinal) ? parsedFinal : 0)
    : (Number.isFinite(parsedMonto) && parsedMonto > 0 && Number.isFinite(parsedTasa) && parsedTasa >= 0 ? parsedMonto * parsedTasa : 0);
  const validQuote = fromFinal
    ? Number.isFinite(parsedFinal) && parsedFinal > 0 && parsedTasa > 0
    : Number.isFinite(parsedMonto) && parsedMonto > 0 && Number.isFinite(parsedTasa) && parsedTasa >= 0;
  const authorName = data.usuarios.find((user) => user.id === authorId)?.nombre
    || data.usuarios.find((user) => user.id === negocio?.createdBy)?.nombre
    || negocio?.createdByName;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (isCreatingClient || !restoreClientFocus.current) return;
    restoreClientFocus.current = false;
    clientField.current?.querySelector<HTMLElement>('input, button')?.focus();
  }, [isCreatingClient]);

  const changeAmountMode = (next: AmountMode) => {
    if (next === amountMode) return;
    if (next === 'final') {
      setMontoFinal(Number.isFinite(parsedMonto) && parsedMonto > 0 && parsedTasa > 0 ? formatNumber(ingresoCOP, 0, 2) : '');
    } else if (Number.isFinite(parsedMonto) && parsedMonto > 0) {
      setMonto(formatNumber(parsedMonto, 0, 12));
    }
    setAmountMode(next);
  };

  const canSubmit = Boolean(clienteId && selectedCurrency && fecha && validQuote);

  const handleDelete = async () => {
    if (!negocio) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el negocio ${negocio.codigo}? Esta acción recalculará automáticamente los saldos de clientes y estadísticas.`)) {
      return;
    }
    setSaving(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      const ok = await deleteNegocio(negocio.id);
      if (ok) {
        finishSound(true);
        onClose();
      } else {
        throw new Error('No se pudo eliminar el negocio.');
      }
    } catch (err: any) {
      finishSound(false);
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
      const result = await createCliente(newClientName.trim().toUpperCase(), newClientPais.trim());
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
        divisaId: selectedCurrency.id,
        divisaCodigo: selectedCurrency.codigo,
        montoDivisa: parsedMonto,
        tasaCambio: parsedTasa,
        createdBy: canAssignAuthor ? (authorId || undefined) : undefined,
      };
      const ok = negocio ? await updateNegocio({ id: negocio.id, ...fields, ingresoCOP }) : await createNegocio(fields);
      if (!ok) throw new Error('No se pudo guardar la operación. Inténtalo de nuevo.');
      finishSound(true);
      onClose();
    } catch (err) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'Error inesperado al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={id + '-title'}
        onCancel={(event) => {
          event.preventDefault();
          if (saving) return;
          if (isCreatingClient) backToBusiness();
          else onClose();
        }}
        className="overflow-y-auto border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm max-sm:fixed max-sm:inset-0 max-sm:m-0 max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-2xl sm:border"
      >
        <header className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-6 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
            <i className="ri-exchange-dollar-line" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id={id + '-title'} className="text-base sm:text-lg font-bold truncate">
              {negocio ? 'Editar negocio ' + negocio.codigo : 'Registrar negocio'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {negocio ? 'Actualiza los datos de la operación.' : 'Registra una operación de cambio y consulta el ingreso en COP.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </header>

        {error && (
          <p role="alert" className="mx-4 mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive sm:mx-6">
            {error}
          </p>
        )}

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
                        normalizeSearch(user.nombre).includes(normalizeSearch(authorSearch)) ||
                        normalizeSearch(user.correo).includes(normalizeSearch(authorSearch))
                      ).map((user) => (
                        <option key={user.id} value={user.id}>{user.nombre} ({user.rol})</option>
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
              <input id={id + '-rate'} type="text" inputMode="decimal" value={tasa} onChange={(event) => { const rate = formatAmountField(event.currentTarget); if (rate !== undefined) setTasa(rate); }} placeholder="Ej. 3,950.0000" className={fieldClass} />
              {parsedTasa === 0 && (
                <p className={`mt-1 text-xs ${fromFinal ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {fromFinal ? 'Con tasa cero, selecciona Monto inicial.' : 'El ingreso será $0 COP.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">{fromFinal ? 'Monto inicial calculado' : 'Ingreso estimado en COP'}</span>
            <output htmlFor={id + '-amount ' + id + '-rate'} className="font-mono text-lg font-bold tabular-nums text-primary">
              {fromFinal
                ? (Number.isFinite(parsedMonto) ? formatNumber(parsedMonto, 0, 12) + (divisaCode ? ' ' + divisaCode : '') : '—')
                : (validQuote ? formatCOP(ingresoCOP) : '—')}
            </output>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <div>
              {negocio && canDelete && (
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
      </dialog>

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
                  <p className="text-[11px] text-muted-foreground">Quedará seleccionado en este negocio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={backToBusiness}
                disabled={saving}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted flex items-center justify-center"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label htmlFor={id + '-name'} className={labelClass}>Nombre completo o empresa</label>
                <input
                  id={id + '-name'}
                  autoFocus
                  required
                  autoCapitalize="characters"
                  value={newClientName}
                  onChange={(event) => setNewClientName(event.currentTarget.value.toUpperCase())}
                  placeholder="EJ. DANIEL RAMÍREZ"
                  className={fieldClass + ' uppercase'}
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
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={backToBusiness} disabled={saving} className={secondaryClass}>Volver</button>
                <button type="submit" disabled={saving || !newClientName.trim()} className={primaryClass}>
                  {saving ? 'Guardando…' : 'Guardar y seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
