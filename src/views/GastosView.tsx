import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip, totalsByCurrency } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { ReceiptPreview } from '../components/common/ReceiptPreview';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable, type GastoItem } from '../context/AirtableContext';
import { formatNumber, formatCOP, formatUSD, formatDate } from '../utils/formatters';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface GastosViewProps {
  onOpenAddGasto?: () => void;
}

export const GastosView: React.FC<GastosViewProps> = ({ onOpenAddGasto }) => {
  const { data, syncWithAirtable } = useAirtable();
  const [attachingTo, setAttachingTo] = useState<{ id: string; url?: string } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editing, setEditing] = useState<GastoItem | null>(null);

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

      const matchFecha = matchesDateRange(g.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchCategoria && matchDivisa && matchFecha;
    });
  }, [data.gastos, search, selectedCategoria, selectedDivisa, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-bold">Gastos</h2>
          <p className="text-xs text-muted-foreground">Registro de egresos y comprobantes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddOpen(true)}
            type="button"
            className={recordButtonClass}
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar: Rango de fechas, Categoría, Divisa, Búsqueda */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto o código..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <TableSelectFilter label="Categoría" value={selectedCategoria} onChange={setSelectedCategoria} className="w-full">
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </TableSelectFilter>
          </div>

          <TableSelectFilter label="Divisa" value={selectedDivisa} onChange={setSelectedDivisa} className="w-full">
            <option value="">Todas las divisas</option>
            {[...new Set(data.gastos.map((g) => g.divisa))].filter(Boolean).sort().map((code) =>
              <option key={code} value={code}>{code}</option>)}
          </TableSelectFilter>
          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredGastos.length)} de {formatNumber(data.gastos.length)} registros</span>
          {(search || selectedCategoria || selectedDivisa || fechaDesde || fechaHasta) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategoria('');
                setSelectedDivisa('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              type="button" className="text-primary hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <KpiStrip metrics={([
        ['Gastos', filteredGastos.length],
        ['Total por divisa', totalsByCurrency(filteredGastos, (g) => g.divisa, (g) => g.monto)],
      ] as const).map(([label, value]) => ({ label, value }))} />

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
                <th scope="col" className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGastos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No se encontraron gastos registrados
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={9} rows={filteredGastos}>{(g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors [&>td]:py-4">
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
                        <div className="space-y-1"><ReceiptPreview receipt={g.comprobanteUrl} compact /><button type="button" onClick={() => setAttachingTo({ id: g.id, url: g.comprobanteUrl })} className="text-xs font-semibold text-primary hover:underline">Editar comprobante</button></div>
                      ) : (
                        <button type="button" onClick={() => setAttachingTo({ id: g.id })} className="text-xs font-semibold text-primary hover:underline">
                          Agregar comprobante
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {g.divisa === 'COP' ? formatCOP(g.monto) : formatUSD(g.monto)}
                    </td>
                    <CreatedByCell name={g.createdByName} />
                    <td className="px-4"><button type="button" onClick={() => setEditing(g)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold"><i className="ri-edit-line" aria-hidden="true" />Editar</button></td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Gasto Modal */}
      {attachingTo && <AttachExpenseReceipt expenseId={attachingTo.id} currentReceipt={attachingTo.url} onClose={() => setAttachingTo(null)} onSaved={syncWithAirtable} />}
      {editing && <AddGastoModal isOpen record={editing} onClose={() => setEditing(null)} />}
      <AddGastoModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
};
