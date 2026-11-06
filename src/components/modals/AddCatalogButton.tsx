import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { accountOptionLabel, type Account } from './AccountSelect';
import { useAirtable, type CatalogTable } from '../../context/AirtableContext';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';

type Option = { value: string; label: string };
type Field = { name: string; label: string; type?: 'date' | 'number'; options?: Option[]; optional?: boolean };
type Form = { title: string; description: string; icon: string; fields: Field[] };

const dateField: Field = { name: 'fecha', label: 'Fecha de operación', type: 'date' };
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' }).format(new Date());

export const AddCatalogButton = ({ table }: { table: CatalogTable }) => {
  const { data, createCatalogRecord } = useAirtable();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const isPurchase = table === 'compras_usdt';
  const isSale = table === 'ventas_usdt';
  const sourceField = isPurchase ? 'origen_fondos_id' : 'wallet_origen_id';
  const amountField = isPurchase ? 'valor_comprado' : 'usdt_vendido';
  const sourceCurrency = isPurchase ? currency : 'USDT';
  const sources: Account[] = isPurchase
    ? [...data.activosLiquidos.filter((a) => (a.divisa || 'COP') === sourceCurrency),
      ...data.activosDigitales.filter(() => sourceCurrency === 'USDT')]
    : data.activosDigitales;
  const source = sources.find((item) => item.id === sourceId);
  const balance = Number(source?.saldoReal ?? source?.saldoCop ?? source?.saldoUsdt ?? 0);
  const exceedsBalance = !!source && Number(amount) > balance;
  const liquidAccounts = data.activosLiquidos.filter((a) => (a.divisa || 'COP') === 'COP').map((a) => ({ value: a.id, label: accountOptionLabel(a) }));
  const wallets = data.activosDigitales.map((w) => ({ value: w.id, label: accountOptionLabel(w) }));
  const currencies = data.divisas.map((d) => ({ value: d.codigo, label: d.codigo + ' · ' + d.nombre }));

  const forms: Record<CatalogTable, Form> = {
    compras_usdt: {
      title: 'Registrar compra USDT', description: 'Indica la divisa entregada y la billetera que recibe los USDT.', icon: 'ri-shopping-cart-2-line',
      fields: [
        dateField, { name: 'divisa_codigo', label: 'Divisa entregada', options: currencies },
        { name: 'origen_fondos_id', label: 'Cuenta o billetera de origen', options: sources.map((account) => ({ value: account.id, label: accountOptionLabel(account) })) },
        { name: 'valor_comprado', label: 'Monto en divisa', type: 'number' },
        { name: 'usdt_comprado', label: 'USDT recibidos', type: 'number' },
        { name: 'wallet_destino_id', label: 'Billetera de destino', options: wallets },
      ],
    },
    ventas_usdt: {
      title: 'Registrar venta USDT', description: 'Selecciona la billetera de origen y la cuenta que recibe los COP.', icon: 'ri-funds-line',
      fields: [
        dateField, { name: 'concepto', label: 'Concepto' },
        { name: 'wallet_origen_id', label: 'Billetera de origen', options: wallets },
        { name: 'usdt_vendido', label: 'USDT vendidos', type: 'number' },
        { name: 'tasa', label: 'Tasa de venta (COP por USDT)', type: 'number' },
        { name: 'destino_fondos_id', label: 'Cuenta de destino', options: liquidAccounts },
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

  const form = forms[table];
  const onClose = () => setOpen(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if ((isPurchase || isSale) && (!source || exceedsBalance)) {
      setError('Selecciona un origen con saldo suficiente.');
      return;
    }
    const values = new FormData(event.currentTarget);
    const record: Record<string, string | number> = {};
    for (const field of form.fields) {
      const value = String(values.get(field.name) || '').trim();
      if (!value && !field.optional) {
        setError('Completa el campo ' + field.label + '.');
        return;
      }
      if (field.type === 'number') {
        const number = Number(value);
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
      await createCatalogRecord(table, record);
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
      <button type="button" className={recordButtonClass} onClick={() => { setError(''); setSourceId(''); setAmount(''); setCurrency(''); setOpen(true); }}>
        <i className="ri-add-line" aria-hidden="true" />{form.title}
      </button>
      {open && (
        <RecordDialog {...form} busy={busy} error={error} onClose={onClose}>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              {form.fields.map((field) => (
                <label className={recordLabelClass} key={field.name}>
                  <span>{field.label}{field.optional && <small className="ml-1 text-muted-foreground">(opcional)</small>}</span>
                  {field.options ? (
                    <select name={field.name} required className={recordFieldClass}
                      value={(isPurchase || isSale) && field.name === sourceField ? sourceId : field.name === 'divisa_codigo' ? currency : undefined}
                      onChange={(event) => {
                        if (field.name === sourceField) setSourceId(event.target.value);
                        if (field.name === 'divisa_codigo') {
                          setCurrency(event.target.value);
                          setSourceId('');
                        }
                      }}>
                      <option value="">{field.options.length ? 'Seleccionar' : 'Sin opciones configuradas'}</option>
                      {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : (
                    <>
                    {(isPurchase || isSale) && field.name === amountField && (
                      <span className="flex items-center justify-between gap-2 text-xs">
                        <span>{source ? 'Disponible ' + formatCurrency(balance, sourceCurrency) : 'Selecciona un origen para ver el saldo'}</span>
                        <button type="button" disabled={!source || balance <= 0} onClick={() => setAmount(String(balance))}
                          className="rounded border border-border px-2 py-1 text-primary disabled:opacity-50">Máx.</button>
                      </span>
                    )}
                    <input
                      value={(isPurchase || isSale) && field.name === amountField ? amount : undefined}
                      onChange={(event) => { if (field.name === amountField) setAmount(event.target.value); }}
                      aria-invalid={field.name === amountField && exceedsBalance || undefined}
                      name={field.name}
                      type={field.type || 'text'}
                      required={!field.optional}
                      min={field.type === 'number' ? 0 : undefined}
                      step={field.type === 'number' ? 'any' : undefined}
                      defaultValue={field.type === 'date' ? today() : undefined}
                      className={recordFieldClass}
                    />
                    {field.name === amountField && exceedsBalance && <span role="alert" className="text-xs text-destructive">El monto supera el saldo disponible.</span>}
                    </>
                  )}
                </label>
              ))}
            </fieldset>
            <RecordActions submitDisabled={exceedsBalance} busy={busy} label="Guardar registro" onClose={onClose} />
          </form>
        </RecordDialog>
      )}
    </>
  );
};
