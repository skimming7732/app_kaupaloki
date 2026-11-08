import { KpiStrip, sumRows, totalsByCurrency } from '../components/common/KpiStrip';
import { formatNumber, formatRate, formatCurrency } from '../utils/formatters';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/formatters';

export const ComprasUsdtView: React.FC = () => {
  const { data } = useData();
  const [search, setSearch] = useState('');
  const [filterDivisa, setFilterDivisa] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { totalOperaciones, divisasUnicas, filteredCompras } = useMemo(() => {
    const divisasSet = new Set<string>();

    data.comprasUsdt.forEach((c) => {
      if (c.divisaCodigo) divisasSet.add(c.divisaCodigo);
    });

    const filtered = data.comprasUsdt.filter((c) => {
      const matchSearch =
        c.codigo.toLowerCase().includes(search.toLowerCase()) ||
        c.divisaCodigo.toLowerCase().includes(search.toLowerCase()) ||
        Boolean(c.proveedor && c.proveedor.toLowerCase().includes(search.toLowerCase()));
      const matchDivisa = !filterDivisa || c.divisaCodigo === filterDivisa;

      const matchFecha = matchesDateRange(c.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchDivisa && matchFecha;
    });

    return {
      totalOperaciones: data.comprasUsdt.length,
      divisasUnicas: Array.from(divisasSet).sort(),
      filteredCompras: filtered,
    };
  }, [data.comprasUsdt, search, filterDivisa, fechaDesde, fechaHasta]);

  const rates = new Map<string, { total: number; count: number }>();
  for (const c of filteredCompras) {
    if (!Number.isFinite(c.tasa) || c.tasa <= 0) continue;
    const rate = rates.get(c.divisaCodigo) || { total: 0, count: 0 };
    rates.set(c.divisaCodigo, { total: rate.total + c.tasa, count: rate.count + 1 });
  }
  const averageRate = [...rates].map(([currency, rate]) =>
    formatRate(rate.total / rate.count) + ' ' + currency + '/USDT'
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Compras USDT</h2>
          <p className="text-xs text-muted-foreground">Registro y custodia de adquisición de Tether en divisas internacionales</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCatalogButton table="compras_usdt" />
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
              placeholder="Buscar por código, proveedor o divisa..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Divisa Filter */}
          <div>
            <TableSelectFilter label="Divisa" value={filterDivisa} onChange={setFilterDivisa} className="w-full">
              <option value="">Todas las divisas</option>
              {divisasUnicas.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </TableSelectFilter>
          </div>

          {/* Date range shortcut */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>
        <p className="border-t border-border pt-2 text-xs text-muted-foreground" aria-live="polite">{formatNumber(filteredCompras.length)} de {formatNumber(totalOperaciones)} registros</p>
      </div>

      <KpiStrip metrics={([
        ['Compras', filteredCompras.length],
        ['Valor comprado', totalsByCurrency(filteredCompras, (c) => c.divisaCodigo, (c) => c.valorComprado)],
        ['Tasa promedio', averageRate.length === 0 ? '—' : averageRate.length === 1 ? averageRate[0] : (
          <details className="text-sm">
            <summary className="cursor-pointer text-primary">Ver {averageRate.length} tasas</summary>
            <ul className="mt-2 space-y-1 text-xs font-medium">
              {averageRate.map((rate) => <li key={rate}>{rate}</li>)}
            </ul>
          </details>
        )],
        ['USDT comprado', formatCurrency(sumRows(filteredCompras, (c) => c.usdtComprado), 'USDT')],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Compras Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Divisa</th>
                <th className="py-3 px-4 text-right">Valor Comprado</th>
                <th className="py-3 px-4 text-right">Tasa</th>
                <th className="py-3 px-4 text-right">USDT Comprado</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4">Destino</th>
                <CreatedByHeader />
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    No hay registros de compras USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={11} rows={filteredCompras}>{(c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{c.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(c.fecha)}</td>
                    <td className="py-3 px-4">
                      {c.proveedor ? (
                        <span className="font-semibold text-foreground">{c.proveedor}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Sin registro</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20 text-[11px]">
                        {c.divisaCodigo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatNumber(c.valorComprado, 0, 2)} {c.divisaCodigo}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {formatRate(c.tasa)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                      +{formatNumber(c.usdtComprado, 0, 2)} USDT
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {formatRate(c.costo)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {c.walletDestino || (c.walletDestinoId && data.activosDigitales.find((a) => a.id === c.walletDestinoId)?.activo) || data.activosDigitales[0]?.activo || 'Sin registro'}
                      </span>
                    </td>
                    <CreatedByCell name={c.createdByName} />
                    <td className="px-4"><AddCatalogButton table="compras_usdt" edit={{ id: c.id, historical: false, fields: { fecha: c.fecha?.slice(0, 10) || '', proveedor: c.proveedor || '', divisa_codigo: c.divisaCodigo, valor_comprado: c.valorComprado, tasa: c.tasa || (c.usdtComprado > 0 ? c.valorComprado / c.usdtComprado : 0), usdt_comprado: c.usdtComprado, origen_fondos_id: c.origenFondosId || '', wallet_destino_id: c.walletDestinoId || '' } }} /></td>
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
