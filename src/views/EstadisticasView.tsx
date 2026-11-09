import { useData } from '../context/DataContext';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { ProfitHistoryChart } from '../components/common/ProfitHistoryChart';
import { formatCOP, formatNumber } from '../utils/formatters';

const formatUsdt = (amount: number) => formatNumber(amount, 0, 6) + ' USDT';

function estadoCobertura(activos: number, capital: number) {
  const diferencia = Math.round((activos - capital) * 100) / 100;
  if (diferencia < 0) return 'Faltan ' + formatCOP(-diferencia);
  if (diferencia > 0) return 'Sobran ' + formatCOP(diferencia);
  return 'Capital cubierto';
}

export function EstadisticasView() {
  const { metrics, data, loading, snapshot, syncData, syncStatus } = useData();
  const currentRate = metrics.rateUsdtCop || 3950;
  const wallets = data.activosDigitales.filter((wallet) => wallet.activo !== 'TEST');
  const activosLiquidosCOP = sumRows(data.activosLiquidos, (account) => account.saldoCop);
  const activosDigitalesUSDT = sumRows(wallets, (wallet) => wallet.saldoUsdt);
  const activosDigitalesCOP = activosDigitalesUSDT * currentRate;
  const activosContablesCOP = activosLiquidosCOP + activosDigitalesCOP;
  const capitalInvertidoCOP = metrics.capitalInvertidoCOP;

  const estadoCapital = !loading && capitalInvertidoCOP != null ? (
    <>
      <span className="block text-[11px] font-normal text-muted-foreground">Según libros</span>
      <span className="block">{estadoCobertura(activosContablesCOP, capitalInvertidoCOP)}</span>
    </>
  ) : 'Por consultar';
  const gastosTransferencia = (divisa: 'COP' | 'USDT') =>
    sumRows(data.transferenciasInternas, (transferencia) => transferencia.divisaCosto === divisa ? transferencia.costo : 0);
  const indicadores = [
    {
      label: 'Capital invertido',
      featured: true,
      value: (
        <>
          <span className="block">{capitalInvertidoCOP == null ? 'Por consultar' : formatCOP(capitalInvertidoCOP)}</span>
          <span className="block text-[11px] font-normal text-muted-foreground">Aportes menos retiros</span>
          <div className="mt-2 border-t border-border pt-2">
            <span className="block text-[11px] font-normal text-muted-foreground">Activos contables</span>
            <span className="block">{loading ? '…' : formatCOP(activosContablesCOP)}</span>
          </div>
        </>
      ),
    },
    { label: 'Activos líquidos', value: formatCOP(activosLiquidosCOP) },
    {
      label: 'Activos digitales',
      value: <>{formatUsdt(activosDigitalesUSDT)}<span className="mt-1 block text-[11px] font-normal text-muted-foreground">{formatCOP(activosDigitalesCOP)} COP</span></>,
    },
    { label: 'Estado del capital', value: estadoCapital },
    { label: 'Pendiente clientes', value: formatCOP(metrics.saldoPendienteClientes) },
    { label: 'Por cobrar', value: formatCOP(metrics.totalPorCobrarClientesCOP) },
    { label: 'Gastos de dispersión', value: formatCOP(metrics.totalCostosDispersionCOP) },
    { label: 'Gastos ventas USDT', value: formatUsdt(sumRows(data.ventasUsdt, (venta) => venta.feeUsdt)) },
    { label: 'Gastos transacciones int. USDT', value: formatUsdt(gastosTransferencia('USDT')) },
    { label: 'Gastos transacciones int. COP', value: formatCOP(gastosTransferencia('COP')) },
    { label: 'Gastos (COP)', value: formatCOP(sumRows(data.gastos, (gasto) => gasto.divisa === 'COP' ? gasto.monto : 0)) },
    { label: 'Negocios registrados', value: data.negocios.length },
    { label: 'Clientes a quienes debemos', value: data.clientes.filter((cliente) => cliente.saldoPendienteCOP > 0).length },
    { label: 'Clientes que deben', value: data.clientes.filter((cliente) => cliente.porCobrarCOP > 0).length },
  ];

  const settlement = [
    { label: 'Total ingresos clientes', value: metrics.totalClientesIngresosCOP || metrics.totalNegocioCOP, detail: `${formatNumber(data.clientes.length)} clientes`, icon: 'ri-team-line', tone: 'bg-primary/10 text-primary' },
    { label: 'Total ventas USDT', value: metrics.totalVentasUSDT, detail: `${formatNumber(data.ventasUsdt.length)} ventas monetizadas`, icon: 'ri-exchange-dollar-line', tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
    { label: 'Liquidez esperada USDT', value: metrics.liquidezEsperada, detail: 'Saldo de billeteras en COP', icon: 'ri-wallet-3-line', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    { label: 'Gastos operativos', value: -(metrics.totalGastosCOP - metrics.interesesSociosCOP), detail: 'Sin intereses de socios e inversionistas', icon: 'ri-receipt-line', tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
    { label: 'Gastos por interés', value: -metrics.interesesSociosCOP, detail: 'Intereses de socios e inversionistas', icon: 'ri-percent-line', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  ];
  const updatedAt = snapshot.syncedAt && new Date(snapshot.syncedAt).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-6 motion-safe:animate-fade-in">
      <section aria-label="Resumen de liquidación" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Resumen de liquidación</h2>
            <p className="text-xs text-muted-foreground">
              {updatedAt ? `Última actualización ${updatedAt} (Bogotá)` : 'Consultando datos de tesorería'}
            </p>
          </div>
          <button type="button" onClick={() => void syncData(true)} disabled={loading || syncStatus === 'syncing'}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-muted disabled:opacity-50">
            <i className="ri-refresh-line" aria-hidden="true" /> Actualizar
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {settlement.map((item) => (
            <article key={item.label} className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${item.tone}`}>
                <i className={item.icon} aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground">{item.label}</h3>
                <p className="break-words text-lg font-bold tabular-nums">{loading ? '…' : formatCOP(item.value)}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ProfitHistoryChart syncedAt={snapshot.syncedAt} profit={loading ? null : metrics.gananciaEsperada} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Indicadores generales</h2>
        <KpiStrip label="Indicadores generales" metrics={indicadores} />
      </section>
    </div>
  );
}
