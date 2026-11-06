import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';

interface AddGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddGastoModal: React.FC<AddGastoModalProps> = ({ isOpen, onClose }) => {
  const { createGasto } = useAirtable();
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('Arrendamiento');
  const [divisa, setDivisa] = useState<'COP' | 'USDT'>('COP');
  const [monto, setMonto] = useState('');
  const [origenFondos, setOrigenFondos] = useState('Efectivo Dosquebradas');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriasContables = [
    'Arrendamiento',
    'Nómina y Salarios',
    'Combustible y Transporte',
    'Servicios Públicos (Agua, Luz, Gas)',
    'Logística y Envíos (Ligas, Encomiendas)',
    'Mantenimiento y Operación',
    'Gastos Financieros y Bancarios',
    'Alimentación y Viáticos',
    'Otros Gastos Operativos',
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto) || 0;
    if (!concepto.trim() || parsedMonto <= 0) {
      setError('Por favor complete concepto y monto');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createGasto({
        concepto: concepto.trim(),
        categoria,
        divisa,
        monto: parsedMonto,
        origenFondos,
        fecha,
      });
      setConcepto('');
      setMonto('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-5 relative">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 text-base">
              <i className="ri-receipt-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Registrar Gasto Operativo</h3>
              <p className="text-[11px] text-muted-foreground">Clasificación contable y comprobante</p>
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
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Concepto del Gasto *</label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Pago arriendo oficina Pereira / Compra ligas para fajos"
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Categoría Contable *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              {categoriasContables.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Divisa</label>
              <select
                value={divisa}
                onChange={(e) => setDivisa(e.target.value as 'COP' | 'USDT')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="COP">COP (Pesos Colombianos)</option>
                <option value="USDT">USDT (Tether)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Monto *</label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 350000"
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Institución / Origen Fondos</label>
              <select
                value={origenFondos}
                onChange={(e) => setOrigenFondos(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="Efectivo Dosquebradas">Efectivo Dosquebradas</option>
                <option value="Bancolombia Principal">Bancolombia Principal</option>
                <option value="Davivienda">Davivienda</option>
                <option value="Binance Corporate">Binance Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
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
              disabled={loading || !concepto || !monto}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-md shadow-rose-600/20 flex items-center gap-1.5"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Gasto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
