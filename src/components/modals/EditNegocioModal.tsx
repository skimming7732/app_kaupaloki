import React, { useState, useEffect, useMemo } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { formatCOP } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

interface EditNegocioModalProps {
  isOpen: boolean;
  negocio: any | null;
  onClose: () => void;
}

export const EditNegocioModal: React.FC<EditNegocioModalProps> = ({ isOpen, negocio, onClose }) => {
  const { data, updateRecord } = useAirtable();
  const [clienteId, setClienteId] = useState('');
  const [divisaId, setDivisaId] = useState('');
  const [monto, setMonto] = useState('');
  const [tasa, setTasa] = useState('');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate data when negocio changes
  useEffect(() => {
    if (negocio) {
      setClienteId(negocio.clienteId || negocio.clienteNombre || '');
      // Match divisa id
      const matchedDivisa = data.divisas.find(
        (d) => d.codigo === negocio.divisaCodigo || d.id === negocio.divisaId
      );
      setDivisaId(matchedDivisa ? matchedDivisa.id : negocio.divisaId || '');
      setMonto(String(negocio.montoDivisa || ''));
      setTasa(String(negocio.tasaCambio || ''));
      setFecha(negocio.fecha ? negocio.fecha.split('T')[0] : '');
    }
  }, [negocio, data.divisas]);

  const parsedMonto = parseFloat(monto) || 0;
  const parsedTasa = parseFloat(tasa) || 0;
  const ingresoCOP = useMemo(() => parsedMonto * parsedTasa, [parsedMonto, parsedTasa]);

  if (!isOpen || !negocio) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !divisaId || !fecha || parsedMonto <= 0 || parsedTasa <= 0 || !Number.isFinite(ingresoCOP)) {
      setError('Selecciona un cliente, una divisa y una fecha. Ingresa un monto y una tasa mayores que cero.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateRecord('Negocios', negocio.id, {
        'Fecha': fecha,
        'Cliente': [clienteId],
        'Divisa': [divisaId],
        'Monto Divisa': parsedMonto,
        'Tasa Cambio': parsedTasa,
        'Ingreso COP': ingresoCOP,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 relative">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-base">
              <i className="ri-edit-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Editar Negocio {negocio.codigo}</h3>
              <p className="text-[11px] text-muted-foreground">Modificar valores de la operación</p>
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
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Cliente *</label>
            <ClientSearchSelect
              value={clienteId}
              onChange={(id) => setClienteId(id)}
              placeholder="Buscar por código o nombre..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Divisa *</label>
              <select
                required
                value={divisaId}
                onChange={(e) => setDivisaId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Seleccionar divisa...</option>
                {data.divisas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} - {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Fecha Operación</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Monto en Divisa *</label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Tasa de Cambio (COP) *</label>
              <input
                type="number"
                step="any"
                required
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">Ingreso Estimado (COP):</span>
            <span className="text-sm font-bold text-foreground">{formatCOP(ingresoCOP)}</span>
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
              disabled={loading || !clienteId || !divisaId || parsedMonto <= 0}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20 flex items-center gap-1.5"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
