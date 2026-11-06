import { ReceiptPreview } from '../components/common/ReceiptPreview';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatUSD, formatDate } from '../utils/formatters';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface GastosViewProps {
  onOpenAddGasto?: () => void;
}

export const GastosView: React.FC<GastosViewProps> = ({ onOpenAddGasto }) => {
  const { data, syncWithAirtable } = useAirtable();
  const [attachingTo, setAttachingTo] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const categorias = [
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

  const filteredGastos = useMemo(() => {
    return data.gastos.filter((g) => {
      const matchSearch =
        g.codigo.toLowerCase().includes(search.toLowerCase()) ||
        g.concepto.toLowerCase().includes(search.toLowerCase()) ||
        g.categoria.toLowerCase().includes(search.toLowerCase());
      const matchCategoria = !selectedCategoria || g.categoria === selectedCategoria;
      const matchDivisa = !selectedDivisa || g.divisa === selectedDivisa;

      let matchFecha = true;
      if (fechaDesde && g.fecha) {
        matchFecha = matchFecha && g.fecha >= fechaDesde;
      }
      if (fechaHasta && g.fecha) {
        matchFecha = matchFecha && g.fecha <= fechaHasta;
      }

      return matchSearch && matchCategoria && matchDivisa && matchFecha;
    });
  }, [data.gastos, search, selectedCategoria, selectedDivisa, fechaDesde, fechaHasta]);

  const totalGastosCOP = useMemo(() => {
    return filteredGastos.reduce(
      (acc, g) => acc + (g.divisa === 'COP' ? g.monto : g.monto * 4000),
      0
    );
  }, [filteredGastos]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total Gastos Operativos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <i className="ri-receipt-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(totalGastosCOP)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">{filteredGastos.length} gastos filtrados</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Categorías Registradas</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-folder-chart-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{categorias.length}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Clasificación contable activa</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Nuevo Gasto</span>
            <span className="text-xs text-foreground block">Registrar egreso o costo</span>
          </div>
          <button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 hover:bg-rose-700 flex items-center gap-1.5 transition-all"
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar: Rango de fechas, Categoría, Divisa, Búsqueda */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o código..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {(search || selectedCategoria || selectedDivisa || fechaDesde || fechaHasta) && (
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span>{filteredGastos.length} gastos encontrados</span>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategoria('');
                setSelectedDivisa('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Gastos Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Categoría Contable</th>
                <th className="py-3 px-4">Institución / Origen</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGastos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron gastos registrados
                  </td>
                </tr>
              ) : (
                filteredGastos.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{g.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(g.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{g.concepto}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                        {g.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{g.origenFondos}</td>
                    <td className="py-3 px-4">
                      {g.comprobanteUrl ? (
                        <ReceiptPreview receipt={g.comprobanteUrl} compact />
                      ) : (
                        <button type="button" onClick={() => setAttachingTo(g.id)} className="text-xs font-semibold text-primary hover:underline">
                          Agregar comprobante
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {g.divisa === 'COP' ? formatCOP(g.monto) : formatUSD(g.monto)}
                    </td>
                    <CreatedByCell name={g.createdByName} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Gasto Modal */}
      {attachingTo && <AttachExpenseReceipt expenseId={attachingTo} onClose={() => setAttachingTo(null)} onSaved={syncWithAirtable} />}
      <AddGastoModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
};
