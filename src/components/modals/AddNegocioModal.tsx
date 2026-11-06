import { formatAmountField, formatAmountInput } from '../../utils/amountInput';
import React, { useEffect, useId, useRef, useState } from 'react';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { useAirtable, type NormalizedData } from '../../context/AirtableContext';
import { useAuth } from '../../context/AuthContext';
import { DIVISAS, type Divisa } from '../../data/airtableData';
import { fallbackBanderaUrl, formatCOP } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

export type EditableNegocio = NormalizedData['negocios'][number];

interface AddNegocioModalProps {
  negocio?: EditableNegocio;
  isOpen: boolean;
  onClose: () => void;
}

const fieldClass = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';
const secondaryClass = 'min-h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50';
const primaryClass = 'min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';

const normalizeSearch = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const currencyName = (currency: Divisa) =>
  currency.nombreDivisa || DIVISAS.find((item) => item.codigo === currency.codigo)?.nombreDivisa || currency.divisa;

const CurrencyLabel = ({ currency, showName = true }: { currency: Divisa; showName?: boolean }) => {
  const catalogCurrency = DIVISAS.find((item) => item.codigo === currency.codigo);
  const flag = currency.fallbackBanderaUrl || catalogCurrency?.fallbackBanderaUrl ||
    fallbackBanderaUrl[currency.codigo] || currency.banderaUrl;
  const name = currencyName(currency);

  return (
    <>
      <span className="relative flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground">
        <i className="ri-money-dollar-circle-line" aria-hidden="true" />
        {flag && (
          <img
            key={flag}
            src={flag}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        )}
      </span>
      <span className="min-w-14 shrink-0 whitespace-nowrap font-semibold">{currency.codigo}</span>
      {showName && name && name !== currency.codigo && (
        <span className="text-muted-foreground">{name}</span>
      )}
    </>
  );
};

export const AddNegocioModal: React.FC<AddNegocioModalProps> = ({ isOpen, onClose, negocio }) =>
  isOpen ? <NegocioDialog key={negocio?.id ?? 'new'} onClose={onClose} negocio={negocio} /> : null;

