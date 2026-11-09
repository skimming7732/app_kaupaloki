import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP, formatNumber, formatRate } from '../utils/formatters';
import { formatAmountField, parseAmountInput } from '../utils/amountInput';
import { prepareSuccessSound } from '../utils/confirmationSound';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { useTronUsdtBalances } from '../hooks/useTronUsdtBalances';

const formatUsdt = (amount: number) => formatNumber(amount, 0, 6) + ' USDT';

function estadoCobertura(activos: number, capital: number) {
  const diferencia = Math.round((activos - capital) * 100) / 100;
  if (diferencia < 0) return 'Faltan ' + formatCOP(-diferencia);
  if (diferencia > 0) return 'Sobran ' + formatCOP(diferencia);
  return 'Capital cubierto';
}

export const DashboardView: React.FC = () => {
  const { metrics, data, loading, updateRateUsdt } = useData();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState('');
  const currentRate = metrics.rateUsdtCop || 3950;

  const wallets = data.activosDigitales.filter((wallet) => wallet.activo !== 'TEST');
  const { balances: chainBalances } = useTronUsdtBalances(wallets.map((wallet) => String(wallet.wallet || '')));
  const activosLiquidosCOP = sumRows(data.activosLiquidos, (account) => account.saldoCop);
  const activosDigitalesUSDT = sumRows(wallets, (wallet) => wallet.saldoUsdt);
  const activosDigitalesCOP = activosDigitalesUSDT * currentRate;
  const activosContablesCOP = activosLiquidosCOP + activosDigitalesCOP;
  const capitalInvertidoCOP = metrics.capitalInvertidoCOP;

  const balances = [
    ...data.activosLiquidos.map((account) => account.saldoReal),
    ...wallets.map((wallet) => {
      const saldoTron = chainBalances[String(wallet.wallet || '').trim()];
      return saldoTron == null ? null : saldoTron * currentRate;
    }),
  ];
  const verificados = balances.filter((saldo): saldo is number => typeof saldo === 'number' && Number.isFinite(saldo));
  const realVerificado = sumRows(verificados, (saldo) => saldo);
  const verificacionCompleta = verificados.length > 0 && verificados.length === balances.length;
  const estadoCapital = !loading && capitalInvertidoCOP != null ? (
    <>
      <span className="block text-[11px] font-normal text-muted-foreground">Según libros</span>
      <span className="block">{estadoCobertura(activosContablesCOP, capitalInvertidoCOP)}</span>
      <div className="mt-2 border-t border-border pt-2">
        <span className="block text-[11px] font-normal text-muted-foreground">Según saldos reales</span>
        {verificacionCompleta ? (
          <span className="block">{estadoCobertura(realVerificado, capitalInvertidoCOP)}</span>
        ) : (
          <span className="block text-xs font-normal text-muted-foreground">Faltan saldos por verificar</span>
        )}
      </div>
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
            <span className="mt-2 block text-[11px] font-normal text-muted-foreground">Activos reales</span>
            {verificados.length > 0 ? (
              <>
                <span className="block">{formatCOP(realVerificado)}</span>
                {!verificacionCompleta && (
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    Parcial · {verificados.length} de {balances.length} activos verificados
                  </span>
                )}
              </>
            ) : (
              <span className="block text-xs font-normal text-muted-foreground">Por verificar</span>
            )}
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

  const openRateEditor = () => {
    setRateInput(formatRate(currentRate));
    setRateMessage('');
    setEditingRate(true);
  };

  const handleRateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRate) return;
    const rate = parseAmountInput(rateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      setRateMessage('Ingresa una tasa mayor que cero.');
      return;
    }

    setSavingRate(true);
    setRateMessage('');
    const finishSound = prepareSuccessSound();
    try {
      if (!await updateRateUsdt(rate)) {
        setRateMessage('No se pudo guardar la tasa. Inténtalo de nuevo.');
        return;
      }
      finishSound(true);
      setEditingRate(false);
      setRateMessage('Tasa guardada.');
    } catch {
      setRateMessage('No se pudo guardar la tasa. Inténtalo de nuevo.');
    } finally {
      finishSound(false);
      setSavingRate(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section aria-labelledby="treasury-rate-title" className="rounded-xl border border-border bg-card px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 id="treasury-rate-title" className="text-xs font-medium text-muted-foreground">Tasa manual USDT / COP</h2>
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">${formatRate(currentRate)}</p>
          </div>
          {!editingRate && (
            <button type="button" onClick={openRateEditor}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted">
              <i className="ri-edit-line" aria-hidden="true" /> Editar
            </button>
          )}
        </div>

        {editingRate && (
          <form onSubmit={handleRateSubmit} className="mt-2 flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              aria-label="Tasa manual USDT por COP"
              autoFocus
              required
              disabled={savingRate}
              value={rateInput}
              onChange={(event) => {
                const value = formatAmountField(event.currentTarget);
                if (value !== undefined) setRateInput(value);
              }}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 font-mono text-sm focus:border-primary focus:outline-none sm:max-w-36"
            />
            <button type="submit" disabled={savingRate}
              className="h-10 shrink-0 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {savingRate ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" disabled={savingRate} onClick={() => { setEditingRate(false); setRateMessage(''); }}
              className="h-10 shrink-0 rounded-lg px-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">
              Cancelar
            </button>
          </form>
        )}
        <p role="status" className={editingRate && rateMessage ? 'mt-1.5 text-xs text-destructive' : 'sr-only'}>
          {rateMessage}
        </p>
      </section>

      {/* Settlement Breakdown Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <i className="ri-calculator-line text-primary" />
            <span>Resumen de Liquidación y Negocios</span>
          </h3>
          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
            (Ventas USDT + Liquidez) − Ingresos Clientes − Gastos Operativos − Intereses
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Total Ingresos Clientes</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(metrics.totalClientesIngresosCOP || metrics.totalNegocioCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Columna {"{INGRESOS}"} ({data.clientes.length} clientes)</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Total Ventas USDT</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(metrics.totalVentasUSDT)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">{data.ventasUsdt.length} ventas monetizadas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Liquidez Esperada USDT</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(metrics.liquidezEsperada)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Saldo billeteras en COP</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Gastos Operativos</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCOP(-(metrics.totalGastosCOP - metrics.interesesSociosCOP))}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Sin intereses de socios e inversionistas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Gastos por interés</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCOP(-metrics.interesesSociosCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Gasto por intereses de socios e inversionistas</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block mb-1">Ganancia Estimada Neta</span>
            <span className="text-xl font-black text-purple-700 dark:text-purple-300">{formatCOP(metrics.gananciaEsperada)}</span>
            <span className="text-[11px] text-purple-600/80 dark:text-purple-400/80 block mt-1">Margen real auditado</span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-border bg-muted/40">
            <span className="block text-xs text-muted-foreground">Dividendos asignados</span>
            <span className="text-xl font-bold">{formatCOP(metrics.dividendosSociosCOP ? -metrics.dividendosSociosCOP : 0)}</span>
            <span className="block text-[11px] text-muted-foreground">Distribución de la ganancia neta a socios</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/40">
            <span className="block text-xs text-muted-foreground">Ganancia después de dividendos</span>
            <span className="text-xl font-bold">{formatCOP(metrics.gananciaDespuesDividendosCOP)}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-bold">Indicadores generales</h3>
        <KpiStrip label="Indicadores generales" metrics={indicadores} />
      </div>
    </div>
  );
};
