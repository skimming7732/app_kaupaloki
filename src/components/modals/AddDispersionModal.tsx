import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';

interface AddDispersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddDispersionModal: React.FC<AddDispersionModalProps> = ({ isOpen, onClose }) => {
  const { data, createRecord } = useAirtable();
  const [clienteId, setClienteId] = useState('');
  const [monto, setMonto] = useState('');
  const [origen, setOrigen] = useState('Bancolombia');
  const [referencia, setReferencia] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto) || 0;
    if (!clienteId || parsedMonto <= 0) {
      setError('Por favor complete cliente y monto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = 'DISP-' + Math.floor(1000 + Math.random() * 9000);
      await createRecord('Dispersiones', {
        'Código': code,
        'Fecha': fecha,
        'Cliente': [clienteId],
        'Monto': parsedMonto,
        'Origen de Fondos': origen,
        'Referencia': referencia.trim() || undefined,
        'Estado': 'Exitosa'
      });
      setMonto('');
      setReferencia('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al crear dispersión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-send-plane-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Nueva Dispersión</h3>
              <p className="text-xs text-muted-foreground">Pago bancario o transferencia a cliente</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Monto (COP) *</label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 15000000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Origen / Banco *</label>
              <select
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="Bancolombia">Bancolombia</option>
                <option value="Davivienda">Davivienda</option>
                <option value="BBVA">BBVA</option>
                <option value="Banco de Bogotá">Banco de Bogotá</option>
                <option value="Caja Principal">Caja Principal</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Referencia / Comprobante</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: TR-89234"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
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
              disabled={loading || !clienteId || !monto}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Dispersión</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
