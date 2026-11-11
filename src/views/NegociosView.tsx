import { useWriteAccess } from '../utils/useWriteAccess';
import { ClientSearchSelect } from '../components/common/ClientSearchSelect';
import { KpiStrip, sumRows, totalsByCurrency } from '../components/common/KpiStrip';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatRate, formatCOP, formatDate } from '../utils/formatters';
import { EditNegocioModal } from '../components/modals/EditNegocioModal';
import { AddNegocioModal } from '../components/modals/AddNegocioModal';

interface NegociosViewProps {
  onOpenAddNegocio?: () => void;
}

export const NegociosView: React.FC<NegociosViewProps> = ({ onOpenAddNegocio }) => {
  const canWrite = useWriteAccess('business');
  const { data } = useData();
  const { profile } = useAuth();
  const isOperador = ['comercial', 'operador'].includes(profile?.role || '') && Boolean(profile?.authorized_currencies?.length);
  const authorizedCurrencies = profile?.authorized_currencies || [];

  const [isAddOpen, setIsAddOpen] = useState(false);

  // Available divisas for dropdown (filtered if Operador)
  const availableDivisas = useMemo(() => {
    if (isOperador) {
      return data.divisas.filter((d) => authorizedCurrencies.includes(d.codigo));
    }
    return data.divisas;
  }, [data.divisas, isOperador, authorizedCurrencies]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedCreador, setSelectedCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Selected negocio for editing
  const [editingNegocio, setEditingNegocio] = useState<any | null>(null);

  const totalVisible =
    isOperador
      ? data.negocios.filter((n) => authorizedCurrencies.includes(n.divisaCodigo)).length
      : data.negocios.length;

  const filteredNegocios = useMemo(() => {
    return data.negocios.filter((n) => {
      // Currency restriction for Operador
      if (isOperador && !authorizedCurrencies.includes(n.divisaCodigo)) {
        return false;
      }

      const matchSearch =
        n.codigo.toLowerCase().includes(search.toLowerCase()) ||
        n.clienteNombre.toLowerCase().includes(search.toLowerCase());
      const matchDivisa = !selectedDivisa || n.divisaCodigo === selectedDivisa;
      const matchCliente =
        !selectedCliente ||
        n.clienteId === selectedCliente ||
        n.clienteNombre.toLowerCase().includes(selectedCliente.toLowerCase());

      const matchFecha = matchesDateRange(n.fecha, fechaDesde, fechaHasta);

      const matchCreador = !selectedCreador || formatAuthorName(n.createdByName, n.createdBy, data.usuarios).toLowerCase() === selectedCreador.toLowerCase();

      return matchSearch && matchDivisa && matchCliente && matchFecha && matchCreador;
    });
  }, [data.negocios, data.usuarios, search, selectedDivisa, selectedCliente, fechaDesde, fechaHasta, selectedCreador, isOperador, authorizedCurrencies]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button (Like /efectivo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Operaciones Cambiarias</h2>
          <p className="text-xs text-muted-foreground">Registro y control de conversiones en tiempo real</p>
        </div>
        {canWrite && (<button
          type="button"
          onClick={onOpenAddNegocio ? onOpenAddNegocio : () => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-add-line text-sm" />
          <span>Registrar Negocio</span>
        </button>)}
      </div>

      {/* Filter Bar: Desktop (Search + Divisa + Fecha + Filtros) | Mobile (Search + Filtros) */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o cliente..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Divisa (Desktop only) */}
          <div className="hidden md:block w-36 shrink-0">
            <CurrencyFilterDropdown
              value={selectedDivisa}
              onChange={setSelectedDivisa}
              currencies={availableDivisas.map((d) => d.codigo)}
              className="w-full"
            />
          </div>

          {/* Fecha (Desktop only) */}
          <div className="hidden md:block shrink-0">
            <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
          </div>

          {/* Popup Filter Trigger Button */}
          <FilterTriggerButton
            onClick={() => setIsFilterOpen(true)}
            activeCount={(selectedDivisa ? 1 : 0) + (selectedCliente ? 1 : 0) + (selectedCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{formatNumber(filteredNegocios.length)} de {formatNumber(totalVisible)} registros</span>
            {(search || selectedDivisa || selectedCliente || fechaDesde || fechaHasta || selectedCreador) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDivisa('');
                  setSelectedCliente('');
                  setFechaDesde('');
                  setFechaHasta('');
                  setSelectedCreador('');
                }}
                type="button"
                className="text-primary hover:underline font-semibold text-xs"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros de Operaciones"
        activeCount={(selectedDivisa ? 1 : 0) + (selectedCliente ? 1 : 0) + (selectedCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
        onClear={() => {
          setSelectedDivisa('');
          setSelectedCliente('');
          setFechaDesde('');
          setFechaHasta('');
          setSelectedCreador('');
        }}
      >
        {/* Mobile-only visible filters */}
        <div className="md:hidden space-y-3 pb-3 border-b border-border">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Divisa</label>
            <CurrencyFilterDropdown
              value={selectedDivisa}
              onChange={setSelectedDivisa}
              currencies={availableDivisas.map((d) => d.codigo)}
              className="w-full"
            />
          </div>
          <div>
            <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
          </div>
        </div>

        {/* Cliente Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
          <ClientSearchSelect value={selectedCliente} onChange={setSelectedCliente} placeholder="Todos los clientes" compact />
        </div>

        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={selectedCreador}
            onChange={setSelectedCreador}
            records={data.negocios}
            className="w-full"
          />
        </div>
      </FilterModal>

      <KpiStrip
        metrics={(
          [
            ['Negocios', filteredNegocios.length],
            ['Total Monto', totalsByCurrency(filteredNegocios, (n) => n.divisaCodigo, (n) => n.montoDivisa)],
            ['Total Ingreso (COP)', formatCOP(sumRows(filteredNegocios, (n) => n.ingresoCOP))],
          ] as const
        ).map(([label, value]) => ({ label, value }))}
      />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Divisa</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Tasa</th>
                <th className="py-3 px-4 text-right">Ingreso (COP)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNegocios.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No se encontraron operaciones de negocio
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={10} rows={filteredNegocios}>
                  {(n) => (
                    <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">{n.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(n.fecha)}</td>
                      <td className="py-3 px-4 font-semibold text-foreground">{n.clienteNombre}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                          {n.divisaCodigo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        {formatNumber(n.montoDivisa, 2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        ${formatRate(n.tasaCambio)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCOP(n.ingresoCOP)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                          {n.estado || 'Completado'}
                        </span>
                      </td>
                      {/* Action: Edit */}
                      <td className="py-3 px-4 text-center">
                        {canWrite && (<button
                          onClick={() => setEditingNegocio(n)}
                          title="Editar negocio"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>)}
                      </td>
                      <CreatedByCell name={n.createdByName} />
                    </tr>
                  )}
                </PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View ("Cajitas") */}
      <div className="block md:hidden space-y-3">
        {filteredNegocios.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs shadow-sm">
            No se encontraron operaciones de negocio
          </div>
        ) : (
          filteredNegocios.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-foreground">{n.codigo}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(n.fecha)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-0.5 truncate">{n.clienteNombre}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  {n.estado || 'Completado'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Monto en Divisa</span>
                  <div className="flex items-center gap-1.5 font-bold text-foreground mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-bold">
                      {n.divisaCodigo}
                    </span>
                    <span>{formatNumber(n.montoDivisa, 2)}</span>
                  </div>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Tasa de Cambio</span>
                  <span className="font-mono font-bold text-foreground text-xs mt-0.5 block">${formatRate(n.tasaCambio)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Ingreso en COP</span>
                <span className="text-sm font-extrabold font-mono text-primary">{formatCOP(n.ingresoCOP)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <CreatedByCell name={n.createdByName} />
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setEditingNegocio(n)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    <i className="ri-edit-line text-sm text-primary" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>


      {/* Modals */}
      <AddNegocioModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <EditNegocioModal
        isOpen={Boolean(editingNegocio)}
        negocio={editingNegocio}
        onClose={() => setEditingNegocio(null)}
      />
    </div>
  );
};
