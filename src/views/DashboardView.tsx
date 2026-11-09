import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP, formatNumber, formatRate } from '../utils/formatters';
import { formatAmountField, parseAmountInput } from '../utils/amountInput';
import { prepareSuccessSound } from '../utils/confirmationSound';

export const DashboardView: React.FC = () => {
  const { metrics, data, updateRateUsdt } = useData();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState('');
  const currentRate = metrics.rateUsdtCop || 3950;
  const wallets = data.activosDigitales.filter((wallet) => wallet.activo != null && wallet.activo !== 'TEST');

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
            Ventas USDT + Activos líquidos + Liquidez USDT − Saldo neto con clientes − Gastos operativos − Intereses − Capital invertido
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Total Ventas USDT</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(metrics.totalVentasUSDT)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">{data.ventasUsdt.length} ventas monetizadas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Liquidez de activos líquidos</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(metrics.totalActivosLiquidos)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Saldos contables de cuentas y caja en COP</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Liquidez esperada de USDT</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCOP(metrics.liquidezEsperada)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">{formatNumber(metrics.totalActivosDigitales, 0, 6)} USDT × {formatRate(currentRate)} COP</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Saldo neto con clientes</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(metrics.saldoNetoClientesCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Saldo por pagar menos saldo por cobrar</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Gastos Operativos</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCOP(metrics.totalGastosCOP - metrics.interesesSociosCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Sin intereses de socios e inversionistas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Gastos por interés</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatCOP(metrics.interesesSociosCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Gasto por intereses de socios e inversionistas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Capital invertido</span>
            <span className="text-xl font-bold text-foreground">{metrics.capitalInvertidoCOP == null ? '—' : formatCOP(metrics.capitalInvertidoCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Aportes menos retiros de Capital</span>
          </div>
        </div>
        <section aria-labelledby="liquidity-breakdown-title" className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <h4 id="liquidity-breakdown-title" className="text-sm font-bold">Composición de la liquidez USDT</h4>
            <p className="text-xs text-muted-foreground">Aporte de cada billetera USDT al total, convertido con la tasa manual.</p>
          </div>
          {wallets.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <i className="ri-wallet-3-line" aria-hidden="true" />
                    <span className="break-words">{wallet.activo}</span>
                  </p>
                  <p className="mt-1 break-words text-base font-bold tabular-nums">{formatCOP(wallet.saldoUsdt * currentRate)}</p>
                  <p className="text-[11px] text-muted-foreground">{formatNumber(wallet.saldoUsdt, 0, 6)} USDT</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Sin billeteras incluidas en la liquidación.</p>}
        </section>
        <section aria-label="Resultados de liquidación" className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold block mb-1">Ganancia Estimada Neta</span>
            <span className="text-xl font-black text-purple-700 dark:text-purple-300">{formatCOP(metrics.gananciaEsperada)}</span>
            <span className="text-[11px] text-purple-600/80 dark:text-purple-400/80 block mt-1">Resultado de la fórmula en COP</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/40">
            <span className="block text-xs text-muted-foreground">Dividendos asignados</span>
            <span className="text-xl font-bold">{formatCOP(metrics.dividendosSociosCOP ? -metrics.dividendosSociosCOP : 0)}</span>
            <span className="block text-[11px] text-muted-foreground">Distribución de la ganancia neta a socios</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/40">
            <span className="block text-xs text-muted-foreground">Ganancia después de dividendos</span>
            <span className="text-xl font-bold">{formatCOP(metrics.gananciaDespuesDividendosCOP)}</span>
          </div>
        </section>
      </div>
    </div>
  );
};
