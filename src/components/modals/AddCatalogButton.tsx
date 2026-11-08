import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useId, useState } from 'react';
import { formatNumber, formatRate } from '../../utils/formatters';
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
  const [rateInput, setRateInput] = useState('');
  const originGroup = useId();
  const [useCurrencyBalance, setUseCurrencyBalance] = useState(true);
  const isPurchase = table === 'compras_usdt';
  const isSale = table === 'ventas_usdt';
  const isUsdt = isPurchase || isSale;
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
  const rateUnchanged = !!edit && rateInput === initialRate;
  const rate = rateUnchanged ? previousRate : parseAmountInput(rateInput);
  const received = rateUnchanged && numericAmount === Number(edit?.fields.valor_comprado)
    ? Number(edit?.fields.usdt_comprado)
    : Number((numericAmount / rate).toFixed(6));
  const copReceived = numericAmount * rate;
  const validPurchaseQuote = rate > 0 && Number.isFinite(received) && received > 0;
  const validSaleQuote = rate > 0 && Number.isFinite(copReceived) && copReceived > 0;
  const liquidAccounts = data.activosLiquidos.filter((a) => (a.divisa || 'COP') === 'COP');
  const wallets = data.activosDigitales;
  const currencies = data.divisas.map((d) => ({ value: d.codigo, label: d.codigo + ' · ' + d.nombre }));

  const forms: Record<CatalogTable, Form> = {
    compras_usdt: {
      title: 'Registrar compra USDT', description: 'Indica la divisa entregada, el proveedor y la billetera que recibe los USDT.', icon: 'ri-shopping-cart-2-line',
      fields: [
        dateField,
        { name: 'proveedor', label: 'Proveedor', optional: true },
        { name: 'divisa_codigo', label: 'Divisa entregada' },
        { name: 'origen_fondos_id', label: 'Origen de los fondos', accounts: sources },
        { name: 'valor_comprado', label: 'Monto entregado', type: 'number' },
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
        { name: 'destino_fondos_id', label: 'Cuenta de destino en COP', accounts: liquidAccounts },
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
  const showBalance = isUsdt && !edit?.historical;
  const sameWallet = showBalance && !!sourceId && !fromCurrencyBalance && sourceId === destinationId;
  const missingAccounts = showBalance && (!hasSource || !destinationId);
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
    if (isUsdt && !(isPurchase ? validPurchaseQuote : validSaleQuote)) {
      setError('Ingresa un monto y una tasa válidos.');
      return;
    }
    if (sameWallet) {
      setError('Elige una billetera de destino distinta de la de origen.');
      return;
    }
    const values = new FormData(event.currentTarget);
    if (isUsdt) values.set('tasa', formatNumber(rate, 0, 20));
    if (isPurchase) {
      values.set('divisa_codigo', currency);
      values.set('usdt_comprado', formatNumber(received, 0, 20));
      if (fromCurrencyBalance) values.set(sourceField, CURRENCY_BALANCE_SOURCE);
    }
    const record: Record<string, string | number> = {};
    for (const field of form.fields) {
      if (isUsdt && edit?.historical && field.accounts) continue;
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
      } else if (edit && field.optional) {
        record[field.name] = '';
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

  const renderField = (field: Field) => {
    if (isPurchase && field.name === 'divisa_codigo') return (
      <CurrencySelect key={field.name} label={field.label} currencies={data.divisas}
        value={currency} onChange={(code) => { if (code !== currency) setSourceId(''); setCurrency(code); }}
        details={useCurrencyBalance ? (item) => formatNumber(item.totalPendiente, 0, 6) : undefined} />
    );
    if (field.accounts) {
      if (edit?.historical) return null;
      const isSource = field.name === sourceField;
      if (isPurchase && isSource && (useCurrencyBalance || !selectedCurrency)) return null;
      return (
        <AccountSelect key={field.name}
          label={isPurchase && isSource ? (currency === 'USDT' ? 'Billetera de origen' : 'Cuenta de origen') : field.label}
          name={field.name} accounts={field.accounts} value={isSource ? sourceId : destinationId}
          onChange={isSource ? setSourceId : setDestinationId} compactSummary={isUsdt} />
      );
    }

    const isAmount = isUsdt && field.name === amountField;
    const isRate = isUsdt && field.name === 'tasa';
    const unit = isAmount ? sourceCurrency : isRate && isPurchase && currency ? currency + ' por USDT' : '';
    return (
      <div className="min-w-0 space-y-1.5" key={field.name}>
        <label className={recordLabelClass}>
          <span>{field.label}{unit && <small className="ml-1 whitespace-nowrap text-muted-foreground">({unit})</small>}{field.optional && <small className="ml-1 text-muted-foreground">(opcional)</small>}</span>
          {field.options ? (
            <select name={field.name} required className={recordFieldClass} defaultValue={initial[field.name]}>
              <option value="">Seleccionar</option>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              value={isAmount ? amount : isRate ? rateInput : undefined}
              defaultValue={isAmount || isRate ? undefined : field.type === 'number'
                ? formatAmountInput(String(initial[field.name] ?? ''))
                : initial[field.name] ?? (field.type === 'date' ? today() : undefined)}
              onChange={field.type === 'number' ? (event) => {
                const value = formatAmountField(event.currentTarget);
                if (value === undefined) return;
                if (isAmount) setAmount(value);
                if (isRate) setRateInput(value);
              } : undefined}
              aria-invalid={isAmount && exceedsBalance || undefined}
              name={field.name}
              type={field.type === 'date' ? 'date' : 'text'}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={isRate ? '0.0000' : isAmount ? '0.00' : field.name === 'proveedor' ? 'Nombre o empresa del proveedor' : undefined}
              required={!field.optional}
              className={recordFieldClass}
            />
          )}
        </label>
        {isAmount && showBalance && (
          <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{hasSource ? (
              <>{fromCurrencyBalance ? 'Pendiente por comprar' : 'Saldo disponible'} <strong className="text-foreground">{formatNumber(balance, 0, 6)} {sourceCurrency}</strong></>
            ) : 'Selecciona el origen para ver el saldo.'}</span>
            {hasSource && balance > 0 && (
              <button type="button" onClick={() => setAmount(formatNumber(balance, 0, 20))}
                className="min-h-8 shrink-0 rounded-lg bg-primary/10 px-2.5 font-semibold text-primary hover:bg-primary/20">Máx.</button>
            )}
          </div>
        )}
        {isAmount && exceedsBalance && <p role="alert" className="text-xs text-destructive">El monto supera el saldo disponible.</p>}
      </div>
    );
  };

  const renderFields = (...names: string[]) => names.map((name) => {
    const field = form.fields.find((item) => item.name === name);
    return field ? renderField(field) : null;
  });

  return (
    <>
      <button type="button" className={edit ? 'inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted' : recordButtonClass}
        onClick={() => {
          setError('');
          const initSource = String(initial[sourceField] ?? '');
          const fallbackWallet = isSale && !edit && !initSource ? wallets[0]?.id || '' : initSource;
          setSourceId(fallbackWallet);
          setDestinationId(String(initial[isPurchase ? 'wallet_destino_id' : 'destino_fondos_id'] ?? ''));
          setAmount(formatAmountInput(String(initial[amountField] ?? '')));
          setCurrency(String(initial.divisa_codigo ?? ''));
          setRateInput(initialRate);
          setUseCurrencyBalance(!edit || initSource === CURRENCY_BALANCE_SOURCE);
          setOpen(true);
        }}>
        <i className={edit ? 'ri-edit-line' : 'ri-add-line'} aria-hidden="true" />{edit ? 'Editar' : form.title}
      </button>
      {open && (
        <RecordDialog {...form} wide={isUsdt} busy={busy} error={error} onClose={onClose}>
          <form onSubmit={submit} className="space-y-6">
            <fieldset disabled={busy} className="min-w-0">
              {isUsdt ? (
                <div className="space-y-6">
                  <section aria-label="Origen y destino" className="space-y-4">
                    {isPurchase && showBalance && (
                      <fieldset className="min-w-0">
                        <legend className="mb-2 text-sm font-semibold">¿De dónde salen los fondos?</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {[
                            { pending: true, title: 'Saldo pendiente de la divisa', detail: 'Usa lo que queda por comprar', icon: 'ri-exchange-dollar-line' },
                            { pending: false, title: 'Activos líquidos', detail: 'Cuenta o billetera si entregas USDT', icon: 'ri-bank-line' },
                          ].map(({ pending, title, detail, icon }) => (
                            <label key={title} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-input bg-background px-3 py-2 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                              <input type="radio" name={originGroup} checked={useCurrencyBalance === pending}
                                onChange={() => setUseCurrencyBalance(pending)} className="shrink-0 accent-primary" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">{title}</span>
                                <span className="block text-xs text-muted-foreground">{detail}</span>
                              </span>
                              <i className={icon + ' shrink-0 text-lg text-primary'} aria-hidden="true" />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    {isPurchase && renderFields('divisa_codigo', 'origen_fondos_id')}
                    {edit?.historical ? (
                      <p className="text-xs text-muted-foreground">En esta operación histórica puedes corregir los datos de la operación. Las cuentas quedan fijas.</p>
                    ) : (
                      <div className={isPurchase ? undefined : 'grid gap-4 sm:grid-cols-2'}>
                        {isPurchase ? renderFields('wallet_destino_id') : renderFields('wallet_origen_id', 'destino_fondos_id')}
                      </div>
                    )}
                    {sameWallet && <p role="alert" className="text-xs text-destructive">Elige una billetera de destino distinta de la de origen.</p>}
                  </section>

                  <section aria-label="Monto y tasa" className="space-y-3 border-t border-border pt-4">
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                      {renderFields(amountField, 'tasa')}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{isPurchase ? 'USDT a recibir' : 'COP a recibir'}</p>
                        <p className="text-xs text-muted-foreground">{isPurchase ? 'Monto entregado ÷ tasa' : 'USDT vendidos × tasa'}</p>
                      </div>
                      <output className="break-all text-xl font-bold tabular-nums text-primary" aria-live="polite">
                        {isPurchase
                          ? (validPurchaseQuote ? formatNumber(received, 2, 6) + ' USDT' : '—')
                          : (validSaleQuote ? formatNumber(copReceived, 0, 2) + ' COP' : '—')}
                      </output>
                    </div>
                  </section>

                  <section aria-label="Datos de la operación" className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                    {isPurchase ? renderFields('fecha', 'proveedor') : renderFields('fecha', 'concepto')}
                  </section>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">{form.fields.map(renderField)}</div>
              )}
            </fieldset>
            <RecordActions submitDisabled={exceedsBalance || sameWallet || (isPurchase && (!validPurchaseQuote || !currency || missingAccounts)) || (isSale && (!validSaleQuote || missingAccounts))} busy={busy} label={edit ? 'Guardar cambios' : 'Guardar registro'} onClose={onClose} onDelete={edit && isAdmin ? handleDelete : undefined} deleteLabel={isPurchase ? 'Eliminar compra' : isSale ? 'Eliminar venta' : 'Eliminar registro'} />
          </form>
        </RecordDialog>
      )}
    </>
  );
};
