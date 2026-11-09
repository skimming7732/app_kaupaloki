import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { ReceiptInput } from './ReceiptInput';
import { uploadReceipt } from '../../utils/receipts';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { todayBogota } from '../../utils/formatters';
import React, { useState } from 'react';
import { useData, type GastoItem } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AccountSelect, accountLabel } from './AccountSelect';
import { CategorySearchSelect } from '../common/CategorySearchSelect';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddGastoModalProps {
  isOpen: boolean;
  record?: GastoItem;
  onClose: () => void;
  isCashContext?: boolean;
  defaultOrigenFondos?: string;
}

const categories = [
  'Nómina y Sueldos', 'Arrendamiento', 'Nómina y Salarios', 'Combustible y Transporte', 'Servicios Públicos (Agua, Luz, Gas)',
  'Logística y Envíos (Ligas, Encomiendas)', 'Mantenimiento y Operación', 'Gastos Financieros y Bancarios',
  'Alimentación y Viáticos', 'Otros Gastos Operativos',
];

export const AddGastoModal = ({ isOpen, onClose, record, isCashContext, defaultOrigenFondos }: AddGastoModalProps) =>
  isOpen ? <GastoForm key={record?.id ?? (isCashContext ? 'cash' : 'normal')} onClose={onClose} record={record} isCashContext={isCashContext} defaultOrigenFondos={defaultOrigenFondos} /> : null;

const GastoForm = ({ onClose, record, isCashContext, defaultOrigenFondos }: Omit<AddGastoModalProps, 'isOpen'>) => {
  const { data, createGasto, updateGasto, deleteGasto } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';

  // Find cash account in activosLiquidos
  const cashAccount = React.useMemo(() => {
    return (data.activosLiquidos || []).find((a: any) =>
      (a.activo && a.activo.toLowerCase().includes('efectivo')) ||
      (a.institucion && a.institucion.toLowerCase().includes('caja'))
    ) || data.activosLiquidos[0];
  }, [data.activosLiquidos]);

  const [divisa, setDivisa] = useState<string>(isCashContext ? 'COP' : (record?.divisa || 'COP'));
  const [categoria, setCategoria] = useState<string>(record?.categoria || '');
  const [accountId, setAccountId] = useState<string>(() => {
    if (record?.origenFondosId) return record.origenFondosId;
    if (isCashContext && cashAccount) return cashAccount.id;
    return '';
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accounts = divisa === 'COP' ? data.activosLiquidos : data.activosDigitales;

    const handleDelete = async () => {
    if (!record) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el gasto "${record.concepto}"?`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ok = await deleteGasto(record.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el gasto.');
      setBusy(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const monto = parseAmountInput(String(fields.get('monto') ?? ''));
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
        categoria: categoria || String(fields.get('categoria') || ''), fecha: fields.get('fecha'),
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
          <div className="space-y-1.5">
            <label className={recordLabelClass}>Categoría contable</label>
            <CategorySearchSelect value={categoria} onChange={setCategoria} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {!isCashContext ? (
              <label className={recordLabelClass}>
                <span>Divisa</span>
                <select value={divisa} onChange={(event) => { setDivisa(event.target.value); setAccountId(''); }} className={recordFieldClass}>
                  <option>COP</option><option>USDT</option>
                </select>
              </label>
            ) : (
              <div className="space-y-1.5">
                <span className={recordLabelClass}>Divisa</span>
                <div className="min-h-11 rounded-xl border border-input bg-muted/40 px-3.5 py-2 text-sm text-foreground flex items-center font-bold font-mono">
                  COP (Pesos Colombianos)
                </div>
              </div>
            )}
            <label className={recordLabelClass}>
              <span>Monto</span>
              <input type="text" inputMode="decimal" name="monto" defaultValue={record ? formatAmountInput(String(record.monto)) : undefined} onChange={(event) => formatAmountField(event.currentTarget)} required className={recordFieldClass} />
            </label>
          </div>
          {!isCashContext ? (
            <AccountSelect label={divisa === 'COP' ? 'Cuenta de origen' : 'Billetera de origen'} accounts={accounts} value={accountId || accounts.find((item) => accountLabel(item) === record?.origenFondos)?.id || ''} onChange={setAccountId} />
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-2">
                <i className="ri-safe-2-line text-emerald-500 text-base" />
                <span>Origen de fondos: <strong>Efectivo (Caja)</strong></span>
              </span>
              <span className="font-mono text-muted-foreground text-[11px] px-2 py-0.5 rounded bg-muted border border-border">
                {cashAccount ? accountLabel(cashAccount) : 'EFECTIVO-CAJA'}
              </span>
            </div>
          )}
          <label className={recordLabelClass}>
            <span>Fecha</span>
            <input type="date" name="fecha" required defaultValue={record?.fecha?.slice(0, 10) || todayBogota()} className={recordFieldClass} />
          </label>
          {!record && <ReceiptInput />}
        </fieldset>
        <RecordActions busy={busy} label={record ? "Guardar cambios" : "Registrar gasto"} onClose={onClose} onDelete={record && isAdmin ? handleDelete : undefined} deleteLabel="Eliminar gasto" />
      </form>
    </RecordDialog>
  );
};
