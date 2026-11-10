import { ClientSearchSelect } from '../components/common/ClientSearchSelect';
import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData, type NormalizedData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatCOP, formatDate, compareChronologicalDesc } from '../utils/formatters';
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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<NormalizedData['efectivo'][number] | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Start with the Caja extract so its imported and linked movements appear
  // here too. Prefer the original cash row when both share the same code.
  const movimientos = useMemo(() => {
    type CashRow = NormalizedData['efectivo'][number];
    const originals = new Map(data.efectivo.map((row) => [row.codigo, row]));
    const included = new Set<string>();
    const rows: CashRow[] = [];

    for (const account of data.activosLiquidos) {
      const isCash = String(account.institucion || '').toUpperCase() === 'EFECTIVO'
        || String(account.activo || '').toUpperCase().includes('EFECTIVO');
      if (!isCash) continue;

      for (const [index, entry] of (account.movimientos || []).entries()) {
        const code = entry.origen || account.id + ':' + index;
        if (included.has(code)) continue;
        const original = originals.get(code);
        if (original) {
          rows.push(original);
        } else {
          const amount = Number(entry.monto);
          if (!Number.isFinite(amount) || amount === 0) continue;
          rows.push({
            id: 'caja:' + code,
            codigo: entry.origen || '—',
            fecha: entry.fecha || '',
            tipo: amount > 0 ? 'Ingreso' : 'Pago',
            clienteNombre: entry.tercero || '',
            monto: Math.abs(amount),
            origenFondos: account.activo || account.institucion,
            referencia: entry.concepto,
            createdByName: entry.createdByName,
            createdAtAudit: entry.createdAtAudit,
            raw: entry,
          });
        }
        included.add(code);
      }
    }

    rows.push(...data.efectivo.filter((row) => !included.has(row.codigo)));
    return rows.sort(compareChronologicalDesc);
  }, [data.activosLiquidos, data.efectivo]);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      const matchSearch =
        m.codigo.toLowerCase().includes(search.toLowerCase()) ||
        m.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        m.origenFondos?.toLowerCase().includes(search.toLowerCase()) ||
        m.referencia?.toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filterTipo || m.tipo === filterTipo;
      const matchCliente =
        !selectedCliente ||
        m.clienteId === selectedCliente;

      const matchFecha = matchesDateRange(m.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchTipo && matchCliente && matchFecha;
    });
  }, [movimientos, search, filterTipo, selectedCliente, fechaDesde, fechaHasta]);

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
              placeholder="Buscar por código, persona o referencia..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Tipo */}
          <div>
            <TableSelectFilter label="Tipo" value={filterTipo} onChange={setFilterTipo} className="w-full">
              <option value="">Todos los tipos</option>
              <option value="Ingreso">Ingreso a Caja</option>
              <option value="Pago">Salida de Caja</option>
            </TableSelectFilter>
          </div>

          <ClientSearchSelect value={selectedCliente} onChange={setSelectedCliente} placeholder="Todos los clientes" compact />
          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredMovimientos.length)} de {formatNumber(movimientos.length)} registros</span>
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
                <th className="py-3 px-4">Cliente / tercero</th>
                <th className="py-3 px-4 text-right">Monto (COP)</th>
                <th className="py-3 px-4">Institución</th>
                <th className="py-3 px-4">Referencia / Detalle</th>
                <CreatedByHeader />
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No hay movimientos de efectivo que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={9} rows={filteredMovimientos}>{(m) => (
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
                        {m.tipo === 'Ingreso' ? 'Ingreso' : 'Salida'}
                      </span>
                    </td>
                    {/* Exact Client Name from {CLIENTE} column */}
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {m.clienteNombre && m.clienteNombre !== 'Ingreso de Caja' && m.clienteNombre !== 'Movimiento Interno' ? (
                        <span className="font-mono text-xs">{m.clienteNombre}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">{m.clienteNombre || '—'}</span>
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
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingMovimiento(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors text-foreground"
                        title={isAdmin ? 'Editar o eliminar movimiento' : 'Editar movimiento'}
                      >
                        <i className="ri-edit-line text-xs" />
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
      <AddEfectivoModal
        isOpen={isAddMovOpen || Boolean(editingMovimiento)}
        record={editingMovimiento}
        onClose={() => {
          setIsAddMovOpen(false);
          setEditingMovimiento(null);
        }}
      />
      <AddGastoModal
        isOpen={isAddGastoOpen}
        onClose={() => setIsAddGastoOpen(false)}
        isCashContext={true}
      />
    </div>
  );
};
