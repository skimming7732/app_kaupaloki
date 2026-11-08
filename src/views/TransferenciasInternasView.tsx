import React, { useMemo, useState } from 'react';
import { useData, type TransferenciaInterna } from '../context/DataContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddTransferenciaModal } from '../components/modals/AddTransferenciaModal';

export const TransferenciasInternasView: React.FC = () => {
  const { data } = useData();
  const transferencias = data.transferenciasInternas || [];

  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('TODOS');

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

      const matchDate = matchesDateRange(t.fecha, fechaDesde, fechaHasta);

      let matchTipo = true;
      if (filterTipo === 'ACTIVO_LIQUIDO') {
        matchTipo = t.tipoOrigen === 'ACTIVO_LIQUIDO';
      } else if (filterTipo === 'ACTIVO_DIGITAL') {
        matchTipo = t.tipoOrigen === 'ACTIVO_DIGITAL';
      }

      return matchSearch && matchDate && matchTipo;
    });
  }, [transferencias, search, fechaDesde, fechaHasta, filterTipo]);

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
          <div className="mt-2 text-2xl font-extrabold font-mono text-foreground">{formatNumber(totalEnviadoUSDT, 2, 2)} USDT</div>
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
            {totalCostosUSDT > 0 && <span className="block text-xs font-bold text-amber-500">+ {formatNumber(totalCostosUSDT, 2, 2)} USDT</span>}
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
          <span className="text-xs font-mono text-muted-foreground">
            {filtered.length} de {transferencias.length} registros
          </span>
        </div>

        {/* Toolbar: Search and Filters placed BEFORE the table */}
        <div className="p-3.5 bg-muted/20 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por concepto o cuenta..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Tipo Selector */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="ACTIVO_LIQUIDO">Entre Activos Líquidos (COP)</option>
              <option value="ACTIVO_DIGITAL">Entre Activos Digitales (USDT)</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <DateRangeFilter
              startDate={fechaDesde}
              endDate={fechaHasta}
              onRangeChange={(start, end) => {
                setFechaDesde(start);
                setFechaHasta(end);
              }}
            />
          </div>
        </div>

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
                <PaginatedRows columns={9} rows={filtered}>{(t: TransferenciaInterna) => (
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
                      {t.divisaOrigen === 'COP' ? formatCOP(t.monto) : `${formatNumber(t.monto, 2, 6)} USDT`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-muted-foreground whitespace-nowrap">
                      {t.costo > 0
                        ? (t.divisaCosto === 'COP' ? formatCOP(t.costo) : `${formatNumber(t.costo, 2, 2)} USDT`)
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
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
