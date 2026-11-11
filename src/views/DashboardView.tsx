import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatCOP, formatNumber, formatRate } from '../utils/formatters';
import { formatAmountField, parseAmountInput } from '../utils/amountInput';
import { prepareSuccessSound } from '../utils/confirmationSound';

export const DashboardView: React.FC = () => {
  const { metrics, updateRateUsdt } = useData();
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateMessage, setRateMessage] = useState('');
  const currentRate = metrics.rateUsdtCop || 3950;

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

  const settlementItems = [
    {
      label: 'Liquidez de activos líquidos',
      value: formatCOP(metrics.totalActivosLiquidos),
      detail: 'Saldos contables de cuentas y caja en COP',
      icon: 'ri-wallet-3-line',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Liquidez esperada de USDT',
      value: formatCOP(metrics.liquidezEsperada),
      detail: `${formatNumber(metrics.totalActivosDigitales, 0, 6)} USDT × ${formatRate(currentRate)} COP`,
      icon: 'ri-stack-line',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Adelantos pagados a socios',
      value: formatCOP(metrics.distribucionPagadaSociosCOP),
      detail: 'Anticipos a cuenta de utilidades salidos de banco',
      icon: 'ri-hand-coin-line',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Saldo neto con clientes',
      value: formatCOP(metrics.saldoNetoClientesCOP),
      detail: 'Saldo por pagar menos saldo por cobrar',
      icon: 'ri-group-line',
      color: 'text-foreground',
    },
    {
      label: 'Intereses a inversionistas',
      value: formatCOP(metrics.interesesSociosCOP),
      detail: metrics.interesesPendientesCOP > 0 ? `Total intereses (${formatCOP(metrics.interesesPendientesCOP)} pendientes)` : 'Intereses de contratos liquidados',
      icon: 'ri-percent-line',
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Capital invertido',
      value: metrics.capitalInvertidoCOP == null ? '—' : formatCOP(metrics.capitalInvertidoCOP),
      detail: 'Aportes menos retiros de Capital',
      icon: 'ri-coins-line',
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-5 pb-2 motion-safe:animate-[cash-percent-enter_250ms_ease-out] sm:space-y-7">
      <section aria-labelledby="treasury-rate-title"
        className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm shadow-primary/5 sm:rounded-3xl sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap lg:gap-6">
          <div className="min-w-0 flex-1 lg:w-52 lg:flex-none lg:border-r lg:border-border lg:pr-6">
            <h2 id="treasury-rate-title" className="text-xs font-medium text-muted-foreground sm:text-sm">Tasa manual USDT / COP</h2>
            <p className="mt-1 text-lg font-bold tracking-tight tabular-nums text-foreground sm:text-xl">
              ${formatRate(currentRate)}
            </p>
          </div>
          {!editingRate && (
            <button type="button" onClick={openRateEditor}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary lg:order-last">
              <i className="ri-edit-line text-lg text-primary" aria-hidden="true" /> Editar
            </button>
          )}
          <div className="flex w-full min-w-0 flex-col gap-2 border-t border-border pt-3 lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-4 lg:border-0 lg:pt-0">
            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-primary">
              <i className="ri-calculator-line text-xl" aria-hidden="true" />
              Fórmula de la liquidación
            </span>
            <p className="min-w-0 rounded-xl bg-primary/5 px-3 py-2.5 text-xs font-medium leading-relaxed text-foreground sm:px-4 sm:text-sm lg:rounded-2xl">
              Activos líquidos + Liquidez USDT + Adelantos a socios − Saldo neto con clientes − Intereses pendientes − Capital invertido
            </p>
          </div>
        </div>

        {editingRate && (
          <form onSubmit={handleRateSubmit} className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
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
              className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm tabular-nums text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:max-w-52"
            />
            <button type="submit" disabled={savingRate}
              className="h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {savingRate ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" disabled={savingRate} onClick={() => { setEditingRate(false); setRateMessage(''); }}
              className="h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">
              Cancelar
            </button>
          </form>
        )}
        <p role="status" className={editingRate && rateMessage ? 'mt-2 text-xs text-destructive' : 'sr-only'}>
          {rateMessage}
        </p>
      </section>

      <section aria-labelledby="settlement-title"
        className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm shadow-primary/5 sm:rounded-3xl sm:p-6">
        <header className="mb-5 flex items-center gap-3 sm:mb-6">
          <i className="ri-calculator-line shrink-0 text-2xl text-primary sm:text-3xl" aria-hidden="true" />
          <h3 id="settlement-title" className="text-lg font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
            Resumen de Liquidación y Negocios
          </h3>
        </header>

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {settlementItems.map((item) => (
            <article key={item.label}
              className="flex min-w-0 flex-col rounded-2xl border border-border bg-gradient-to-br from-background/70 to-card p-4 transition-colors hover:border-primary/30 sm:p-5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-xl text-primary">
                  <i className={item.icon} aria-hidden="true" />
                </span>
                <h4 className="my-auto text-sm font-semibold leading-snug text-foreground">{item.label}</h4>
              </div>
              <p className={`mt-5 break-words text-[clamp(1.15rem,1.65vw,1.85rem)] font-bold leading-tight tracking-tight tabular-nums ${item.color}`}>
                {item.value}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.detail}</p>
            </article>
          ))}
        </div>

        <section aria-label="Resultados de liquidación" className="mt-5 space-y-4 border-t border-border pt-5 sm:mt-6 sm:pt-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <article className="flex min-w-0 items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/10 p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl text-primary">
                <i className="ri-pie-chart-2-line" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">Ganancia Estimada Neta</h4>
                <p className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight tabular-nums text-primary sm:text-3xl">
                  {formatCOP(metrics.gananciaEsperada)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">Utilidad operativa generada por la empresa antes de dividendos a socios</p>
              </div>
            </article>

            <article className="flex min-w-0 items-start gap-3.5 rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-card p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-2xl text-primary">
                <i className="ri-bar-chart-grouped-line" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-foreground">Ganancia retenida tras dividendos</h4>
                <p className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight tabular-nums text-primary sm:text-3xl">
                  {formatCOP(metrics.gananciaDespuesDividendosCOP)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">Utilidad final que permanece en la empresa tras cubrir todos los dividendos</p>
              </div>
            </article>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <i className="ri-user-shared-line text-sm text-primary" aria-hidden="true" />
              Desglose de utilidades, adelantos y compromisos con socios e inversionistas
            </h5>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Adelantos entregados</span>
                  <i className="ri-hand-coin-line text-amber-500" aria-hidden="true" />
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCOP(metrics.adelantosSociosCOP)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Anticipos de utilidades a socios</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Intereses a inversionistas</span>
                  <i className="ri-percent-line text-indigo-500" aria-hidden="true" />
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCOP(metrics.interesesSociosCOP)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{metrics.interesesPendientesCOP > 0 ? `${formatCOP(metrics.interesesPendientesCOP)} pendientes` : '100% liquidados'}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Dividendos asignados</span>
                  <i className="ri-pie-chart-line text-teal-500" aria-hidden="true" />
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{formatCOP(metrics.dividendosSociosCOP ? -metrics.dividendosSociosCOP : 0)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Decretados oficialmente a socios</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Saldo por liquidar a socios</span>
                  <i className="ri-wallet-3-line text-primary" aria-hidden="true" />
                </div>
                <p className={`mt-1 text-lg font-bold tabular-nums ${metrics.saldoPendienteSociosCOP > 0 ? 'text-primary' : 'text-foreground'}`}>
                  {formatCOP(metrics.saldoPendienteSociosCOP)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Pendiente de pago (Dividendos − Adelantos)</p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};
