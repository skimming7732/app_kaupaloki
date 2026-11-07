import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { AddEfectivoModal } from '../components/modals/AddEfectivoModal';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface EfectivoViewProps {
  onOpenAddMovimiento?: () => void;
  onOpenAddGasto?: () => void;
}

export const EfectivoView: React.FC<EfectivoViewProps> = ({
  onOpenAddMovimiento,
  onOpenAddGasto,
}) => {
  const { data } = useData();
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Resolve official Efectivo account from Activos Líquidos (e.g. EFECTIVO-CAJA)
  const { filteredMovimientos } = useMemo(() => {
    const filtered = data.efectivo.filter((m) => {
      const matchSearch =
        m.codigo.toLowerCase().includes(search.toLowerCase()) ||
        m.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        (m.referencia && m.referencia.toLowerCase().includes(search.toLowerCase()));
      const matchTipo = !filterTipo || m.tipo === filterTipo;
      const matchCliente =
        !selectedCliente ||
        m.clienteId === selectedCliente ||
        m.clienteNombre.toLowerCase().includes(selectedCliente.toLowerCase());

      const matchFecha = matchesDateRange(m.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchTipo && matchCliente && matchFecha;
    });

    return {
      filteredMovimientos: filtered,
    };
  }, [data.efectivo, search, filterTipo, selectedCliente, fechaDesde, fechaHasta]);

  const secondaryAction = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-muted';
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-bold">Efectivo</h2>
          <p className="text-xs text-muted-foreground">Entradas y salidas de caja</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenAddMovimiento ? onOpenAddMovimiento : () => setIsAddMovOpen(true)}
            type="button"
            className={recordButtonClass}
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Movimiento</span>
          </button>
          <button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddGastoOpen(true)}
            type="button"
            className={secondaryAction}
          >
            <i className="ri-receipt-line text-sm" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Filter Bar: Rango de fechas, Cliente, Tipo, Búsqueda */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
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

          {/* Tipo */}
          <div>
            <TableSelectFilter label="Tipo" value={filterTipo} onChange={setFilterTipo} className="w-full">
              <option value="">Todos los tipos</option>
              <option value="Ingreso">Ingreso a Caja</option>
              <option value="Pago">Pago a Cliente</option>
            </TableSelectFilter>
          </div>

          <TableSelectFilter label="Cliente" value={selectedCliente} onChange={setSelectedCliente} className="w-full">
            <option value="">Todos los clientes</option>
            {data.clientes.map((c) => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
          </TableSelectFilter>
          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredMovimientos.length)} de {formatNumber(data.efectivo.length)} registros</span>
            {(search || filterTipo || selectedCliente || fechaDesde || fechaHasta) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterTipo('');
                  setSelectedCliente('');
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                type="button" className="font-semibold text-primary hover:underline"
              >
                <i className="ri-filter-off-line" />
                <span>Limpiar filtros</span>
              </button>
            )}
        </div>
      </div>

      <KpiStrip metrics={([
        ['Movimientos', filteredMovimientos.length],
        ['Entradas COP', formatCOP(sumRows(filteredMovimientos, (m) => m.tipo === 'Ingreso' ? m.monto : 0))],
        ['Salidas COP', formatCOP(sumRows(filteredMovimientos, (m) => m.tipo === 'Pago' ? m.monto : 0))],
        ['Neto COP', formatCOP(sumRows(filteredMovimientos, (m) => m.tipo === 'Ingreso' ? m.monto : -m.monto))],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente Asignado</th>
                <th className="py-3 px-4 text-right">Monto (COP)</th>
                <th className="py-3 px-4">Institución</th>
                <th className="py-3 px-4">Referencia / Detalle</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No hay movimientos de efectivo que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={8} rows={filteredMovimientos}>{(m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{m.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(m.fecha)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.tipo === 'Ingreso'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    {/* Exact Client Name from {CLIENTE} column */}
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {m.clienteNombre && m.clienteNombre !== 'Ingreso de Caja' && m.clienteNombre !== 'Movimiento Interno' ? (
                        <span className="font-mono text-xs">{m.clienteNombre}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">{m.clienteNombre || 'Sin cliente asignado'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(m.monto)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {m.origenFondos || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{m.referencia || '—'}</td>
                    <CreatedByCell name={m.createdByName} />
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddEfectivoModal
        isOpen={isAddMovOpen}
        onClose={() => setIsAddMovOpen(false)}
      />
      <AddGastoModal
        isOpen={isAddGastoOpen}
        onClose={() => setIsAddGastoOpen(false)}
        isCashContext={true}
      />
    </div>
  );
};
