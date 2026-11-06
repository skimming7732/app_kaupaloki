import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { ReceiptPreview } from '../components/common/ReceiptPreview';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';
import { AddDispersionModal } from '../components/modals/AddDispersionModal';

interface DispersionesViewProps {
  onOpenAddDispersion?: () => void;
}

export const DispersionesView: React.FC<DispersionesViewProps> = ({ onOpenAddDispersion }) => {
  const { data, syncWithAirtable } = useAirtable();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ id: string; url?: string } | null>(null);

  const filteredDispersiones = useMemo(() => {
    return data.dispersiones.filter((d) => {
      const matchSearch =
        d.codigo.toLowerCase().includes(search.toLowerCase()) ||
        d.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        (d.referencia && d.referencia.toLowerCase().includes(search.toLowerCase()));
      const matchCliente =
        !selectedCliente ||
        d.clienteId === selectedCliente ||
        d.clienteNombre.toLowerCase().includes(selectedCliente.toLowerCase());

      const matchFecha = matchesDateRange(d.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchCliente && matchFecha;
    });
  }, [data.dispersiones, search, selectedCliente, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button (Like /efectivo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Dispersiones Bancarias</h2>
          <p className="text-xs text-muted-foreground">Transferencias, pagos procesados y comprobantes bancarios</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddDispersion ? onOpenAddDispersion : () => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-send-plane-line text-sm" />
          <span>Nueva Dispersión</span>
        </button>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, cliente o referencia..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Cliente */}
          <div>
            <TableSelectFilter label="Cliente" value={selectedCliente} onChange={setSelectedCliente} className="w-full">
              <option value="">Todos los clientes</option>
              {data.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </TableSelectFilter>
          </div>

          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        {(search || selectedCliente || fechaDesde || fechaHasta) && (
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span>{filteredDispersiones.length} dispersiones encontradas</span>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCliente('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="text-primary hover:underline font-semibold text-xs"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Monto (COP)</th>
                <th className="py-3 px-4">Institución / Origen</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4 text-center">Comprobante</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDispersiones.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No se encontraron dispersiones registradas
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={9} rows={filteredDispersiones}>{(d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{d.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(d.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{d.clienteNombre}</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(d.monto)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {d.origenFondos || 'Bancolombia'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{d.referencia || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {d.comprobanteUrl && <ReceiptPreview receipt={d.comprobanteUrl} compact />}
                      <button type="button" className="mt-1 text-xs font-semibold text-primary hover:underline"
                        onClick={() => setSelectedReceipt({ id: d.id, url: d.comprobanteUrl })}>
                        {d.comprobanteUrl ? 'Editar comprobante' : 'Agregar comprobante'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Exitosa'}
                      </span>
                    </td>
                    <CreatedByCell name={d.createdByName} />
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddDispersionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {selectedReceipt && <AttachExpenseReceipt expenseId={selectedReceipt.id} dispersion currentReceipt={selectedReceipt.url}
        onSaved={syncWithAirtable} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};
