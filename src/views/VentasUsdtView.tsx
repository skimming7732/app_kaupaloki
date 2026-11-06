import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const VentasUsdtView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { totalUsdtVendido, totalCopRecibido, destinosUnicos, filteredVentas } = useMemo(() => {
    let totalUsdt = 0;
    let totalCop = 0;
    const destinosSet = new Set<string>();

    data.ventasUsdt.forEach((v) => {
      totalUsdt += v.usdtVendido;
      totalCop += v.totalCOP;
      if (v.destinoFondosNombre) destinosSet.add(v.destinoFondosNombre);
    });

    const filtered = data.ventasUsdt.filter((v) => {
      const matchSearch =
        v.codigo.toLowerCase().includes(search.toLowerCase()) ||
        v.concepto.toLowerCase().includes(search.toLowerCase()) ||
        (v.destinoFondosNombre && v.destinoFondosNombre.toLowerCase().includes(search.toLowerCase()));
      const matchDestino = !filterDestino || v.destinoFondosNombre === filterDestino;

      const matchFecha = matchesDateRange(v.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchDestino && matchFecha;
    });

    return {
      totalUsdtVendido: totalUsdt,
      totalCopRecibido: totalCop,
      destinosUnicos: Array.from(destinosSet).sort(),
      filteredVentas: filtered,
    };
  }, [data.ventasUsdt, search, filterDestino, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Ventas USDT</h2>
          <p className="text-xs text-muted-foreground">Monetización y dispersión de Tether a cuentas bancarias y caja de efectivo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCatalogButton table="ventas_usdt" />
          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20">
            {filteredVentas.length} de {data.ventasUsdt.length} Registros
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total USDT Vendido</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <i className="ri-funds-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground">
            {totalUsdtVendido.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Egreso de wallets corporativas</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total Recibido (COP)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-bank-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground font-mono">{formatCOP(totalCopRecibido)}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Ingresado en bancos y caja</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Tasa Promedio Venta</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-arrow-up-down-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground font-mono">
            {totalUsdtVendido > 0 ? formatCOP(totalCopRecibido / totalUsdtVendido) : '$0'}
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Precio promedio de liquidación</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código de venta o concepto..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Destino Filter */}
          <div>
            <TableSelectFilter label="Destino" value={filterDestino} onChange={setFilterDestino} className="w-full">
              <option value="">Todas las cuentas destino</option>
              {destinosUnicos.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </TableSelectFilter>
          </div>

          {/* Date Range */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>
      </div>

      {/* Ventas Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4 text-right">USDT Vendido</th>
                <th className="py-3 px-4 text-right">Tasa Venta (COP)</th>
                <th className="py-3 px-4 text-right">Total (COP)</th>
                <th className="py-3 px-4">Destino Fondos</th>
                <th className="py-3 px-4">Origen</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No hay registros de ventas USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={9} rows={filteredVentas}>{(v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{v.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(v.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{v.concepto || 'Venta USDT'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-500">
                      -{v.usdtVendido.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {formatCOP(v.tasa)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                      {formatCOP(v.totalCOP)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {v.destinoFondosNombre || 'Sin registro'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px] font-mono">
                      {v.walletOrigen || 'Sin registro'}
                    </td>
                    <CreatedByCell name={v.createdByName} />
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
