import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

interface AddEfectivoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEfectivoModal: React.FC<AddEfectivoModalProps> = ({ isOpen, onClose }) => {
  const { createRecord } = useAirtable();
  // 1. Tipo
  const [tipo, setTipo] = useState<'Ingreso' | 'Pago'>('Pago');
  // 2. Cliente (opcional)
  const [clienteId, setClienteId] = useState('');
  // 3. Referencia / PIN (opcional)
  const [referencia, setReferencia] = useState('');
  // 4. Monto (COP)
  const [monto, setMonto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto) || 0;
    if (parsedMonto <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = 'EFEC-' + Math.floor(1000 + Math.random() * 9000);
      const today = new Date().toISOString().split('T')[0];
      await createRecord('Efectivo', {
        'Código': code,
        'Fecha': today,
        'Tipo': tipo,
        'Cliente': clienteId ? [clienteId] : undefined,
        'Referencia': referencia.trim() || undefined,
        'Monto': parsedMonto,
        'Origen de Fondos': 'Efectivo Dosquebradas', // Caja fija por defecto
      });
      setMonto('');
      setReferencia('');
      setClienteId('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el movimiento de efectivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs">
              <i className="ri-money-dollar-circle-line" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Registrar Movimiento</h3>
              <p className="text-[10px] text-muted-foreground">Efectivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <i className="ri-close-line text-sm" />
          </button>
        </div>

        {error && (
          <div className="p-1.5 mb-2.5 rounded-lg bg-destructive/10 text-destructive text-[11px] border border-destructive/20 flex items-center gap-1.5">
            <i className="ri-error-warning-line text-xs shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* 1. Tipo de Movimiento */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              1. Tipo de Movimiento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo('Pago')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  tipo === 'Pago'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <i className="ri-arrow-up-circle-line" />
                <span>Pago a Cliente</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('Ingreso')}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  tipo === 'Ingreso'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <i className="ri-arrow-down-circle-line" />
                <span>Ingreso a Caja</span>
              </button>
            </div>
          </div>

          {/* 2. Cliente (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                2. Cliente
              </label>
              <span className="text-[10px] text-muted-foreground italic">(Opcional)</span>
            </div>
            <ClientSearchSelect
              value={clienteId}
              onChange={(id) => setClienteId(id)}
              placeholder="Buscar cliente (opcional)..."
            />
          </div>

          {/* 3. Referencia o PIN (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                3. Referencia / PIN
              </label>
              <span className="text-[10px] text-muted-foreground italic">(Opcional)</span>
            </div>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: PIN o entrega en oficina..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* 4. Monto (COP) */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
              4. Monto (COP) *
            </label>
            <input
              type="number"
              step="any"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 5000000"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none font-bold"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !monto || parseFloat(monto) <= 0}
              className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Movimiento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
