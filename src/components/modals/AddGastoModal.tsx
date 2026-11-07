import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { useAirtable, type GastoItem } from '../../context/AirtableContext';
import { AccountSelect, accountLabel } from './AccountSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddGastoModalProps {
  isOpen: boolean;
  record?: GastoItem;
  onClose: () => void;
}

const categories = [
  'Arrendamiento', 'Nómina y Salarios', 'Combustible y Transporte', 'Servicios Públicos (Agua, Luz, Gas)',
  'Logística y Envíos (Ligas, Encomiendas)', 'Mantenimiento y Operación', 'Gastos Financieros y Bancarios',
  'Alimentación y Viáticos', 'Otros Gastos Operativos',
];

export const AddGastoModal = ({ isOpen, onClose, record }: AddGastoModalProps) =>
  isOpen ? <GastoForm key={record?.id} onClose={onClose} record={record} /> : null;

const GastoForm = ({ onClose, record }: Pick<AddGastoModalProps, 'onClose' | 'record'>) => {
  const { data, createGasto, updateGasto } = useAirtable();
  const [divisa, setDivisa] = useState<string>(record?.divisa || 'COP');
  const [accountId, setAccountId] = useState(record?.origenFondosId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accounts = divisa === 'COP' ? data.activosLiquidos : data.activosDigitales;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const monto = Number(fields.get('monto'));
    const concepto = String(fields.get('concepto')).trim();
    const account = accounts.find((item) => item.id === accountId || (!accountId && accountLabel(item) === record?.origenFondos));
    if (!account || !concepto || !Number.isFinite(monto) || monto <= 0) {
      setError('Completa el concepto, selecciona el origen e ingresa un monto mayor que cero.');
      return;
    }

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();
    try {
      const success = await (record ? updateGasto : createGasto)({
        id: record?.id,
        concepto, divisa, monto, origenFondos: accountLabel(account), origenFondosId: account.id,
        categoria: fields.get('categoria'), fecha: fields.get('fecha'),
        comprobanteUrl: record ? undefined : await uploadReceipt(fields.get('comprobante'), 'gastos'),
      });
      if (!success) throw new Error();
      finishSound(true);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo registrar el gasto.');
    } finally {
      finishSound(false);
      setBusy(false);
    }
  };

  return (
    <RecordDialog title={record ? "Editar gasto" : "Registrar gasto"} description="Clasifica el gasto y selecciona la cuenta o billetera de origen." icon="ri-receipt-line" busy={busy} error={error} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <label className={recordLabelClass}>
            <span>Concepto</span>
            <input name="concepto" defaultValue={record?.concepto} required className={recordFieldClass} />
          </label>
          <label className={recordLabelClass}>
            <span>Categoría contable</span>
            <select name="categoria" defaultValue={record?.categoria || ''} required className={recordFieldClass}>
              <option value="">Seleccionar categoría</option>
              {[...new Set([...categories, ...(record?.categoria ? [record.categoria] : [])])].map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={recordLabelClass}>
              <span>Divisa</span>
              <select value={divisa} onChange={(event) => { setDivisa(event.target.value); setAccountId(''); }} className={recordFieldClass}>
                <option>COP</option><option>USDT</option>
              </select>
            </label>
            <label className={recordLabelClass}>
              <span>Monto</span>
              <input type="number" name="monto" defaultValue={record?.monto} step="any" min="0" required className={recordFieldClass} />
            </label>
          </div>
          <AccountSelect label={divisa === 'COP' ? 'Cuenta de origen' : 'Billetera de origen'} accounts={accounts} value={accountId || accounts.find((item) => accountLabel(item) === record?.origenFondos)?.id || ''} onChange={setAccountId} />
          <label className={recordLabelClass}>
            <span>Fecha</span>
            <input type="date" name="fecha" required defaultValue={record?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10)} className={recordFieldClass} />
          </label>
          {!record && <ReceiptInput />}
        </fieldset>
        <RecordActions busy={busy} label={record ? "Guardar cambios" : "Registrar gasto"} onClose={onClose} />
      </form>
    </RecordDialog>
  );
};
