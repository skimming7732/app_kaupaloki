import { formatAmountField, formatAmountInput, parseAmountInput, parseFinalAmount } from '../../utils/amountInput';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { formatNumber, formatRate, todayBogota } from '../../utils/formatters';
import { CurrencySelect } from './CurrencySelect';
import { AccountSelect, type Account } from './AccountSelect';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';
import { useAuth } from '../../context/AuthContext';
import { useData, type CatalogTable } from '../../context/DataContext';
import { AmountEntryMode, type AmountMode } from '../common/AmountEntryMode';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  optional?: boolean;
  options?: { value: string; label: string }[];
  accounts?: Account[];
};

type Form = {
  title: string;
  description: string;
  icon: string;
  fields: Field[];
};

const dateField: Field = { name: 'fecha', label: 'Fecha de la operación', type: 'date' };
const today = () => todayBogota();

export const AddCatalogButton = ({ table, edit, allowDelete = true, buttonClassName }: {
  table: Exclude<CatalogTable, 'activos_liquidos' | 'activos_digitales'>;
  edit?: { id: string; historical?: boolean; fields: Record<string, any> };
  allowDelete?: boolean;
  buttonClassName?: string;
}) => {
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
  const [finalAmount, setFinalAmount] = useState('');
  const [amountMode, setAmountMode] = useState<AmountMode>('initial');
  const [rateInput, setRateInput] = useState('');
  const [feeInput, setFeeInput] = useState('');

  const isPurchase = table === 'compras_usdt';
  const isSale = table === 'ventas_usdt';
  const isUsdt = isPurchase || isSale;
  const sourceField = 'wallet_origen_id';
  const amountField = isPurchase ? 'valor_comprado' : 'usdt_vendido';
  const sourceCurrency = isPurchase ? currency : 'USDT';
  const selectedCurrency = data.divisas.find((item) => item.codigo === currency);

  const previousPending = edit && !edit.historical && edit.fields.divisa_codigo === currency
    ? Number(edit.fields.valor_comprado) : 0;
  const pendingBalance = (selectedCurrency?.totalPendiente ?? 0) + previousPending;

  const source = data.activosDigitales.find((item) => item.id === sourceId);
  const previousDebit = source && edit?.fields[sourceField] === sourceId &&
    (!isPurchase || edit.fields.divisa_codigo === currency)
    ? Number(edit.fields[amountField]) + (isSale ? Number(edit.fields.fee_usdt ?? 0) : 0) : 0;

  // For purchase, funds ALWAYS come from the currency balance. For sales, from the wallet.
  const balance = isPurchase ? pendingBalance : Number(source?.saldoReal ?? source?.saldoCop ?? source?.saldoUsdt ?? 0) + previousDebit;
  const hasSource = isPurchase ? Boolean(selectedCurrency) : Boolean(source);

  const previousRate = edit && edit.fields.tasa !== undefined && edit.fields.tasa !== null
    ? Number(edit.fields.tasa) : null;
  const initialRate = previousRate !== null
    ? (previousRate > 0 ? (previousRate >= 0.0001 ? formatRate(previousRate) : formatAmountInput(String(previousRate))) : '0')
    : '';
  const rateUnchanged = !!edit && rateInput === initialRate;
  const rate = rateUnchanged && previousRate !== null ? previousRate : parseAmountInput(rateInput);
  const fromFinal = isUsdt && amountMode === 'final';
  const finalDecimals = isPurchase ? 6 : 2;
  const parsedFinal = parseFinalAmount(finalAmount, finalDecimals);
  const numericAmount = !fromFinal ? parseAmountInput(amount) : Number.isFinite(rate) && rate > 0
    ? (isPurchase ? parsedFinal * rate : parsedFinal / rate) : NaN;
  const saleFee = isSale && feeInput ? parseAmountInput(feeInput) : 0;
  const validFee = Number.isFinite(saleFee) && saleFee >= 0 && !/\.\d{7,}$/.test(feeInput);
  const walletOut = Number((numericAmount + saleFee).toFixed(12));
  const availableAmount = isSale ? Math.max(0, Number((balance - saleFee).toFixed(12))) : balance;
  const exceedsBalance = !edit?.historical && hasSource && (isSale ? walletOut : numericAmount) > balance;
  const received = isPurchase && rate === 0
    ? 0
    : !fromFinal && rateUnchanged && numericAmount === Number(edit?.fields.valor_comprado)
    ? Number(edit?.fields.usdt_comprado)
    : (rate > 0 ? Number((numericAmount / rate).toFixed(6)) : 0);
  const copReceived = numericAmount * rate;
  const validPurchaseQuote = isPurchase
    ? (Number.isFinite(rate) && rate >= 0 && Number.isFinite(received) && (fromFinal ? received > 0 : received >= 0)
      && Number.isFinite(numericAmount) && numericAmount > 0)
    : false;
  const validSaleQuote = rate > 0 && Number.isFinite(copReceived) && copReceived > 0;
  const finalUnit = isPurchase ? 'USDT' : 'COP';
  const changeAmountMode = (mode: AmountMode) => {
    if (mode === amountMode) return;
    const outputAmount = isPurchase ? received : copReceived;
    if (mode === 'final' && outputAmount > 0 && Number.isFinite(outputAmount)) {
      setFinalAmount(formatNumber(outputAmount, 0, finalDecimals));
    } else if (mode === 'initial' && numericAmount > 0 && Number.isFinite(numericAmount)) {
      setAmount(formatNumber(numericAmount, 0, 20));
    }
    setAmountMode(mode);
  };
  const useMaximum = () => {
    if (!fromFinal) {
      setAmount(formatNumber(availableAmount, 0, 20));
      return;
    }
    const factor = 10 ** finalDecimals;
    const maximum = isPurchase ? availableAmount / rate : availableAmount * rate;
    setFinalAmount(formatNumber(Math.floor(maximum * factor) / factor, 0, finalDecimals));
  };
  const liquidAccounts = data.activosLiquidos.filter((a) => (a.divisa || 'COP') === 'COP');
  const wallets = data.activosDigitales;
  const currencies = data.divisas.map((d) => ({ value: d.codigo, label: d.codigo + ' · ' + d.nombre }));

  const forms: Record<typeof table, Form> = {
    compras_usdt: {
      title: 'Registrar compra USDT', description: 'Indica la divisa entregada, el proveedor y la billetera que recibe los USDT.', icon: 'ri-shopping-cart-2-line',
      fields: [
        dateField,
        { name: 'proveedor', label: 'Proveedor', optional: true },
        { name: 'divisa_codigo', label: 'Divisa entregada' },
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
        { name: 'fee_usdt', label: 'Fee de envío (USDT)', type: 'number', optional: true },
        { name: 'tasa', label: 'Tasa de venta (COP por USDT)', type: 'number' },
        { name: 'destino_fondos_id', label: 'Cuenta de destino en COP', accounts: liquidAccounts },
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
    description: 'Modifica los datos, montos o billetera de la operación.',
    fields: base.fields,
  } : base;

  const showBalance = isUsdt && !edit?.historical;
  const sameWallet = isSale && showBalance && Boolean(sourceId) && sourceId === destinationId;
  const missingAccounts = isPurchase ? !destinationId : !edit?.historical && (!sourceId || !destinationId);
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
    const values = new FormData(event.currentTarget);
    const record: Record<string, string | number> = {};

    if (isUsdt && !(isPurchase ? validPurchaseQuote : validSaleQuote)) {
      setError('Ingresa un monto y una tasa válidos.');
      return;
    }
    if (isPurchase && exceedsBalance) {
      setError('El monto inicial supera el saldo pendiente de la divisa.');
      return;
    }

    if (isPurchase) {
      if (!currency) {
        setError('Selecciona la divisa entregada.');
        return;
      }
      if (!destinationId) {
        setError('Selecciona la billetera de destino.');
        return;
      }
      record.divisa_codigo = currency;
      record.wallet_destino_id = destinationId;
      record.usdt_comprado = received;
      record.costo = rate === 0 || numericAmount === 0 ? 0 : Number((received / numericAmount).toFixed(8));
    }

    if (isSale) {
      if (!validFee || exceedsBalance) {
        setError(!validFee ? 'Ingresa un fee válido con hasta seis decimales.' : 'El monto y el fee superan el saldo de la billetera.');
        return;
      }
      if (missingAccounts) {
        setError('Selecciona la billetera de origen y la cuenta de destino.');
        return;
      }
      if (!edit?.historical) {
        record.wallet_origen_id = sourceId;
        record.destino_fondos_id = destinationId;
      }
    }

    for (const field of form.fields) {
      if (isUsdt && field.accounts) continue;
      if (isSale && edit?.historical && field.name === 'fee_usdt') continue;
      if (isPurchase && (field.name === 'usdt_comprado' || field.name === 'divisa_codigo')) continue;
      if (isUsdt && field.name === amountField) {
        record[amountField] = numericAmount;
        continue;
      }
      if (isUsdt && field.name === 'tasa') {
        record.tasa = rate;
        continue;
      }
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
      <div key={field.name}>
        <CurrencySelect label={field.label} currencies={data.divisas}
          value={currency} onChange={(code) => setCurrency(code)}
          details={(item) => formatNumber(item.totalPendiente, 0, 6)} />
        <input type="hidden" name="divisa_codigo" value={currency} />
      </div>
    );
    if (field.accounts) {
      if (edit?.historical) return null;
      const isSource = field.name === sourceField;
      return (
        <AccountSelect key={field.name}
          label={field.label}
          name={field.name} accounts={field.accounts} value={isSource ? sourceId : destinationId}
          onChange={isSource ? setSourceId : setDestinationId} compactSummary={isUsdt} />
      );
    }

    const isAmount = isUsdt && field.name === amountField;
    const isRate = isUsdt && field.name === 'tasa';
    const isFee = isSale && field.name === 'fee_usdt';
    const unit = isAmount ? (fromFinal ? finalUnit : sourceCurrency) : isRate && isPurchase && currency ? currency + ' por USDT' : '';
    return (
      <div className="min-w-0 space-y-1.5" key={field.name}>
        <label className={recordLabelClass}>
          <span>{isAmount && fromFinal ? 'Monto final' : field.label}{unit && <small className="ml-1 whitespace-nowrap text-muted-foreground">({unit})</small>}{field.optional && <small className="ml-1 text-muted-foreground">(opcional)</small>}</span>
          {field.options ? (
            <select name={field.name} required className={recordFieldClass} defaultValue={initial[field.name]}>
              <option value="">Seleccionar</option>
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              value={isAmount ? (fromFinal ? finalAmount : amount) : isRate ? rateInput : isFee ? feeInput : undefined}
              defaultValue={isAmount || isRate || isFee ? undefined : field.type === 'number'
                ? formatAmountInput(String(initial[field.name] ?? ''))
                : initial[field.name] ?? (field.type === 'date' ? today() : undefined)}
              onChange={field.type === 'number' ? (event) => {
                const value = formatAmountField(event.currentTarget);
                if (value === undefined) return;
                if (isAmount) (fromFinal ? setFinalAmount : setAmount)(value);
                if (isRate) setRateInput(value);
                if (isFee) setFeeInput(value);
              } : undefined}
              aria-invalid={(isAmount && (exceedsBalance || (fromFinal && Boolean(finalAmount) && !Number.isFinite(parsedFinal)))) || (isFee && !validFee) || undefined}
              name={isAmount && fromFinal ? 'monto_final' : field.name}
              type={field.type === 'date' ? 'date' : 'text'}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={isRate ? '0.0000' : isAmount || isFee ? '0.00' : field.name === 'proveedor' ? 'Nombre o empresa del proveedor' : undefined}
              required={!field.optional}
              className={recordFieldClass}
            />
          )}
        </label>
        {isAmount && showBalance && (
          <div className="flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{hasSource ? (
              <>{isPurchase ? 'Pendiente por comprar' : 'Saldo disponible'} <strong className="text-foreground">{formatNumber(balance, 0, 6)} {sourceCurrency}</strong></>
            ) : (isPurchase ? 'Selecciona la divisa para ver el saldo pendiente.' : 'Selecciona el origen para ver el saldo.')}</span>
            {hasSource && availableAmount > 0 && (!fromFinal || (Number.isFinite(rate) && rate > 0)) && (
              <button type="button" onClick={useMaximum}
                className="min-h-8 shrink-0 rounded-lg bg-primary/10 px-2.5 font-semibold text-primary hover:bg-primary/20">Máx.</button>
            )}
          </div>
        )}
        {isAmount && exceedsBalance && <p role="alert" className="text-xs text-destructive">{isSale ? 'El monto y el fee superan el saldo de la billetera.' : 'El monto supera el saldo disponible.'}</p>}
        {isAmount && fromFinal && finalAmount && !Number.isFinite(parsedFinal) && (
          <p className="text-xs text-destructive">Ingresa un monto positivo con hasta {finalDecimals} decimales.</p>
        )}
        {isRate && fromFinal && rate === 0 && <p className="text-xs text-destructive">Usa una tasa mayor que cero para calcular el monto inicial.</p>}
        {isFee && !validFee && <p role="alert" className="text-xs text-destructive">Ingresa un fee válido con hasta seis decimales.</p>}
      </div>
    );
  };

  const renderFields = (...names: string[]) => names.map((name) => {
    const field = form.fields.find((item) => item.name === name);
    return field ? renderField(field) : null;
  });

  if (!isAdmin) return null;

  return (
    <>
      <button type="button" className={buttonClassName ?? (edit ? 'inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted' : recordButtonClass)}
        onClick={() => {
          setError('');
          const initSource = String(initial[sourceField] ?? '');
          const fallbackWallet = isSale && !edit && !initSource ? wallets[0]?.id || '' : initSource;
          setSourceId(fallbackWallet);
          const fallbackDest = isPurchase && !edit ? wallets[0]?.id || '' : String(initial[isPurchase ? 'wallet_destino_id' : 'destino_fondos_id'] ?? '');
          setDestinationId(fallbackDest);
          setAmount(formatAmountInput(String(initial[amountField] ?? '')));
          setFinalAmount('');
          setAmountMode('initial');
          const fallbackCurrency = isPurchase && !edit ? (data.divisas[0]?.codigo || '') : String(initial.divisa_codigo ?? '');
          setCurrency(fallbackCurrency);
          setRateInput(initialRate);
          setFeeInput(isSale && initial.fee_usdt ? formatNumber(Number(initial.fee_usdt), 0, 6) : '');
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
                  <section aria-label="Divisa y billetera" className="space-y-4">
                    {isPurchase ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderFields('divisa_codigo', 'wallet_destino_id')}
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderFields('wallet_origen_id', 'destino_fondos_id')}
                      </div>
                    )}
                    {sameWallet && <p role="alert" className="text-xs text-destructive">Elige una billetera de destino distinta de la de origen.</p>}
                  </section>

                  <section aria-label="Monto y tasa" className="space-y-3 border-t border-border pt-4">
                    <AmountEntryMode mode={amountMode} onChange={changeAmountMode} />
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                      {renderFields(amountField, 'tasa')}
                    </div>
                    {isSale && !edit?.historical && (
                      <div className="grid items-end gap-2 sm:grid-cols-2 sm:gap-4">
                        {renderFields('fee_usdt')}
                        <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          Salida total de la billetera{' '}
                          <strong className="text-foreground">{numericAmount > 0 && validFee ? formatNumber(walletOut, 2, 6) + ' USDT' : '—'}</strong>
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">{fromFinal ? 'Monto inicial calculado' : isPurchase ? 'USDT a recibir' : 'COP a recibir'}</p>
                        <p className="text-xs text-muted-foreground">{fromFinal
                          ? (isPurchase ? 'USDT a recibir × tasa' : 'COP a recibir ÷ tasa')
                          : (isPurchase ? 'Monto entregado ÷ tasa' : 'USDT vendidos × tasa')}</p>
                      </div>
                      <output className="break-all text-xl font-bold tabular-nums text-primary" aria-live="polite">
                        {fromFinal
                          ? (Number.isFinite(numericAmount) ? formatNumber(numericAmount, 0, 12) + (sourceCurrency ? ' ' + sourceCurrency : '') : '—')
                          : isPurchase
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
            <RecordActions submitDisabled={exceedsBalance || sameWallet || (isPurchase && (!validPurchaseQuote || !currency || missingAccounts)) || (isSale && (!validSaleQuote || !validFee || missingAccounts))} busy={busy} label={edit ? 'Guardar cambios' : 'Guardar registro'} onClose={onClose} onDelete={edit && isAdmin && allowDelete ? handleDelete : undefined} deleteLabel={isPurchase ? 'Eliminar compra' : isSale ? 'Eliminar venta' : 'Eliminar registro'} />
          </form>
        </RecordDialog>
      )}
    </>
  );
};
