import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { AddDispersionModal } from '../components/modals/AddDispersionModal';

interface DispersionesViewProps {
  onOpenAddDispersion?: () => void;
}

export const DispersionesView: React.FC<DispersionesViewProps> = ({ onOpenAddDispersion }) => {
  const { data } = useAirtable();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; title: string } | null>(null);

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

      let matchFecha = true;
      if (fechaDesde && d.fecha) {
        matchFecha = matchFecha && d.fecha >= fechaDesde;
      }
      if (fechaHasta && d.fecha) {
        matchFecha = matchFecha && d.fecha <= fechaHasta;
      }

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
            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todos los clientes</option>
              {data.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
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
                filteredDispersiones.map((d) => (
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
                      {d.comprobanteUrl ? (
                        <button
                          onClick={() => setSelectedReceipt({ url: d.comprobanteUrl!, title: `Comprobante ${d.codigo}` })}
                          className="w-7 h-7 rounded-lg overflow-hidden border border-border inline-flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <img src={d.comprobanteUrl} alt="Comprobante" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Exitosa'}
                      </span>
                    </td>
                    <CreatedByCell name={d.createdByName} />
                  </tr>
                ))
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

      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        imageUrl={selectedReceipt?.url || null}
        title={selectedReceipt?.title}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
