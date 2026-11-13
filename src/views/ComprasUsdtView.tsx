import { KpiStrip, sumRows, totalsByCurrency } from '../components/common/KpiStrip';
import { formatNumber, formatRate, formatCurrency } from '../utils/formatters';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import { UsdtVoucherModal } from '../components/modals/UsdtVoucherModal';
import { UsdtTransactionVoucherData } from '../utils/usdtVoucherGenerator';
import { EstadoTransitoSelect } from '../components/common/EstadoTransitoSelect';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isAuditorRole } from '../utils/roles';
import { formatDate } from '../utils/formatters';

export const ComprasUsdtView: React.FC = () => {
  const { data, marcarCompraRecibida, marcarCompraPendiente } = useData();
  const { profile } = useAuth();
  const canWrite = !isAuditorRole(profile?.role);
  const [search, setSearch] = useState('');
  const [filterDivisa, setFilterDivisa] = useState('');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'recibido' | 'pendiente'>('todos');
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<UsdtTransactionVoucherData | null>(null);

  const handleToggleEstado = async (id: string, currentEstado: string) => {
    if (receivingId) return;
    const newEstado = currentEstado === 'pendiente' ? 'recibido' : 'pendiente';
    const confirmMsg = newEstado === 'recibido'
      ? '¿Confirmas que los USDT ya fueron recibidos en la wallet de destino? Sumará al saldo de la billetera.'
      : '¿Deseas cambiar el estado a "Por recibir (En tránsito)"? Se restará de la billetera destino hasta que sea recibido.';
    if (!window.confirm(confirmMsg)) return;

    setReceivingId(id);
    try {
      if (newEstado === 'recibido') {
        await marcarCompraRecibida(id);
      } else {
        await marcarCompraPendiente(id);
      }
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar el estado.');
    } finally {
      setReceivingId(null);
    }
  };

  const {
    totalOperaciones,
    divisasUnicas,
    filteredCompras,
    totalUsdtEnTransito,
    totalUsdtRecibido,
    pendientesCount,
  } = useMemo(() => {
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
      const matchEstado = filterEstado === 'todos' || c.estado === filterEstado;
      const matchFecha = matchesDateRange(c.fecha, fechaDesde, fechaHasta);

      const matchCreador = !filterCreador || formatAuthorName(c.createdByName, c.createdBy, data.usuarios).toLowerCase() === filterCreador.toLowerCase();

      return matchSearch && matchDivisa && matchEstado && matchFecha && matchCreador;
    });

    const enTransito = filtered.filter((c) => c.estado === 'pendiente');
    const recibidas = filtered.filter((c) => c.estado !== 'pendiente');

    return {
      totalOperaciones: data.comprasUsdt.length,
      divisasUnicas: Array.from(divisasSet).sort(),
      filteredCompras: filtered,
      totalUsdtEnTransito: sumRows(enTransito, (c) => c.usdtComprado),
      totalUsdtRecibido: sumRows(recibidas, (c) => c.usdtComprado),
      pendientesCount: enTransito.length,
    };
  }, [data.comprasUsdt, data.usuarios, search, filterDivisa, filterEstado, filterCreador, fechaDesde, fechaHasta]);

  const rates = new Map<string, { total: number; count: number }>();
  for (const c of filteredCompras) {
    if (!Number.isFinite(c.tasa) || c.tasa <= 0) continue;
    const rate = rates.get(c.divisaCodigo) || { total: 0, count: 0 };
    rates.set(c.divisaCodigo, { total: rate.total + c.tasa, count: rate.count + 1 });
  }

  const handleMarcarRecibido = async (compra: any) => {
    if (!window.confirm(`¿Confirmas que los ${formatNumber(compra.usdtComprado, 0, 2)} USDT de la compra ${compra.codigo} ya fueron recibidos en la billetera de destino?`)) {
      return;
    }
    setReceivingId(compra.id);
    try {
      await marcarCompraRecibida(compra.id);
    } catch (err: any) {
      alert(err?.message || 'No se pudo marcar la compra como recibida.');
    } finally {
      setReceivingId(null);
    }
  };

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

      {/* Filter Bar: Desktop (Search + Divisa + Fecha + Filtros) | Mobile (Search + Filtros) */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Search + Divisa */}
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl">
            <div className="relative flex-1 min-w-[160px]">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, proveedor o divisa..."
                className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Divisa Filter (Desktop only) */}
            <div className="hidden md:block w-40 lg:w-44 shrink-0">
              <CurrencyFilterDropdown value={filterDivisa} onChange={setFilterDivisa} className="w-full" />
            </div>
          </div>

          {/* Right: Date range + Filter Trigger Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Date range (Desktop only) */}
            <div className="hidden md:block shrink-0">
              <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} compact />
            </div>

            {/* Popup Filter Trigger Button */}
            <FilterTriggerButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={(filterDivisa ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span aria-live="polite">{formatNumber(filteredCompras.length)} de {formatNumber(totalOperaciones)} registros</span>
          {(search || filterDivisa || filterCreador || fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterDivisa('');
                setFilterCreador('');
                setFechaDesde('');
                setFechaHasta('');
              }}
              className="text-primary hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros de Compras USDT"
        activeCount={(filterDivisa ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
        onClear={() => {
          setFilterDivisa('');
          setFilterCreador('');
          setFechaDesde('');
          setFechaHasta('');
        }}
      >
        {/* Mobile-only visible filters */}
        <div className="md:hidden space-y-3 pb-3 border-b border-border">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Divisa</label>
            <CurrencyFilterDropdown value={filterDivisa} onChange={setFilterDivisa} className="w-full" />
          </div>
          <div>
            <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
          </div>
        </div>

        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={filterCreador}
            onChange={setFilterCreador}
            records={data.comprasUsdt}
            className="w-full"
          />
        </div>
      </FilterModal>

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
        ['USDT recibido (Confirmado)', formatCurrency(totalUsdtRecibido, 'USDT')],
        ['USDT pendiente (En tránsito)', (
          <div className="flex items-center gap-1.5">
            <span className={totalUsdtEnTransito > 0 ? "text-amber-400 font-bold" : ""}>
              {formatCurrency(totalUsdtEnTransito, 'USDT')}
            </span>
            {pendientesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                {pendientesCount} pend.
              </span>
            )}
          </div>
        )],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
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
                <th className="py-3 px-4 text-center">Estado</th>
                <CreatedByHeader />
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    No hay registros de compras USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={12} rows={filteredCompras}>{(c) => (
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

                    <td className="py-3 px-4 text-center">
                      <EstadoTransitoSelect
                        estado={c.estado}
                        tipo="compra"
                        disabled={!canWrite}
                        onCambiarEstado={async (nuevo) => {
                          if (nuevo === 'recibido') {
                            await marcarCompraRecibida(c.id);
                          } else {
                            await marcarCompraPendiente(c.id);
                          }
                        }}
                      />
                    </td>
                    <CreatedByCell name={c.createdByName} />
                    <td className="px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVoucher({
                            tipo: 'COMPRA',
                            codigo: c.codigo,
                            fecha: c.fecha?.slice(0, 10) || '',
                            contraparte: c.proveedor || 'Sin proveedor',
                            divisa: c.divisaCodigo,
                            montoDivisa: c.valorComprado,
                            usdtMonto: c.usdtComprado,
                            tasa: c.tasa !== undefined && c.tasa !== null ? c.tasa : (c.usdtComprado > 0 ? c.valorComprado / c.usdtComprado : 0),
                            wallet: c.walletDestino || (c.walletDestinoId && data.activosDigitales.find((a) => a.id === c.walletDestinoId)?.activo) || data.activosDigitales[0]?.activo || 'Billetera',
                            createdByName: c.createdByName,
                          })}
                          className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary hover:text-primary transition-colors"
                          title="Ver comprobante de operación"
                        >
                          <i className="ri-file-text-line text-sm" />
                        </button>
                        <AddCatalogButton table="compras_usdt" edit={{ id: c.id, historical: false, fields: { fecha: c.fecha?.slice(0, 10) || '', proveedor: c.proveedor || '', divisa_codigo: c.divisaCodigo, valor_comprado: c.valorComprado, tasa: c.tasa !== undefined && c.tasa !== null ? c.tasa : (c.usdtComprado > 0 ? c.valorComprado / c.usdtComprado : 0), usdt_comprado: c.usdtComprado, wallet_destino_id: c.walletDestinoId || '', estado: c.estado } }} />
                      </div>
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View ("Cajitas") */}
      <div className="block md:hidden space-y-3">
        {filteredCompras.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs shadow-sm">
            No hay registros de compras USDT coincidentes con los filtros
          </div>
        ) : (
          filteredCompras.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-foreground">{c.codigo}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(c.fecha)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-0.5">{c.proveedor || 'Sin proveedor'}</h4>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20 text-[11px]">
                    {c.divisaCodigo}
                  </span>
                  <EstadoTransitoSelect
                    estado={c.estado}
                    tipo="compra"
                    disabled={!canWrite}
                    onCambiarEstado={async (nuevo) => {
                      if (nuevo === 'recibido') {
                        await marcarCompraRecibida(c.id);
                      } else {
                        await marcarCompraPendiente(c.id);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Valor Comprado</span>
                  <span className="font-bold text-foreground text-xs">
                    {formatNumber(c.valorComprado, 0, 2)} {c.divisaCodigo}
                  </span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Tasa de Compra</span>
                  <span className="font-mono font-bold text-foreground text-xs">${formatRate(c.tasa)}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">USDT Recibido</span>
                  <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    +{formatNumber(c.usdtComprado, 0, 2)} USDT
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Destino</span>
                  <span className="text-xs font-semibold text-foreground">
                    {c.walletDestino || (c.walletDestinoId && data.activosDigitales.find((a) => a.id === c.walletDestinoId)?.activo) || 'Billetera'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <CreatedByCell name={c.createdByName} />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedVoucher({
                      tipo: 'COMPRA',
                      codigo: c.codigo,
                      fecha: c.fecha?.slice(0, 10) || '',
                      contraparte: c.proveedor || 'Sin proveedor',
                      divisa: c.divisaCodigo,
                      montoDivisa: c.valorComprado,
                      usdtMonto: c.usdtComprado,
                      tasa: c.tasa !== undefined && c.tasa !== null ? c.tasa : (c.usdtComprado > 0 ? c.valorComprado / c.usdtComprado : 0),
                      wallet: c.walletDestino || (c.walletDestinoId && data.activosDigitales.find((a) => a.id === c.walletDestinoId)?.activo) || data.activosDigitales[0]?.activo || 'Billetera',
                      createdByName: c.createdByName,
                    })}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary hover:text-primary transition-colors text-xs flex items-center gap-1"
                    title="Ver comprobante de operación"
                  >
                    <i className="ri-file-text-line text-sm" />
                    <span className="hidden sm:inline">Comprobante</span>
                  </button>
                  <AddCatalogButton
                    table="compras_usdt"
                    edit={{
                      id: c.id,
                      historical: false,
                      fields: {
                        fecha: c.fecha?.slice(0, 10) || '',
                        proveedor: c.proveedor || '',
                        divisa_codigo: c.divisaCodigo,
                        valor_comprado: c.valorComprado,
                        tasa: c.tasa !== undefined && c.tasa !== null ? c.tasa : (c.usdtComprado > 0 ? c.valorComprado / c.usdtComprado : 0),
                        usdt_comprado: c.usdtComprado,
                        wallet_destino_id: c.walletDestinoId || '',
                        estado: c.estado,
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <UsdtVoucherModal isOpen={Boolean(selectedVoucher)} onClose={() => setSelectedVoucher(null)} data={selectedVoucher} />
    </div>
  );
};
