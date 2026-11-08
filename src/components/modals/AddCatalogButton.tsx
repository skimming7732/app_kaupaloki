import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { formatCurrency, formatNumber, formatRate } from '../../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import { CURRENCY_BALANCE_SOURCE } from '../../utils/usdtPurchase';
import { AccountSelect, type Account } from './AccountSelect';
import { useData, type CatalogTable } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';

type Option = { value: string; label: string };
type Field = { name: string; label: string; type?: 'date' | 'number'; options?: Option[]; accounts?: Account[]; optional?: boolean };
type Form = { title: string; description: string; icon: string; fields: Field[] };

const dateField: Field = { name: 'fecha', label: 'Fecha de operación', type: 'date' };
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());

type CatalogEdit = { id: string; fields: Record<string, string | number>; historical: boolean };

export const AddCatalogButton = ({ table, edit }: { table: CatalogTable; edit?: CatalogEdit }) => {
  const { data, createCatalogRecord, deleteCatalogRecord } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [useCurrencyBalance, setUseCurrencyBalance] = useState(true);
  const isPurchase = table === 'compras_usdt';
  const isSale = table === 'ventas_usdt';
  const sourceField = isPurchase ? 'origen_fondos_id' : 'wallet_origen_id';
  const amountField = isPurchase ? 'valor_comprado' : 'usdt_vendido';
  const sourceCurrency = isPurchase ? currency : 'USDT';
  const selectedCurrency = data.divisas.find((item) => item.codigo === currency);
  const fromCurrencyBalance = isPurchase && useCurrencyBalance && !edit?.historical;
  const previousPending = edit && !edit.historical && edit.fields.divisa_codigo === currency
    ? Number(edit.fields.valor_comprado) : 0;
  const pendingBalance = (selectedCurrency?.totalPendiente ?? 0) + previousPending;
  const sources: Account[] = isPurchase
    ? [...data.activosLiquidos.filter((a) => sourceCurrency !== 'USDT' && (a.divisa || 'COP') === sourceCurrency),
      ...data.activosDigitales.filter(() => sourceCurrency === 'USDT')]
    : data.activosDigitales;
  const source = sources.find((item) => item.id === sourceId);
  const previousDebit = source && edit?.fields[sourceField] === sourceId &&
    (!isPurchase || edit.fields.divisa_codigo === currency) ? Number(edit.fields[amountField]) : 0;
  const balance = fromCurrencyBalance ? pendingBalance : Number(source?.saldoReal ?? source?.saldoCop ?? source?.saldoUsdt ?? 0) + previousDebit;
  const hasSource = fromCurrencyBalance ? !!selectedCurrency : !!source;
  const numericAmount = parseAmountInput(amount);
  const exceedsBalance = !edit?.historical && hasSource && numericAmount > balance;
  const previousRate = Number(edit?.fields.tasa || 0);
  const initialRate = previousRate > 0 ? (previousRate >= 0.0001 ? formatRate(previousRate) : formatAmountInput(String(previousRate))) : '';
  const rateUnchanged = !!edit && purchaseRate === initialRate;
  const rate = rateUnchanged ? previousRate : parseAmountInput(purchaseRate);
  const received = rateUnchanged && numericAmount === Number(edit?.fields.valor_comprado)
    ? Number(edit?.fields.usdt_comprado)
    : Number((numericAmount / rate).toFixed(6));
  const validPurchaseQuote = rate > 0 && Number.isFinite(received) && received > 0;
  const liquidAccounts = data.activosLiquidos.filter((a) => (a.divisa || 'COP') === 'COP');
  const wallets = data.activosDigitales;
  const currencies = data.divisas.map((d) => ({ value: d.codigo, label: d.codigo + ' · ' + d.nombre }));

  const forms: Record<CatalogTable, Form> = {
    compras_usdt: {
      title: 'Registrar compra USDT', description: 'Indica la divisa entregada y la billetera que recibe los USDT.', icon: 'ri-shopping-cart-2-line',
      fields: [
        dateField, { name: 'divisa_codigo', label: 'Divisa entregada' },
        { name: 'origen_fondos_id', label: 'Origen de los fondos', accounts: sources },
        { name: 'valor_comprado', label: 'Monto en divisa', type: 'number' },
        { name: 'tasa', label: 'Tasa de compra', type: 'number' },
        { name: 'usdt_comprado', label: 'USDT a recibir', type: 'number' },
        { name: 'wallet_destino_id', label: 'Billetera de destino', accounts: wallets },
      ],
    },
    ventas_usdt: {
      title: 'Registrar venta USDT', description: 'Selecciona la billetera de origen y la cuenta que recibe los COP.', icon: 'ri-funds-line',
      fields: [
        dateField, { name: 'concepto', label: 'Concepto' },
        { name: 'wallet_origen_id', label: 'Billetera de origen', accounts: wallets },
        { name: 'usdt_vendido', label: 'USDT vendidos', type: 'number' },
        { name: 'tasa', label: 'Tasa de venta (COP por USDT)', type: 'number' },
        { name: 'destino_fondos_id', label: 'Cuenta de destino', accounts: liquidAccounts },
      ],
    },
    activos_liquidos: {
      title: 'Agregar activo líquido', description: 'Configura una cuenta operativa en COP.', icon: 'ri-bank-line',
      fields: [
        { name: 'activo', label: 'Nombre de la cuenta' }, { name: 'institucion', label: 'Institución' },
        { name: 'titular', label: 'Titular' }, { name: 'empresa', label: 'Empresa', optional: true },
        { name: 'cuenta', label: 'Número o referencia de cuenta', optional: true },
        { name: 'saldo_cop', label: 'Saldo inicial (COP)', type: 'number', optional: true },
      ],
    },
    activos_digitales: {
      title: 'Agregar activo digital', description: 'Configura una billetera de custodia de USDT en la red TRON.', icon: 'ri-wallet-3-line',
      fields: [
        { name: 'activo', label: 'Nombre de la billetera' },
        { name: 'red', label: 'Red', options: [{ value: 'TRON (TRC20)', label: 'TRON (TRC20)' }] },
        { name: 'wallet', label: 'Dirección pública' }, { name: 'titular', label: 'Titular', optional: true },
        { name: 'saldo_usdt', label: 'Saldo inicial (USDT)', type: 'number', optional: true },
      ],
    },
    divisas: {
      title: 'Agregar divisa', description: 'Registra el código, el nombre y la región de la divisa.', icon: 'ri-global-line',
      fields: [{ name: 'codigo', label: 'Código ISO' }, { name: 'nombre_divisa', label: 'Nombre de la divisa' }, { name: 'pais', label: 'País o región' }],
    },
  };

  const initial = edit?.fields || {};
  const base = forms[table];
  const form = edit ? {
    ...base,
    title: isPurchase ? 'Editar compra USDT' : 'Editar venta USDT',
    description: 'Modifica los datos, montos, origen o destino de la operación.',
    fields: base.fields,
  } : base;
  const showBalance = (isPurchase || isSale) && !edit?.historical;
  const onClose = () => setOpen(false);

    const handleDelete = async () => {
    if (!edit) return;
    const itemLabel = isPurchase ? 'esta compra de USDT' : isSale ? 'esta venta de USDT' : 'este registro';
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${itemLabel}?`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ok = await deleteCatalogRecord(table, edit.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el registro.');
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (showBalance && (!hasSource || exceedsBalance)) {
      setError('Selecciona un origen con saldo suficiente.');
      return;
    }
    if (isPurchase && !validPurchaseQuote) {
      setError('Ingresa un monto y una tasa válidos para calcular los USDT.');
      return;
    }
    const values = new FormData(event.currentTarget);
    if (isPurchase) {
      values.set('divisa_codigo', currency);
      values.set('tasa', formatNumber(rate, 0, 20));
      values.set('usdt_comprado', formatNumber(received, 0, 20));
      if (fromCurrencyBalance) values.set(sourceField, CURRENCY_BALANCE_SOURCE);
    }
    const record: Record<string, string | number> = {};
    for (const field of form.fields) {
      if (isPurchase && edit?.historical && field.accounts) continue;
      const value = String(values.get(field.name) || '').trim();
      if (!value && !field.optional) {
        setError('Completa el campo ' + field.label + '.');
        return;
      }
      if (field.type === 'number') {
        const number = !value && field.optional ? 0 : parseAmountInput(value);
        if (!Number.isFinite(number) || (field.optional ? number < 0 : number <= 0)) {
          setError('Revisa el valor de ' + field.label + '.');
          return;
        }
        record[field.name] = number;
      } else if (value) {
        record[field.name] = value;
      }
    }

    if (table === 'divisas') {
      const code = String(record.codigo).toUpperCase();
      if (!/^[A-Z]{3,4}(?:-[A-Z]{2})?$/.test(code) || currencies.some((currency) => currency.value === code)) {
        setError('Ingresa un código válido que aún no esté registrado, como USD, USDT o USD-EC.');
        return;
      }
      record.codigo = code;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      await createCatalogRecord(table, record, edit?.id);
      finishSound(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
    } finally {
      finishSound(false);
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={edit ? 'inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted' : recordButtonClass}
        onClick={() => {
          setError('');
          const initSource = String(initial[sourceField] ?? '');
          const fallbackWallet = isSale && !initSource && wallets.length >= 1 ? wallets[0].id : initSource;
          setSourceId(fallbackWallet);
          setDestinationId(String(initial[isPurchase ? 'wallet_destino_id' : 'destino_fondos_id'] ?? ''));
          setAmount(formatAmountInput(String(initial[amountField] ?? '')));
          setCurrency(String(initial.divisa_codigo ?? ''));
          setPurchaseRate(initialRate);
          setUseCurrencyBalance(!edit || initSource === CURRENCY_BALANCE_SOURCE);
          setOpen(true);
        }}>
        <i className={edit ? 'ri-edit-line' : 'ri-add-line'} aria-hidden="true" />{edit ? 'Editar' : form.title}
      </button>
      {open && (
        <RecordDialog {...form} busy={busy} error={error} onClose={onClose}>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              {form.fields.map((field) => {
                if (isPurchase && field.name === 'divisa_codigo') return (
                  <CurrencySelect key={field.name} label={field.label} currencies={data.divisas} align="right"
                    value={currency} onChange={(code) => { if (code !== currency) setSourceId(''); setCurrency(code); }}
                    details={(item) => formatNumber(item.totalPendiente, 0, 6)} />
                );
                if (isPurchase && field.name === sourceField && !edit?.historical) return (
                  <div key={field.name} className="space-y-2 sm:col-span-2">
                    <div className={recordLabelClass}>{field.label}</div>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label={field.label}>
                      {[true, false].map((pending) => (
                        <button key={String(pending)} type="button" aria-pressed={useCurrencyBalance === pending}
                          onClick={() => setUseCurrencyBalance(pending)}
                          className="min-h-11 rounded-xl border border-input px-2 text-sm font-medium hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/10">
                          {pending ? 'Saldo pendiente de la divisa' : 'Cuenta o billetera'}
                        </button>
                      ))}
                    </div>
                    {selectedCurrency && (
                      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                        Pendiente por comprar: <strong>{formatNumber(pendingBalance, 0, 6)} {currency}</strong>
                      </p>
                    )}
                    {!selectedCurrency && <p className="text-xs text-muted-foreground">Selecciona la divisa entregada para ver su saldo pendiente.</p>}
                    {!useCurrencyBalance && !!selectedCurrency && (
                      <AccountSelect label="Cuenta o billetera de origen" name={field.name} accounts={sources} value={sourceId} onChange={setSourceId} />
                    )}
                  </div>
                );
                if (isPurchase && edit?.historical && field.accounts) return null;
                if (field.accounts) return (
                  <AccountSelect key={field.name} label={field.label} name={field.name} accounts={field.accounts}
                    value={field.name === sourceField ? sourceId : destinationId}
                    onChange={field.name === sourceField ? setSourceId : setDestinationId} />
                );
                if (isPurchase && field.name === 'usdt_comprado') return (
                  <div key={field.name} className="rounded-xl border border-border bg-muted/40 p-3 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">{field.label}</p>
                    <output className="text-xl font-semibold tabular-nums" aria-live="polite">
                      {validPurchaseQuote ? formatNumber(received, 2, 6) + ' USDT' : '—'}
                    </output>
                    <p className="text-xs text-muted-foreground">Monto entregado ÷ tasa de compra</p>
                  </div>
                );
                return (
                  <label className={recordLabelClass} key={field.name}>
                    <span>{field.label}{isPurchase && field.name === 'tasa' && currency ? ' (' + currency + ' por USDT)' : ''}{field.optional && <small className="ml-1 text-muted-foreground">(opcional)</small>}</span>
                    {field.options ? (
                      <select name={field.name} required className={recordFieldClass} defaultValue={initial[field.name]}>
                        <option value="">Seleccionar</option>
                        {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <>
                      {showBalance && field.name === amountField && (
                        <span className="flex items-center justify-between gap-2 text-xs">
                          <span>{hasSource ? 'Disponible: ' + (fromCurrencyBalance ? formatNumber(balance, 0, 6) + ' ' + currency : formatCurrency(balance, sourceCurrency)) : 'Selecciona un origen para ver el saldo'}</span>
                          <button type="button" disabled={!hasSource || balance <= 0} onClick={() => setAmount(formatAmountInput(String(balance)))}
                            className="rounded border border-border px-2 py-1 text-primary disabled:opacity-50">Máx.</button>
                        </span>
                      )}
                      <input
                        value={(isPurchase || isSale) && field.name === amountField ? amount : isPurchase && field.name === 'tasa' ? purchaseRate : undefined}
                        onChange={(event) => {
                          if (field.type !== 'number') return;
                          const value = formatAmountField(event.currentTarget);
                          if (field.name === amountField && value !== undefined) setAmount(value);
                          if (isPurchase && field.name === 'tasa' && value !== undefined) setPurchaseRate(value);
                        }}
                        aria-invalid={field.name === amountField && exceedsBalance || undefined}
                        name={field.name}
                        type={field.type === 'date' ? 'date' : 'text'}
                        inputMode={field.type === 'number' ? 'decimal' : undefined}
                        required={!field.optional}
                        defaultValue={field.name === amountField || (isPurchase && field.name === 'tasa') ? undefined : field.type === 'number' ? formatAmountInput(String(initial[field.name] ?? '')) : initial[field.name] ?? (field.type === 'date' ? today() : undefined)}
                        className={recordFieldClass}
                      />
                      {field.name === amountField && exceedsBalance && <span role="alert" className="text-xs text-destructive">El monto supera el saldo disponible.</span>}
                      </>
                    )}
                  </label>
                );
              })}
            </fieldset>
            <RecordActions submitDisabled={exceedsBalance || (isPurchase && (!validPurchaseQuote || !currency || (showBalance && (!hasSource || !destinationId))))} busy={busy} label={edit ? 'Guardar cambios' : 'Guardar registro'} onClose={onClose} onDelete={edit && isAdmin ? handleDelete : undefined} deleteLabel={isPurchase ? 'Eliminar compra' : isSale ? 'Eliminar venta' : 'Eliminar registro'} />
          </form>
        </RecordDialog>
      )}
    </>
  );
};
