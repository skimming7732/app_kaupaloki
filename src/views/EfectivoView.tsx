import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';
import { AddEfectivoModal } from '../components/modals/AddEfectivoModal';
import { AddGastoModal } from '../components/modals/AddGastoModal';
import { AddClienteModal } from '../components/modals/AddClienteModal';
import { ClientSearchSelect } from '../components/common/ClientSearchSelect';

interface EfectivoViewProps {
  onOpenAddMovimiento?: () => void;
  onOpenAddGasto?: () => void;
}

export const EfectivoView: React.FC<EfectivoViewProps> = ({
  onOpenAddMovimiento,
  onOpenAddGasto,
}) => {
  const { data } = useAirtable();
  const [isAddMovOpen, setIsAddMovOpen] = useState(false);
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);
  const [isAddClienteOpen, setIsAddClienteOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Resolve official Efectivo account from Activos Líquidos (e.g. EFECTIVO-CAJA)
  const activoEfectivo = useMemo(() => {
    return (
      data.activosLiquidos.find(
        (a) =>
          a.tipo === 'EFECTIVO' ||
          a.institucion === 'EFECTIVO' ||
          (a.activo && a.activo.toUpperCase().includes('EFECTIVO'))
      ) || null
    );
  }, [data.activosLiquidos]);

  const { totalIngresos, totalPagos, balanceEfectivo, filteredMovimientos } = useMemo(() => {
    let ingresos = 0;
    let pagos = 0;

    data.efectivo.forEach((m) => {
      if (m.tipo === 'Ingreso') ingresos += m.monto;
      else pagos += m.monto;
    });

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

      let matchFecha = true;
      if (fechaDesde && m.fecha) {
        matchFecha = matchFecha && m.fecha >= fechaDesde;
      }
      if (fechaHasta && m.fecha) {
        matchFecha = matchFecha && m.fecha <= fechaHasta;
      }

      return matchSearch && matchTipo && matchCliente && matchFecha;
    });

    // If official record in Activos Líquidos exists, use its synchronized balance; otherwise use calculated delta
    const officialBalance = activoEfectivo ? (activoEfectivo.saldoCop ?? activoEfectivo.saldoReal) : (ingresos - pagos);

    return {
      totalIngresos: ingresos,
      totalPagos: pagos,
      balanceEfectivo: officialBalance,
      filteredMovimientos: filtered,
    };
  }, [data.efectivo, data.activosLiquidos, activoEfectivo, search, filterTipo, selectedCliente, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* KPI Row & Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Saldo en Caja</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-wallet-3-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(balanceEfectivo)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {activoEfectivo ? `${activoEfectivo.activo} (${activoEfectivo.empresa || 'CAJA'})` : 'EFECTIVO-CAJA'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total Ingresos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-arrow-down-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(totalIngresos)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Entradas registradas</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total Pagos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="ri-arrow-up-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(totalPagos)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Entregas a clientes</span>
        </div>

        {/* Both Action Buttons on Header/Top Card */}
        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-center gap-2">
          <button
            onClick={onOpenAddMovimiento ? onOpenAddMovimiento : () => setIsAddMovOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-700 flex items-center justify-center gap-1.5 transition-all"
          >
            <i className="ri-add-line text-sm" />
            <span>Registrar Movimiento</span>
          </button>
          <button
            onClick={onOpenAddGasto ? onOpenAddGasto : () => setIsAddGastoOpen(true)}
            className="w-full py-1.5 px-3 rounded-xl bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-600/20 hover:bg-rose-700 flex items-center justify-center gap-1.5 transition-all"
          >
            <i className="ri-receipt-line text-sm" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Filter Bar: Rango de fechas, Cliente, Tipo, Búsqueda */}
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

          {/* Tipo */}
          <div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todos los tipos</option>
              <option value="Ingreso">Ingreso a Caja</option>
              <option value="Pago">Pago a Cliente</option>
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

        {/* Cliente quick selector with Search & + Nuevo Cliente */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <span className="text-xs font-bold text-foreground shrink-0 flex items-center gap-1.5">
              <i className="ri-user-3-line text-primary" />
              <span>Cliente:</span>
            </span>
            <div className="flex-1">
              <ClientSearchSelect
                value={selectedCliente}
                onChange={(id) => setSelectedCliente(id)}
                placeholder="Todos los clientes (buscar por nombre o código)..."
                onAddNewClient={() => setIsAddClienteOpen(true)}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAddClienteOpen(true)}
              className="h-[38px] px-3.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 shadow-sm"
              title="Registrar nuevo cliente"
            >
              <i className="ri-user-add-line text-sm" />
              <span className="hidden sm:inline">+ Cliente</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="font-semibold text-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
              {filteredMovimientos.length} movimientos
            </span>
            {(search || filterTipo || selectedCliente || fechaDesde || fechaHasta) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterTipo('');
                  setSelectedCliente('');
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="text-primary hover:underline font-bold text-xs flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20"
              >
                <i className="ri-filter-off-line" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
                filteredMovimientos.map((m) => (
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
                        {m.origenFondos || (activoEfectivo ? activoEfectivo.activo : 'EFECTIVO-CAJA')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{m.referencia || '—'}</td>
                    <CreatedByCell name={m.createdByName} />
                  </tr>
                ))
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
      />
      <AddClienteModal
        isOpen={isAddClienteOpen}
        onClose={() => setIsAddClienteOpen(false)}
      />
    </div>
  );
};
