import { useState } from 'react';
import { useData } from '../context/DataContext';
import { sumRows } from '../components/common/KpiStrip';
import { normalizeDateToLocalYmd } from '../components/common/DateRangeFilter';
import { ClientIncomeComparisonChart } from '../components/common/ClientIncomeComparisonChart';
import { ActivityChart, CapitalMix, ChartCard, ChartEmpty, chartColors, formatUsdt, MetricBars, SettlementBridge } from '../components/common/StatisticsCharts';
import { formatNumber, todayBogota } from '../utils/formatters';

function activityByDay(deals: { fecha: string }[], sales: { fecha: string }[]) {
  const today = Date.parse(todayBogota() + 'T00:00:00Z');
  const days = Array.from({ length: 14 }, (_, index) => ({
    date: new Date(today - (13 - index) * 86_400_000).toISOString().slice(0, 10),
    deals: 0,
    sales: 0,
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const [rows, field] of [[deals, 'deals'], [sales, 'sales']] as const) {
    for (const row of rows) {
      const day = byDate.get(normalizeDateToLocalYmd(row.fecha) ?? '');
      if (day) day[field]++;
    }
  }
  return days;
}

export function EstadisticasView() {
  const { metrics, data, loading, snapshot, syncData, syncStatus } = useData();
  const [costCurrency, setCostCurrency] = useState<'COP' | 'USDT'>('COP');
  const activosLiquidosCOP = sumRows(data.activosLiquidos, (account) => account.saldoCop);
  const activosDigitalesUSDT = sumRows(data.activosDigitales, (wallet) => wallet.activo !== 'TEST' ? wallet.saldoUsdt : 0);
  const activosDigitalesCOP = activosDigitalesUSDT * (metrics.rateUsdtCop || 3950);
  const clientsToPay = data.clientes.filter((client) => client.saldoPendienteCOP > 0).length;
  const clientsOwing = data.clientes.filter((client) => client.porCobrarCOP > 0).length;
  const transferFees = (currency: 'COP' | 'USDT') => sumRows(data.transferenciasInternas, (item) => item.divisaCosto === currency ? item.costo : 0);
  const costs = costCurrency === 'COP' ? [
    { label: 'Gastos registrados', value: sumRows(data.gastos, (item) => item.divisa === 'COP' ? item.monto : 0), color: chartColors.violet },
    { label: 'Costos de dispersión', value: metrics.totalCostosDispersionCOP, color: chartColors.sky },
    { label: 'Transferencias internas', value: transferFees('COP'), color: chartColors.lavender },
  ] : [
    { label: 'Comisiones de venta', value: sumRows(data.ventasUsdt, (item) => item.feeUsdt), color: chartColors.violet },
    { label: 'Transferencias internas', value: transferFees('USDT'), color: chartColors.sky },
  ];
  const steps = [
    { key: 'sales', abbreviation: 'Ventas', label: 'Total ventas USDT', value: metrics.totalVentasUSDT, color: chartColors.green, detail: `${formatNumber(data.ventasUsdt.length)} ventas monetizadas` },
    { key: 'liquidity', abbreviation: 'Liquidez', label: 'Liquidez esperada USDT', value: metrics.liquidezEsperada, color: chartColors.sky, detail: 'Saldo de billeteras en COP' },
    { key: 'clients', abbreviation: 'Ingresos', label: 'Total ingresos clientes', value: -(metrics.totalClientesIngresosCOP || metrics.totalNegocioCOP), color: chartColors.lavender, detail: `${formatNumber(data.clientes.length)} clientes · se resta de la liquidación` },
    { key: 'expenses', abbreviation: 'Gastos', label: 'Gastos operativos', value: -(metrics.totalGastosCOP - metrics.interesesSociosCOP), color: chartColors.coral, detail: 'Sin intereses de socios e inversionistas' },
    { key: 'interest', abbreviation: 'Intereses', label: 'Gastos por interés', value: -metrics.interesesSociosCOP, color: chartColors.amber, detail: 'Intereses de socios e inversionistas' },
  ];
  const updatedAt = snapshot.syncedAt && new Date(snapshot.syncedAt).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit',
  });
  const statusLabel = syncStatus === 'error' ? 'Sin conexión' : syncStatus === 'syncing' ? 'Actualizando' : updatedAt ? 'Datos en vivo' : 'Conectando';

  return (
    <div className="space-y-5 motion-safe:animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="stats-icon shrink-0" aria-hidden="true"><i className="ri-dashboard-3-line" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Tesorería y operaciones</p>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">Panorama financiero</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="inline-flex flex-wrap items-center gap-x-2 rounded-full bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            <span className={`size-2 rounded-full ${syncStatus === 'error' ? 'bg-destructive' : 'bg-emerald-500'}`} aria-hidden="true" />
            {statusLabel}{updatedAt && <span className="font-normal">· {updatedAt} Bogotá</span>}
          </span>
          <button type="button" onClick={() => void syncData(true)} disabled={loading || syncStatus === 'syncing'}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-card px-3 text-[11px] font-bold text-[var(--brand-primary)] hover:bg-muted disabled:opacity-50">
            <i className="ri-refresh-line text-sm" aria-hidden="true" /> Actualizar
          </button>
        </div>
      </header>

      <div className="stats-grid grid gap-4">
        <div className="stats-profit min-w-0"><ClientIncomeComparisonChart syncedAt={snapshot.syncedAt} profit={loading ? null : metrics.gananciaEsperada} /></div>
        <div className="stats-settlement min-w-0"><SettlementBridge steps={steps} net={metrics.gananciaEsperada} loading={loading} /></div>
        <div className="stats-capital min-w-0">
          <CapitalMix liquid={activosLiquidosCOP} digital={activosDigitalesCOP} usdt={activosDigitalesUSDT} invested={metrics.capitalInvertidoCOP} loading={loading} />
        </div>

        <div className="stats-secondary min-w-0">
          <ChartCard title="Saldos de clientes" description={`${formatNumber(data.clientes.length)} clientes registrados · COP`} icon="ri-team-line">
            {loading ? <ChartEmpty>Consultando clientes…</ChartEmpty> : <MetricBars rows={[
              { label: 'Por pagar', value: metrics.saldoPendienteClientes, color: chartColors.lavender, detail: `Clientes con saldo por pagar · ${formatNumber(clientsToPay)}` },
              { label: 'Por cobrar', value: metrics.totalPorCobrarClientesCOP, color: chartColors.green, detail: `Clientes con saldo por cobrar · ${formatNumber(clientsOwing)}` },
            ]} />}
          </ChartCard>
        </div>

        <div className="stats-secondary min-w-0">
          <ChartCard title="Costos registrados" description="Comparación por moneda" icon="ri-receipt-line" action={
            <div role="group" aria-label="Moneda de los costos" className="stats-toggle">
              {(['COP', 'USDT'] as const).map((currency) => (
                <button key={currency} type="button" aria-pressed={currency === costCurrency} onClick={() => setCostCurrency(currency)}>{currency}</button>
              ))}
            </div>
          }>
            {loading ? <ChartEmpty>Consultando costos…</ChartEmpty> : <MetricBars key={costCurrency} rows={costs} format={costCurrency === 'USDT' ? formatUsdt : undefined} />}
          </ChartCard>
        </div>

        <div className="stats-secondary min-w-0">
          {loading ? <ChartCard title="Ritmo operativo" description="Últimos 14 días" icon="ri-pulse-line"><ChartEmpty>Consultando actividad…</ChartEmpty></ChartCard> :
            <ActivityChart days={activityByDay(data.negocios, data.ventasUsdt)} totalDeals={data.negocios.length} totalSales={data.ventasUsdt.length} />}
        </div>
      </div>
    </div>
  );
}
