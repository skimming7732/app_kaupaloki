import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { formatNumber, formatRate, formatCurrency } from '../utils/formatters';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import { UsdtVoucherModal } from '../components/modals/UsdtVoucherModal';
import { UsdtTransactionVoucherData } from '../utils/usdtVoucherGenerator';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const VentasUsdtView: React.FC = () => {
  const { data } = useData();
  const [search, setSearch] = useState('');
  const [filterDivisa, setFilterDivisa] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<UsdtTransactionVoucherData | null>(null);

  const {
    destinosUnicos,
    filteredVentas,
    totalCopRecibidos,
    totalCopEnTransito,
    pendientesCount,
  } = useMemo(() => {
    const destinosSet = new Set<string>();

    data.ventasUsdt.forEach((v) => {
      if (v.destinoFondosNombre) destinosSet.add(v.destinoFondosNombre);
    });

    const filtered = data.ventasUsdt.filter((v) => {
      const matchSearch =
        v.codigo.toLowerCase().includes(search.toLowerCase()) ||
        v.concepto.toLowerCase().includes(search.toLowerCase()) ||
        Boolean(v.destinoFondosNombre && v.destinoFondosNombre.toLowerCase().includes(search.toLowerCase()));
      const divisaVenta = String(v.raw?.divisa_codigo || 'COP').toUpperCase();
      const matchDivisa =
        !filterDivisa ||
        divisaVenta === filterDivisa.toUpperCase() ||
        (filterDivisa.toUpperCase() === 'USDT' && v.usdtVendido > 0);
      const matchDestino = !filterDestino || v.destinoFondosNombre === filterDestino;

      const matchEstado = filterEstado === 'todos' || v.estado === filterEstado;
      const matchFecha = matchesDateRange(v.fecha, fechaDesde, fechaHasta);

      const matchCreador = !filterCreador || formatAuthorName(v.createdByName, v.createdBy, data.usuarios).toLowerCase() === filterCreador.toLowerCase();

      return matchSearch && matchDivisa && matchDestino && matchEstado && matchFecha && matchCreador;
    });

    const enTransito = filtered.filter((v) => v.estado === 'pendiente');
    const recibidas = filtered.filter((v) => v.estado !== 'pendiente');

    return {
      destinosUnicos: Array.from(destinosSet).sort(),
      filteredVentas: filtered,
      totalCopRecibidos: sumRows(recibidas, (v) => v.totalCOP),
      totalCopEnTransito: sumRows(enTransito, (v) => v.totalCOP),
      pendientesCount: enTransito.length,
    };
  }, [data.ventasUsdt, data.usuarios, search, filterDivisa, filterDestino, filterEstado, filterCreador, fechaDesde, fechaHasta]);

  const totalUsdtVendidos = sumRows(filteredVentas, (v) => v.usdtVendido);
  const totalFeeUsdt = sumRows(filteredVentas, (v) => v.feeUsdt);
  // totalCopRecibidos and totalCopEnTransito are computed above
  const totalCopTotal = totalCopRecibidos + totalCopEnTransito;
  const tasaPromedioVenta = totalUsdtVendidos > 0 ? totalCopTotal / totalUsdtVendidos : 0;

  const handleMarcarRecibido = async (venta: any) => {
    if (!window.confirm(`¿Confirmas que los ${formatCOP(venta.totalCOP)} de la venta ${venta.codigo} ya fueron recibidos en la cuenta de destino (${venta.destinoFondosNombre || 'cuenta'})?`)) {
      return;
    }
    setReceivingId(venta.id);
    try {
      await marcarVentaRecibida(venta.id);
    } catch (err: any) {
      alert(err?.message || 'No se pudo marcar la venta como recibida.');
    } finally {
      setReceivingId(null);
    }
  };


  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Ventas USDT</h2>
          <p className="text-xs text-muted-foreground">
            Monetización y dispersión de Tether a cuentas bancarias y caja de efectivo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCatalogButton table="ventas_usdt" />
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
                placeholder="Buscar por código de venta o concepto..."
                className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Divisa Filter (Desktop only) */}
            <div className="hidden md:block w-40 lg:w-44 shrink-0">
              <CurrencyFilterDropdown value={filterDivisa} onChange={setFilterDivisa} className="w-full" />
            </div>
          </div>

          {/* Right: Date Range + Filter Trigger Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Date Range (Desktop only) */}
            <div className="hidden md:block shrink-0">
              <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} compact />
            </div>

            {/* Popup Filter Trigger Button */}
            <FilterTriggerButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={(filterDivisa ? 1 : 0) + (filterCreador ? 1 : 0) + (filterDestino ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span aria-live="polite">
            {formatNumber(filteredVentas.length)} de {formatNumber(data.ventasUsdt.length)} registros
          </span>
          {(search || filterDivisa || filterDestino || fechaDesde || fechaHasta || filterCreador) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterDivisa('');
                setFilterDestino('');
                setFechaDesde('');
                setFechaHasta('');
                setFilterCreador('');
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
        title="Filtros de Ventas USDT"
        activeCount={(filterDivisa ? 1 : 0) + (filterCreador ? 1 : 0) + (filterDestino ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
        onClear={() => {
          setFilterDivisa('');
          setFilterDestino('');
          setFechaDesde('');
          setFechaHasta('');
          setFilterCreador('');
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

        {/* Destino Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cuenta Destino</label>
          <TableSelectFilter label="Destino" value={filterDestino} onChange={setFilterDestino} className="w-full">
            <option value="">Todas las cuentas destino</option>
            {destinosUnicos.map((dest) => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </TableSelectFilter>
        </div>

        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={filterCreador}
            onChange={setFilterCreador}
            records={data.ventasUsdt}
            className="w-full"
          />
        </div>
      </FilterModal>

      <KpiStrip
        metrics={(
          [
            ['Ventas', filteredVentas.length],
            ['USDT vendidos', formatCurrency(totalUsdtVendidos, 'USDT')],
            ['Tasa promedio', tasaPromedioVenta > 0 ? '$' + formatRate(tasaPromedioVenta) + ' COP' : '—'],
            ['COP recibidos', formatCOP(totalCopRecibidos)],
            ['Fee de envío', formatNumber(totalFeeUsdt, 0, 6) + ' USDT'],
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
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Origen Fondos</th>
                <th className="py-3 px-4 text-right">USDT Vendido</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Fee (USDT)</th>
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
                  <td colSpan={12} className="py-12 text-center text-muted-foreground">
                    No hay registros de ventas USDT coincidentes con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={12} rows={filteredVentas}>
                  {(v) => (
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
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatNumber(v.feeUsdt, 0, 6)}</td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">${formatRate(v.tasa)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                        {formatCOP(v.totalCOP)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                          {v.destinoFondosNombre || 'Sin registro'}
                        </span>
                      </td>
                      <CreatedByCell name={v.createdByName} />
                      <td className="px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedVoucher({
                              tipo: 'VENTA',
                              codigo: v.codigo,
                              fecha: v.fecha?.slice(0, 10) || '',
                              contraparte: v.concepto || 'Venta USDT',
                              divisa: 'COP',
                              montoDivisa: v.totalCOP || (v.usdtVendido * v.tasa),
                              usdtMonto: v.usdtVendido,
                              tasa: v.tasa,
                              feeUsdt: v.feeUsdt,
                              wallet: v.walletOrigenNombre || 'Billetera',
                              cuentaContraparte: v.destinoFondosNombre,
                              createdByName: v.createdByName,
                            })}
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary hover:text-primary transition-colors"
                            title="Ver comprobante de operación"
                          >
                            <i className="ri-file-text-line text-sm" />
                          </button>
                          <AddCatalogButton
                            table="ventas_usdt"
                            edit={{
                              id: v.id,
                              historical: !v.walletOrigenId || !v.destinoFondosId,
                              fields: {
                                fecha: v.fecha?.slice(0, 10) || '',
                                concepto: v.concepto,
                                usdt_vendido: v.usdtVendido,
                                fee_usdt: v.feeUsdt,
                                tasa: v.tasa,
                                wallet_origen_id: v.walletOrigenId || '',
                                destino_fondos_id: v.destinoFondosId || '',
                              },
                            }}
                          />
                        </div>
                      </td>
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
        {filteredVentas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs shadow-sm">
            No hay registros de ventas USDT coincidentes con los filtros
          </div>
        ) : (
          filteredVentas.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-foreground">{v.codigo}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(v.fecha)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-0.5">{v.concepto || 'Venta USDT'}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                  -{formatNumber(v.usdtVendido, 0, 2)} USDT
                </span>
              </div>

              {/* Origin -> Destination Route */}
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-muted/40 border border-border">
                <span className="px-1.5 py-0.5 rounded bg-card text-foreground font-semibold text-[10px] truncate max-w-[120px]">
                  {v.walletOrigen || 'Billetera'}
                </span>
                <i className="ri-arrow-right-line text-muted-foreground" />
                <span className="px-1.5 py-0.5 rounded bg-card text-foreground font-semibold text-[10px] truncate max-w-[120px]">
                  {v.destinoFondosNombre || 'Cuenta Destino'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 p-2 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Tasa Venta</span>
                  <span className="font-mono font-bold text-foreground text-xs">${formatRate(v.tasa)} COP</span>
                </div>
                <div className="bg-muted/30 p-2 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Fee de Envío</span>
                  <span className="font-mono font-semibold text-muted-foreground text-xs">{formatNumber(v.feeUsdt, 0, 6)} USDT</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Total COP Recibido</span>
                <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCOP(v.totalCOP)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <CreatedByCell name={v.createdByName} />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedVoucher({
                      tipo: 'VENTA',
                      codigo: v.codigo,
                      fecha: v.fecha?.slice(0, 10) || '',
                      contraparte: v.concepto || 'Venta USDT',
                      divisa: 'COP',
                      montoDivisa: v.totalCOP || (v.usdtVendido * v.tasa),
                      usdtMonto: v.usdtVendido,
                      tasa: v.tasa,
                      feeUsdt: v.feeUsdt,
                      wallet: v.walletOrigenNombre || 'Billetera',
                      cuentaContraparte: v.destinoFondosNombre,
                      createdByName: v.createdByName,
                    })}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-primary hover:text-primary transition-colors text-xs flex items-center gap-1"
                    title="Ver comprobante de operación"
                  >
                    <i className="ri-file-text-line text-sm" />
                    <span className="hidden sm:inline">Comprobante</span>
                  </button>
                  <AddCatalogButton
                    table="ventas_usdt"
                    edit={{
                      id: v.id,
                      historical: !v.walletOrigenId || !v.destinoFondosId,
                      fields: {
                        fecha: v.fecha?.slice(0, 10) || '',
                        concepto: v.concepto,
                        usdt_vendido: v.usdtVendido,
                        fee_usdt: v.feeUsdt,
                        tasa: v.tasa,
                        wallet_origen_id: v.walletOrigenId || '',
                        destino_fondos_id: v.destinoFondosId || '',
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
