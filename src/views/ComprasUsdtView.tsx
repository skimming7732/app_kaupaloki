import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatDate } from '../utils/formatters';

export const ComprasUsdtView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [filterDivisa, setFilterDivisa] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const { totalUsdtComprado, totalOperaciones, divisasUnicas, filteredCompras } = useMemo(() => {
    let totalUsdt = 0;
    const divisasSet = new Set<string>();

    data.comprasUsdt.forEach((c) => {
      totalUsdt += c.usdtComprado;
      if (c.divisaCodigo) divisasSet.add(c.divisaCodigo);
    });

    const filtered = data.comprasUsdt.filter((c) => {
      const matchSearch =
        c.codigo.toLowerCase().includes(search.toLowerCase()) ||
        c.divisaCodigo.toLowerCase().includes(search.toLowerCase());
      const matchDivisa = !filterDivisa || c.divisaCodigo === filterDivisa;

      let matchFecha = true;
      if (fechaDesde && c.fecha) {
        matchFecha = matchFecha && c.fecha >= fechaDesde;
      }
      if (fechaHasta && c.fecha) {
        matchFecha = matchFecha && c.fecha <= fechaHasta;
      }

      return matchSearch && matchDivisa && matchFecha;
    });

    return {
      totalUsdtComprado: totalUsdt,
      totalOperaciones: data.comprasUsdt.length,
      divisasUnicas: Array.from(divisasSet).sort(),
      filteredCompras: filtered,
    };
  }, [data.comprasUsdt, search, filterDivisa, fechaDesde, fechaHasta]);

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
          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20">
            {filteredCompras.length} de {totalOperaciones} Registros
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total USDT Comprado</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-coin-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground">
            {totalUsdtComprado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT
          </span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Volumen global acumulado</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Total Operaciones</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-file-list-3-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground">{totalOperaciones}</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">Transacciones registradas en Airtable</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase">Divisas Utilizadas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <i className="ri-global-line text-base" />
            </div>
          </div>
          <span className="text-xl font-black text-foreground">{divisasUnicas.length} Divisas</span>
          <span className="text-[11px] text-muted-foreground block mt-0.5">
            {divisasUnicas.slice(0, 4).join(', ')}{divisasUnicas.length > 4 ? '...' : ''}
          </span>
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
              placeholder="Buscar por código de compra o divisa..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Divisa Filter */}
          <div>
            <select
              value={filterDivisa}
              onChange={(e) => setFilterDivisa(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todas las divisas</option>
              {divisasUnicas.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Date range shortcut */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha inicial"
              className="w-1/2 px-2 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
            <span className="text-xs text-muted-foreground">-</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha final"
              className="w-1/2 px-2 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Compras Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Divisa</th>
                <th className="py-3 px-4 text-right">Valor Comprado</th>
                <th className="py-3 px-4 text-right">Tasa</th>
                <th className="py-3 px-4 text-right">USDT Comprado</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4">Destino</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No hay registros de compras USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                filteredCompras.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{c.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(c.fecha)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20 text-[11px]">
                        {c.divisaCodigo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {c.valorComprado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {c.divisaCodigo}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {c.tasa.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                      +{c.usdtComprado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USDT
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {c.costo.toFixed(4)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {c.walletDestino || 'Sin registro'}
                      </span>
                    </td>
                    <CreatedByCell name={c.createdByName} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
