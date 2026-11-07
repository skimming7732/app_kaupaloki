import React, { useState, useEffect } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatUSD, formatRate } from '../utils/formatters';
import { prepareSuccessSound } from '../utils/confirmationSound';

export const DashboardView: React.FC = () => {
  const { metrics, data, updateRateUsdt } = useAirtable();
  const [rateInput, setRateInput] = useState<string>('');
  const [savingRate, setSavingRate] = useState<boolean>(false);
  const [rateSuccess, setRateSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (metrics.rateUsdtCop) {
      setRateInput(String(metrics.rateUsdtCop));
    }
  }, [metrics.rateUsdtCop]);

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRate = Number(rateInput.replace(/,/g, '').trim());
    if (!cleanRate || cleanRate <= 0) return;

    setSavingRate(true);
    setRateSuccess(false);
    const finishSound = prepareSuccessSound();

    try {
      const ok = await updateRateUsdt(cleanRate);
      if (ok) {
        finishSound(true);
        setRateSuccess(true);
        setTimeout(() => setRateSuccess(false), 3000);
      }
    } catch (err) {
      finishSound(false);
      console.error('Error updating rate:', err);
    } finally {
      setSavingRate(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos Líquidos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-bank-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.totalActivosLiquidos)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Caja y bancos disponibles</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos Digitales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-coin-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatUSD(metrics.totalActivosDigitales)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">USDT en wallets</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendiente Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="ri-time-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.saldoPendienteClientes)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Por dispersar a clientes</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Ganancia Estimada</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <i className="ri-line-chart-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.gananciaEsperada)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Margen proyectado</span>
          </div>
        </div>
      </div>

      {/* Manual USDT/COP Rate Widget */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
            <i className="ri-exchange-box-line" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-foreground">Tasa Manual USDT / COP (Liquidación Tesorería)</h4>
              <span className="text-[11px] font-mono bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold">
                ${formatRate(metrics.rateUsdtCop || 3950)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define la tasa de conversión para calcular la Liquidez Esperada en COP ({formatCOP(metrics.liquidezEsperada)}) de los activos digitales ({formatUSD(metrics.totalActivosDigitales)}).
            </p>
          </div>
        </div>

        <form onSubmit={handleRateSubmit} className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="3,950.00"
              className="h-10 w-32 pl-7 pr-3 rounded-xl border border-input bg-background text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingRate || !rateInput}
            className={`h-10 px-4 rounded-xl font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 ${
              rateSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-primary text-primary-foreground shadow-primary/20 hover:opacity-95 disabled:opacity-50'
            }`}
          >
            {savingRate ? (
              <i className="ri-loader-4-line animate-spin" />
            ) : rateSuccess ? (
              <i className="ri-checkbox-circle-fill" />
            ) : (
              <i className="ri-check-line" />
            )}
            <span>{savingRate ? 'Guardando…' : rateSuccess ? 'Guardada' : 'Definir Tasa'}</span>
          </button>
        </form>
      </div>

      {/* Settlement Breakdown Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <i className="ri-calculator-line text-primary" />
            <span>Resumen de Liquidación y Negocios</span>
          </h3>
          <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
            Fórmula: (Ventas USDT + Liquidez) - Ingresos Clientes - Gastos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">-{formatCOP(metrics.totalGastosCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">{data.gastos.length} gastos deducidos</span>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block mb-1">Ganancia Estimada Neta</span>
            <span className="text-xl font-black text-purple-700 dark:text-purple-300">{formatCOP(metrics.gananciaEsperada)}</span>
            <span className="text-[11px] text-purple-600/80 dark:text-purple-400/80 block mt-1">Margen real auditado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
