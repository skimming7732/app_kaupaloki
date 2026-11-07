import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { ReceiptThumbnail } from '../components/common/ReceiptThumbnail';
import { ReceiptLightboxModal, type LightboxItem } from '../components/modals/ReceiptLightboxModal';
import { AttachExpenseReceipt } from '../components/modals/AttachExpenseReceipt';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { AddDispersionModal } from '../components/modals/AddDispersionModal';

interface DispersionesViewProps {
  onOpenAddDispersion?: () => void;
}

export const DispersionesView: React.FC<DispersionesViewProps> = ({ onOpenAddDispersion }) => {
  const { data, syncWithAirtable } = useAirtable();

  const [editing, setEditing] = useState<NormalizedData['dispersiones'][number] | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ id: string; url?: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  // Dispersiones with receipts for the lightbox gallery
  const receiptsList: LightboxItem[] = useMemo(() => {
    return filteredDispersiones
      .filter((d) => Boolean(d.comprobanteUrl))
      .map((d) => ({
        id: d.id,
        codigo: d.codigo,
        clienteNombre: d.clienteNombre,
        monto: d.monto,
        comprobanteUrl: d.comprobanteUrl || '',
      }));
  }, [filteredDispersiones]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button */}
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
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, cliente o referencia..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
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

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredDispersiones.length)} de {formatNumber(data.dispersiones.length)} registros</span>
          {(search || selectedCliente || fechaDesde || fechaHasta) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCliente('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              type="button"
              className="text-primary hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <KpiStrip metrics={[
        { label: 'Dispersiones', value: filteredDispersiones.length },
        { label: 'Total dispersado', value: formatCOP(sumRows(filteredDispersiones, (d) => d.monto)) },
      ]} />

      {/* Dispersiones Table with Uniform Row Heights */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4">Institución / Origen</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4 text-center">Comprobante</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <CreatedByHeader />
                <th scope="col" className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDispersiones.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No se encontraron dispersiones registradas
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={10} rows={filteredDispersiones}>{(d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors h-14">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">{d.codigo}</td>
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDate(d.fecha)}</td>
                    <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">{d.clienteNombre}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-foreground whitespace-nowrap">
                      {formatCOP(d.monto)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {d.origenFondos || 'Bancolombia'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">{d.referencia || '—'}</td>

                    {/* Uniform 9:16 Receipt Cell */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {d.comprobanteUrl ? (
                        <div className="flex items-center justify-center gap-1.5 h-10">
                          <button
                            type="button"
                            onClick={() => {
                              const idx = receiptsList.findIndex((item) => item.id === d.id);
                              if (idx !== -1) setLightboxIndex(idx);
                            }}
                            title="Ver comprobante en formato 9:16"
                            className="group relative h-10 w-6 shrink-0 overflow-hidden rounded-md border border-border/80 shadow-xs hover:ring-2 hover:ring-primary transition-all bg-muted"
                            style={{ aspectRatio: '9/16' }}
                          >
                            <ReceiptThumbnail receipt={d.comprobanteUrl} />
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity">
                              <i className="ri-zoom-in-line" />
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt({ id: d.id, url: d.comprobanteUrl })}
                            title="Editar comprobante"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <i className="ri-pencil-line text-xs" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt({ id: d.id, url: undefined })}
                          className="h-10 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                        >
                          <i className="ri-upload-cloud-line text-xs" />
                          <span>Subir</span>
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Exitosa'}
                      </span>
                    </td>
                    <CreatedByCell name={d.createdByName} />
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(d)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
                      >
                        <i className="ri-edit-line" aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editing && <AddDispersionModal isOpen record={editing} onClose={() => setEditing(null)} />}
      <AddDispersionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {selectedReceipt && (
        <AttachExpenseReceipt
          expenseId={selectedReceipt.id}
          dispersion
          currentReceipt={selectedReceipt.url}
          onSaved={syncWithAirtable}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* 9:16 Popup Lightbox with Copy, Download & Next/Previous Navigation */}
      {lightboxIndex !== null && (
        <ReceiptLightboxModal
          isOpen={lightboxIndex !== null}
          currentIndex={lightboxIndex}
          items={receiptsList}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(newIdx) => setLightboxIndex(newIdx)}
        />
      )}
    </div>
  );
};
