import React, { useState, useMemo } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { formatCOP } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

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
        'Estado': 'Completado',
      });
      setMonto('');
      setTasa('');
      setClienteId('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-4 relative">
        {/* Compact Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">
              <i className="ri-exchange-dollar-line" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Nuevo Negocio</h3>
              <p className="text-[10px] text-muted-foreground">Registro de operación cambiaria</p>
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
          {/* Client Selector */}
          <div>
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
              Cliente *
            </label>
            <ClientSearchSelect
              value={clienteId}
              onChange={(id) => setClienteId(id)}
              placeholder="Buscar cliente por código o nombre..."
              required
            />
          </div>

          {/* Divisa & Fecha Operación */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Divisa *
              </label>
              <select
                required
                value={divisaId}
                onChange={(e) => setDivisaId(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Seleccionar...</option>
                {data.divisas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} - {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Fecha Operación
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Monto & Tasa */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Monto en Divisa *
              </label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 5000"
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Tasa Cambio (COP) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                placeholder="Ej: 3950"
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Slim Calculation Pill */}
          <div className="px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Ingreso Estimado:</span>
            <span className="font-mono font-bold text-foreground">{formatCOP(ingresoCOP)}</span>
          </div>

          {/* Compact Actions */}
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
              disabled={loading || !clienteId || !divisaId || parsedMonto <= 0 || parsedTasa <= 0}
              className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-sm shadow-primary/20 flex items-center gap-1.5 transition-all"
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
