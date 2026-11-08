import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { formatNumber, formatRate, formatCurrency } from '../utils/formatters';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const VentasUsdtView: React.FC = () => {
  const { data } = useData();
  const [search, setSearch] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { destinosUnicos, filteredVentas } = useMemo(() => {
    const destinosSet = new Set<string>();

    data.ventasUsdt.forEach((v) => {
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
      destinosUnicos: Array.from(destinosSet).sort(),
      filteredVentas: filtered,
    };
  }, [data.ventasUsdt, search, filterDestino, fechaDesde, fechaHasta]);

  const totalUsdtVendidos = sumRows(filteredVentas, (v) => v.usdtVendido);
  const totalCopRecibidos = sumRows(filteredVentas, (v) => v.totalCOP);
  const tasaPromedioVenta = totalUsdtVendidos > 0 ? (totalCopRecibidos / totalUsdtVendidos) : 0;

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
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código de venta o concepto..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
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
        <p className="border-t border-border pt-2 text-xs text-muted-foreground" aria-live="polite">{formatNumber(filteredVentas.length)} de {formatNumber(data.ventasUsdt.length)} registros</p>
      </div>

      <KpiStrip metrics={([
        ['Ventas', filteredVentas.length],
        ['USDT vendidos', formatCurrency(totalUsdtVendidos, 'USDT')],
        ['Tasa promedio', tasaPromedioVenta > 0 ? '$' + formatRate(tasaPromedioVenta) + ' COP' : '—'],
        ['COP recibidos', formatCOP(totalCopRecibidos)],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Ventas Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Origen Fondos</th>
                <th className="py-3 px-4 text-right">USDT Vendido</th>
                <th className="py-3 px-4 text-right">Tasa Venta (COP)</th>
                <th className="py-3 px-4 text-right">Total (COP)</th>
                <th className="py-3 px-4">Destino Fondos</th>
                <CreatedByHeader />
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No hay registros de ventas USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={10} rows={filteredVentas}>{(v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{v.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(v.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{v.concepto || 'Venta USDT'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {v.walletOrigen || 'Sin registro'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-500">
                      -{formatNumber(v.usdtVendido, 0, 2)} USDT
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ${formatRate(v.tasa)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                      {formatCOP(v.totalCOP)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {v.destinoFondosNombre || 'Sin registro'}
                      </span>
                    </td>
                    <CreatedByCell name={v.createdByName} />
                    <td className="px-4"><AddCatalogButton table="ventas_usdt" edit={{ id: v.id, historical: !v.walletOrigenId || !v.destinoFondosId, fields: { fecha: v.fecha?.slice(0, 10) || '', concepto: v.concepto, usdt_vendido: v.usdtVendido, tasa: v.tasa, wallet_origen_id: v.walletOrigenId || '', destino_fondos_id: v.destinoFondosId || '' } }} /></td>
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
