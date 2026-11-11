import React, { useMemo, useState } from 'react';
import { useData, type TransferenciaInterna } from '../context/DataContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddTransferenciaModal } from '../components/modals/AddTransferenciaModal';

export const TransferenciasInternasView: React.FC = () => {
  const { data } = useData();
  const transferencias = data.transferenciasInternas || [];

  const [search, setSearch] = useState('');
  const [filterDivisa, setFilterDivisa] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filtered rows
  const filtered = useMemo(() => {
    return transferencias.filter((t) => {
      const matchSearch =
        !search ||
        t.concepto?.toLowerCase().includes(search.toLowerCase()) ||
        t.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        t.origenNombre?.toLowerCase().includes(search.toLowerCase()) ||
        t.destinoNombre?.toLowerCase().includes(search.toLowerCase()) ||
        t.createdByName?.toLowerCase().includes(search.toLowerCase());

      const matchDivisa =
        !filterDivisa ||
        (t.divisaOrigen || '').toUpperCase() === filterDivisa.toUpperCase() ||
        (t.divisaDestino || '').toUpperCase() === filterDivisa.toUpperCase();

      const matchDate = matchesDateRange(t.fecha, fechaDesde, fechaHasta);

      let matchTipo = true;
      if (filterTipo === 'ACTIVO_LIQUIDO') {
        matchTipo = t.tipoOrigen === 'ACTIVO_LIQUIDO';
      } else if (filterTipo === 'ACTIVO_DIGITAL') {
        matchTipo = t.tipoOrigen === 'ACTIVO_DIGITAL';
      }

      const matchCreador = !filterCreador || formatAuthorName(t.createdByName, t.createdBy, data.usuarios).toLowerCase() === filterCreador.toLowerCase();

      return matchSearch && matchDivisa && matchDate && matchTipo && matchCreador;
    });
  }, [transferencias, data.usuarios, search, filterDivisa, fechaDesde, fechaHasta, filterTipo, filterCreador]);

  // Aggregate KPIs
  const totalCount = transferencias.length;
  const totalEnviadoCOP = useMemo(() => {
    return transferencias
      .filter((t) => t.divisaOrigen === 'COP')
      .reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [transferencias]);

  const totalEnviadoUSDT = useMemo(() => {
    return transferencias
      .filter((t) => t.divisaOrigen === 'USDT')
      .reduce((acc, t) => acc + (t.monto || 0), 0);
  }, [transferencias]);

  const totalCostosCOP = useMemo(() => {
    return transferencias
      .filter((t) => t.divisaCosto === 'COP')
      .reduce((acc, t) => acc + (t.costo || 0), 0);
  }, [transferencias]);

  const totalCostosUSDT = useMemo(() => {
    return transferencias
      .filter((t) => t.divisaCosto === 'USDT')
      .reduce((acc, t) => acc + (t.costo || 0), 0);
  }, [transferencias]);

  const getTipoBadge = (tipo: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL') => {
    if (tipo === 'ACTIVO_DIGITAL') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
          <i className="ri-wallet-3-line" />
          <span>Digital</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
        <i className="ri-bank-line" />
        <span>Líquido</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Transferencias Internas</h1>
          <p className="text-xs text-muted-foreground">
            Registro de movimientos y rebalanceos entre activos líquidos (cuentas bancarias) y activos digitales (billeteras USDT).
          </p>
        </div>
        <AddTransferenciaModal />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Transferencias Realizadas</span>
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <i className="ri-arrow-left-right-line text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">{totalCount}</div>
          <span className="text-[11px] text-muted-foreground">Operaciones internas registradas</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Volumen Enviado en COP</span>
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <i className="ri-bank-line text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">{formatCOP(totalEnviadoCOP)}</div>
          <span className="text-[11px] text-muted-foreground">Total transferido desde cuentas líquidas</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Volumen Enviado en USDT</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <i className="ri-coin-line text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">
            {formatNumber(totalEnviadoUSDT, 2, 2)} USDT
          </div>
          <span className="text-[11px] text-muted-foreground">Total transferido desde billeteras USDT</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Comisiones y Costos</span>
            <span className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <i className="ri-hand-coin-line text-lg" />
            </span>
          </div>
          <div className="mt-2 text-lg font-extrabold font-mono text-foreground">
            {formatCOP(totalCostosCOP)}
            {totalCostosUSDT > 0 && (
              <span className="block text-xs font-bold text-amber-500">
                + {formatNumber(totalCostosUSDT, 2, 2)} USDT
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">Fees bancarios y comisiones de red asumidos</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Historial de Transferencias Internas</h3>
            <p className="text-xs text-muted-foreground">Listado cronológico de movimientos con impacto en extractos</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {filtered.length} de {transferencias.length} registros
            </span>
            {(search || filterDivisa || filterTipo !== 'TODOS' || fechaDesde || fechaHasta || filterCreador) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilterDivisa('');
                  setFilterTipo('TODOS');
                  setFechaDesde('');
                  setFechaHasta('');
                  setFilterCreador('');
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar: Desktop (Search + Divisa + Fecha + Filtros) | Mobile (Search + Filtros) */}
        <div className="p-3.5 bg-muted/20 border-b border-border space-y-2">
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por concepto o cuenta..."
                className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Divisa Selector (Desktop only) */}
            <div className="hidden md:block w-36 shrink-0">
              <CurrencyFilterDropdown
                value={filterDivisa}
                onChange={setFilterDivisa}
                className="w-full"
              />
            </div>

            {/* Date range filter (Desktop only) */}
            <div className="hidden md:block shrink-0">
              <DateRangeFilter
                from={fechaDesde}
                to={fechaHasta}
                setFrom={setFechaDesde}
                setTo={setFechaHasta}
              />
            </div>

            {/* Popup Filter Trigger Button */}
            <FilterTriggerButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={(filterDivisa ? 1 : 0) + (filterTipo !== 'TODOS' ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
            />
          </div>
        </div>

        {/* Filter Modal */}
        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filtros de Transferencias Internas"
          activeCount={(filterDivisa ? 1 : 0) + (filterTipo !== 'TODOS' ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
          onClear={() => {
            setFilterDivisa('');
            setFilterTipo('TODOS');
            setFilterCreador('');
            setFechaDesde('');
            setFechaHasta('');
          }}
        >
          {/* Mobile-only visible filters */}
          <div className="md:hidden space-y-3 pb-3 border-b border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Divisa</label>
              <CurrencyFilterDropdown
                value={filterDivisa}
                onChange={setFilterDivisa}
                className="w-full"
              />
            </div>
            <div>
              <DateRangeFilter
                from={fechaDesde}
                to={fechaHasta}
                setFrom={setFechaDesde}
                setTo={setFechaHasta}
              />
            </div>
          </div>

          {/* Tipo Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Transferencia</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="h-8 w-full px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="ACTIVO_LIQUIDO">Entre Activos Líquidos (COP)</option>
              <option value="ACTIVO_DIGITAL">Entre Activos Digitales (USDT)</option>
            </select>
          </div>

          {/* Creador Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
            <CreatedByFilter
              value={filterCreador}
              onChange={setFilterCreador}
              records={transferencias}
              className="w-full"
            />
          </div>
        </FilterModal>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Origen</th>
                <th className="py-3 px-4">Destino</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Costo / Fee</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4 text-center">Acción</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    No se encontraron transferencias internas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={9} rows={filtered}>
                  {(t: TransferenciaInterna) => (
                    <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(t.fecha)}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                        {t.codigo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getTipoBadge(t.tipoOrigen)}
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {t.origenNombre || 'Cuenta Origen'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getTipoBadge(t.tipoDestino)}
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {t.destinoNombre || 'Cuenta Destino'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {t.divisaOrigen === 'COP'
                          ? formatCOP(t.monto)
                          : `${formatNumber(t.monto, 2, 6)} USDT`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-muted-foreground whitespace-nowrap">
                        {t.costo > 0
                          ? t.divisaCosto === 'COP'
                            ? formatCOP(t.costo)
                            : `${formatNumber(t.costo, 2, 2)} USDT`
                          : 'Exento'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate" title={t.concepto}>
                        {t.concepto || '—'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <AddTransferenciaModal edit={t} />
                      </td>
                      <CreatedByCell name={t.createdByName} />
                    </tr>
                  )}
                </PaginatedRows>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View ("Cajitas") */}
        <div className="block md:hidden p-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No se encontraron transferencias internas con los filtros seleccionados.
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-foreground block">{t.codigo}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(t.fecha)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    t.divisaOrigen === 'COP'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {t.divisaOrigen === 'COP' ? 'Líquido (COP)' : 'Digital (USDT)'}
                  </span>
                </div>

                {/* Transfer Path */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-muted-foreground block">Origen</span>
                    <span className="font-bold text-foreground truncate block">{t.origenNombre || 'Origen'}</span>
                  </div>
                  <i className="ri-arrow-right-line text-primary text-base px-2 shrink-0" />
                  <div className="min-w-0 flex-1 text-right">
                    <span className="text-[10px] text-muted-foreground block">Destino</span>
                    <span className="font-bold text-foreground truncate block">{t.destinoNombre || 'Destino'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-primary/5 border border-primary/15 p-2.5 rounded-xl">
                    <span className="text-[10px] font-medium text-muted-foreground block">Monto Transferido</span>
                    <span className="font-extrabold font-mono text-primary text-sm">
                      {t.divisaOrigen === 'COP' ? formatCOP(t.monto) : `${formatNumber(t.monto, 2, 6)} USDT`}
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded-xl">
                    <span className="text-[10px] font-medium text-muted-foreground block">Costo / Fee</span>
                    <span className="font-mono font-bold text-foreground text-xs">
                      {t.costo > 0
                        ? t.divisaCosto === 'COP'
                          ? formatCOP(t.costo)
                          : `${formatNumber(t.costo, 2, 2)} USDT`
                        : 'Exento'}
                    </span>
                  </div>
                </div>

                {t.concepto && (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 px-3 py-1.5 rounded-lg border border-border/50">
                    "{t.concepto}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <CreatedByCell name={t.createdByName} />
                  <div>
                    <AddTransferenciaModal edit={t} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
