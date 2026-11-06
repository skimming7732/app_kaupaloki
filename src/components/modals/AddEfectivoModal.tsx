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
  // 3. Referencia
  const [referencia, setReferencia] = useState('');
  // 4. Monto
  const [monto, setMonto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto) || 0;
    if (parsedMonto <= 0) {
      setError('Por favor ingrese un monto válido');
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
      setError(err?.message || 'Error al registrar efectivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5 relative">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-base">
              <i className="ri-money-dollar-circle-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Movimiento de Efectivo</h3>
              <p className="text-[11px] text-muted-foreground">Efectivo Dosquebradas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
            <i className="ri-close-line text-base" />
          </button>
        </div>

        {error && (
          <div className="p-2 mb-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-xs" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 1. Tipo */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Tipo de Movimiento *</label>
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Cliente</label>
              <span className="text-[10px] text-muted-foreground italic">(Opcional)</span>
            </div>
            <ClientSearchSelect
              value={clienteId}
              onChange={(id) => setClienteId(id)}
              placeholder="Buscar cliente (opcional)..."
            />
          </div>

          {/* 3. Referencia */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Referencia / Detalle</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Entrega de efectivo en oficina"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* 4. Monto */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Monto en Efectivo (COP) *</label>
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !monto}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
