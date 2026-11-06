import React, { useState, useMemo } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { formatCOP } from '../../utils/formatters';

interface AddNegocioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddNegocioModal: React.FC<AddNegocioModalProps> = ({ isOpen, onClose }) => {
  const { data, createRecord } = useAirtable();
  const [clienteId, setClienteId] = useState('');
  const [divisaId, setDivisaId] = useState('');
  const [monto, setMonto] = useState('');
  const [tasa, setTasa] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedMonto = parseFloat(monto) || 0;
  const parsedTasa = parseFloat(tasa) || 0;
  const ingresoCOP = useMemo(() => parsedMonto * parsedTasa, [parsedMonto, parsedTasa]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !divisaId || parsedMonto <= 0 || parsedTasa <= 0) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = 'NEG-' + Math.floor(1000 + Math.random() * 9000);
      await createRecord('Negocios', {
        'Código': code,
        'Fecha': fecha,
        'Cliente': [clienteId],
        'Divisa': [divisaId],
        'Monto Divisa': parsedMonto,
        'Tasa Cambio': parsedTasa,
        'Ingreso COP': ingresoCOP,
        'Estado': 'Completado'
      });
      setMonto('');
      setTasa('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el negocio');
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
              <i className="ri-exchange-dollar-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Nuevo Negocio</h3>
              <p className="text-xs text-muted-foreground">Registrar compra/venta y conversión de divisa</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Cliente *</label>
              <select
                required
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Seleccionar cliente...</option>
                {data.clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre || c.codigo} ({c.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Divisa *</label>
              <select
                required
                value={divisaId}
                onChange={(e) => setDivisaId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Seleccionar divisa...</option>
                {data.divisas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} - {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Monto en Divisa *</label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 5000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Tasa de Cambio (COP) *</label>
              <input
                type="number"
                step="any"
                required
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                placeholder="Ej: 3950"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/60 border border-border flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground block">Ingreso Estimado (COP)</span>
              <span className="text-base font-bold text-foreground">{formatCOP(ingresoCOP)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-xs font-medium text-foreground outline-none text-right"
              />
            </div>
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
              disabled={loading || !clienteId || !divisaId || parsedMonto <= 0}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Negocio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
