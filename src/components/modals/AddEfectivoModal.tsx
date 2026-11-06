import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';

interface AddEfectivoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEfectivoModal: React.FC<AddEfectivoModalProps> = ({ isOpen, onClose }) => {
  const { data, createRecord } = useAirtable();
  const [tipo, setTipo] = useState<'Ingreso' | 'Pago'>('Pago');
  const [clienteId, setClienteId] = useState('');
  const [monto, setMonto] = useState('');
  const [origen, setOrigen] = useState('Caja Efectivo');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
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
      await createRecord('Efectivo', {
        'Código': code,
        'Fecha': fecha,
        'Tipo': tipo,
        'Monto': parsedMonto,
        'Cliente': clienteId ? [clienteId] : undefined,
        'Origen de Fondos': origen,
        'Referencia': referencia.trim() || undefined
      });
      setMonto('');
      setReferencia('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar movimiento de efectivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <i className="ri-money-dollar-circle-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Movimiento de Efectivo</h3>
              <p className="text-xs text-muted-foreground">Registro de caja física y pagos en billetes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tipo de Movimiento *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo('Pago')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                  tipo === 'Pago'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <i className="ri-arrow-up-circle-line" />
                <span>Pago a Cliente</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('Ingreso')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                  tipo === 'Ingreso'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <i className="ri-arrow-down-circle-line" />
                <span>Ingreso a Caja</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Monto en Efectivo (COP) *</label>
            <input
              type="number"
              step="any"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 5000000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cliente Relacionado</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">(Opcional / Movimiento interno)</option>
              {data.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || c.codigo} ({c.codigo})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Caja / Ubicación</label>
              <select
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="Caja Efectivo">Caja Efectivo</option>
                <option value="Caja Fuerte">Caja Fuerte</option>
                <option value="Operador Pereira">Operador Pereira</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Detalle / Referencia</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: Entrega de efectivo en oficina"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
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
              disabled={loading || !monto}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Efectivo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