const NegocioDialog = ({ onClose, negocio }: Omit<AddNegocioModalProps, 'isOpen'>) => {
  const { data, createNegocio, createCliente, updateNegocio } = useAirtable();
  const { profile } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const currencyTrigger = useRef<HTMLButtonElement>(null);
  const clientField = useRef<HTMLDivElement>(null);
  const restoreClientFocus = useRef(false);
  const id = useId();

  const [clienteId, setClienteId] = useState(() =>
    negocio
      ? data.clientes.find((client) => client.id === negocio.clienteId || client.codigo === negocio.clienteCodigo)?.id
        || negocio.clienteId || ''
      : ''
  );
  const [divisaCode, setDivisaCode] = useState(negocio?.divisaCodigo || '');
  const [monto, setMonto] = useState(() => negocio ? formatAmountInput(String(negocio.montoDivisa)) : '');
  const [tasa, setTasa] = useState(negocio ? String(negocio.tasaCambio) : '');
  const [fecha, setFecha] = useState(() => negocio ? negocio.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [authorId, setAuthorId] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
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
  const query = normalizeSearch(currencyQuery.trim());
  const matchingCurrencies = currencies.filter((currency) =>
    normalizeSearch([currency.codigo, currencyName(currency), currency.pais].join(' ')).includes(query)
  );
  const parsedMonto = Number(monto.replace(/,/g, ''));
  const parsedTasa = Number(tasa);
  const ingresoCOP = parsedMonto * parsedTasa;
  const canSubmit = Boolean(clienteId && selectedCurrency && fecha &&
    parsedMonto > 0 && parsedTasa > 0 && Number.isFinite(ingresoCOP));

  const selectCurrency = (currency: Divisa) => {
    setDivisaCode(currency.codigo);
    setCurrencyOpen(false);
    currencyTrigger.current?.focus();
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
              value={newClientName}
              onChange={(event) => setNewClientName(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={id + '-country'} className={labelClass}>País</label>
            <input
              id={id + '-country'}
              value={newClientPais}
              onChange={(event) => setNewClientPais(event.target.value)}
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
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              {canAssignAuthor ? (
                <>
                  <label htmlFor={id + '-author'} className={labelClass}>Creado por</label>
                  <select id={id + '-author'} value={authorId} onChange={(event) => setAuthorId(event.target.value)} className={fieldClass}>
                    <option value="">Sin registro</option>
                    {data.usuarios.filter((user) => ['administrador', 'super_admin', 'operador', 'dispersor'].includes(user.rol)).map((user) => (
                      <option key={user.id} value={user.id}>{user.nombre}{user.correo ? ' · ' + user.correo : ''}</option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="text-sm"><span className="font-medium">Creado por</span> · {authorName || 'Sin registro'}</p>
              )}
            </div>
          )}
          <div ref={clientField}>
            <label htmlFor={id + '-client'} className={labelClass}>Cliente</label>
            <ClientSearchSelect
              id={id + '-client'}
              value={clienteId}
              onChange={setClienteId}
              onAddNewClient={(query) => {
                setNewClientName(clienteId ? '' : (query || '').trim());
                setNewClientPais('COLOMBIA');
                setIsCreatingClient(true);
                setError('');
              }}
              inputClassName="min-h-11"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setCurrencyOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && currencyOpen) {
                  event.preventDefault();
                  setCurrencyOpen(false);
                  currencyTrigger.current?.focus();
                }
              }}
            >
              <span id={id + '-currency-label'} className={labelClass}>Divisa</span>
              <button
                id={id + '-currency'}
                ref={currencyTrigger}
                type="button"
                aria-labelledby={id + '-currency-label ' + id + '-currency'}
                aria-expanded={currencyOpen}
                onMouseDown={(event) => {
                  if (currencyOpen) event.preventDefault();
                }}
                onClick={() => {
                  setCurrencyQuery('');
                  setCurrencyOpen(!currencyOpen);
                }}
                className={fieldClass + ' flex items-center justify-between gap-2 text-left'}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedCurrency ? <CurrencyLabel currency={selectedCurrency} showName={false} /> : 'Seleccionar divisa'}
                </span>
                <i className="ri-arrow-down-s-line text-muted-foreground" aria-hidden="true" />
              </button>
              {currencyOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-card p-1.5 shadow-lg sm:right-auto sm:w-80">
                  <input
                    autoFocus
                    type="search"
                    aria-label="Buscar divisa"
                    placeholder="Buscar por código, nombre o país"
                    value={currencyQuery}
                    onChange={(event) => setCurrencyQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      if (matchingCurrencies[0]) selectCurrency(matchingCurrencies[0]);
                    }}
                    className={fieldClass}
                  />
                  <div className="mt-1 max-h-44 overflow-y-auto">
                    {matchingCurrencies.length === 0 && (
                      <p className="p-2 text-sm text-muted-foreground">No se encontraron divisas.</p>
                    )}
                    {matchingCurrencies.map((currency) => (
                      <button
                        type="button"
                        key={currency.id}
                        aria-pressed={currency.codigo === divisaCode}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCurrency(currency)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-primary/10"
                      >
                        <CurrencyLabel currency={currency} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor={id + '-date'} className={labelClass}>Fecha de operación</label>
              <input id={id + '-date'} type="date" required value={fecha} onChange={(event) => setFecha(event.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id + '-amount'} className={labelClass}>Monto en divisa</label>
              <input id={id + '-amount'} type="text" inputMode="decimal" required value={monto} onChange={(event) => { const amount = formatAmountField(event.currentTarget); if (amount !== undefined) setMonto(amount); }} placeholder="Ej. 5,000.50" className={fieldClass} />
            </div>
            <div>
              <label htmlFor={id + '-rate'} className={labelClass}>Tasa de cambio en COP</label>
              <input id={id + '-rate'} type="number" step="any" required value={tasa} onChange={(event) => setTasa(event.target.value)} placeholder="Ej. 3950" className={fieldClass} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">Ingreso estimado en COP</span>
            <output htmlFor={id + '-amount ' + id + '-rate'} className="font-mono text-lg font-bold tabular-nums text-primary">
              {formatCOP(ingresoCOP)}
            </output>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} disabled={saving} className={secondaryClass}>Cancelar</button>
            <button type="submit" disabled={saving || !canSubmit} className={primaryClass}>
              {saving ? 'Guardando…' : negocio ? 'Guardar cambios' : 'Registrar negocio'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
};
