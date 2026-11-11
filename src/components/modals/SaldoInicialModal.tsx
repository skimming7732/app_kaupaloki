import React, { useState } from 'react';
import { useData, type NormalizedData } from '../../context/DataContext';
import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { formatCOP } from '../../utils/formatters';
import { prepareSuccessSound } from '../../utils/confirmationSound';

interface SaldoInicialModalProps {
  cliente: NormalizedData['clientes'][number];
  isOpen: boolean;
  onClose: () => void;
}

export const SaldoInicialModal: React.FC<SaldoInicialModalProps> = ({ cliente, isOpen, onClose }) => {
  const { updateCliente } = useData();
  const currentInitial = Number(cliente.saldoInicialCop || 0);

  const [tipo, setTipo] = useState<'a_favor' | 'deuda'>(() => (currentInitial < 0 ? 'deuda' : 'a_favor'));
  const [monto, setMonto] = useState(() => (currentInitial !== 0 ? formatAmountInput(String(Math.abs(currentInitial))) : ''));
  const [concepto, setConcepto] = useState(() => cliente.conceptoSaldoInicial || 'Saldo inicial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericMonto = parseAmountInput(monto);
  const isValidMonto = Number.isFinite(numericMonto) && numericMonto > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMonto) return;

    setLoading(true);
    setError(null);
    const finishSound = prepareSuccessSound();

    try {
      const finalAmount = tipo === 'deuda' ? -Math.abs(numericMonto) : Math.abs(numericMonto);
      const ok = await updateCliente({
        id: cliente.id,
        saldoInicialCop: finalAmount,
        conceptoSaldoInicial: concepto.trim() || 'Saldo inicial',
      });
      if (!ok) throw new Error('No se pudo actualizar el saldo inicial.');
      finishSound(true);
      onClose();
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al guardar saldo inicial.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`¿Deseas eliminar el saldo inicial del cliente ${cliente.nombre}? Su saldo volverá a calcularse únicamente a partir de negocios y dispersiones reales.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    const finishSound = prepareSuccessSound();

    try {
      const ok = await updateCliente({
        id: cliente.id,
        saldoInicialCop: 0,
        conceptoSaldoInicial: '',
      });
      if (!ok) throw new Error('No se pudo restablecer el saldo inicial.');
      finishSound(true);
      onClose();
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al restablecer saldo inicial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-scales-3-line text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Saldo Inicial de Apertura</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {cliente.codigo} · {cliente.nombre}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              Tipo de balance inicial *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTipo('a_favor')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  tipo === 'a_favor'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <i className="ri-arrow-down-circle-line text-lg text-emerald-500 mt-0.5" />
                <div>
                  <span className="block text-xs font-bold text-foreground">Le debemos</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    Saldo a favor del cliente (+). Se lista en Ingresos.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo('deuda')}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  tipo === 'deuda'
                    ? 'border-destructive bg-destructive/10 ring-2 ring-destructive/20'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <i className="ri-arrow-up-circle-line text-lg text-destructive mt-0.5" />
                <div>
                  <span className="block text-xs font-bold text-foreground">Nos debe dinero</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    Deuda del cliente (-). Se lista en Pagos / Dispersiones.
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="saldo-inicial-monto" className="block text-xs font-semibold text-muted-foreground mb-1">
              Monto en COP *
            </label>
            <input
              id="saldo-inicial-monto"
              type="text"
              inputMode="decimal"
              required
              value={monto}
              onChange={(e) => formatAmountField(e, setMonto)}
              placeholder="0 COP"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            {isValidMonto && (
              <p className="mt-1 text-xs font-mono font-medium text-primary">
                {tipo === 'a_favor' ? '+ ' : '- '}
                {formatCOP(numericMonto)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="saldo-inicial-concepto" className="block text-xs font-semibold text-muted-foreground mb-1">
              Concepto / Detalle
            </label>
            <input
              id="saldo-inicial-concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.currentTarget.value)}
              placeholder="Ej: Saldo inicial apertura o Deuda acordada"
              className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <i className="ri-information-line mr-1 text-primary inline" />
            {tipo === 'a_favor'
              ? 'Este monto no descuenta cuentas de banco. Aparecerá en la pestaña de Ingresos del cliente y sumará a su saldo pendiente.'
              : 'Este monto no sale de tus cuentas de banco. Aparecerá en la pestaña de Pagos / Dispersiones como un anticipo/desembolso inicial y dejará al cliente en estado DEBE.'}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-6">
            <div>
              {currentInitial !== 0 && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <i className="ri-delete-bin-line" />
                  <span>Eliminar saldo inicial</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !isValidMonto}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
              >
                {loading && <i className="ri-loader-4-line animate-spin" />}
                <span>Guardar saldo inicial</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
