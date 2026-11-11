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
      label: 'Saldo neto con clientes',
      value: formatCOP(metrics.saldoNetoClientesCOP),
      detail: 'Saldo por pagar menos saldo por cobrar',
      icon: 'ri-group-line',
      color: 'text-foreground',
    },
    {
      label: 'Gastos por interés',
      value: formatCOP(metrics.interesesSociosCOP),
      detail: 'Gasto por intereses de socios e inversionistas',
      icon: 'ri-percent-line',
      color: 'text-rose-600 dark:text-rose-400',
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
              Activos líquidos + Liquidez USDT − Saldo neto con clientes − Intereses − Capital invertido
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

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

        <section aria-label="Resultados de liquidación"
          className="mt-5 grid grid-cols-1 gap-3 border-t border-border pt-5 lg:grid-cols-[1fr_1fr_1.2fr] sm:mt-6 sm:pt-6">
          <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-primary/10 bg-primary/10 p-4 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary">
              <i className="ri-pie-chart-2-line" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground">Ganancia Estimada Neta</h4>
              <p className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight tabular-nums text-primary xl:text-3xl">
                {formatCOP(metrics.gananciaEsperada)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">Resultado de la fórmula en COP</p>
            </div>
          </article>
          <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-gradient-to-br from-primary/[0.025] to-card p-4 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-2xl text-primary">
              <i className="ri-group-line" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground">Dividendos asignados</h4>
              <p className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight tabular-nums text-foreground xl:text-3xl">
                {formatCOP(metrics.dividendosSociosCOP ? -metrics.dividendosSociosCOP : 0)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">Distribución de la ganancia neta a socios</p>
            </div>
          </article>
          <article className="flex min-w-0 items-start gap-3 rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/10 to-card p-4 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl text-primary">
              <i className="ri-bar-chart-grouped-line" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-foreground">Ganancia después de dividendos</h4>
              <p className="mt-2 break-words text-[clamp(1.5rem,2.4vw,2.6rem)] font-bold leading-tight tracking-tight tabular-nums text-primary">
                {formatCOP(metrics.gananciaDespuesDividendosCOP)}
              </p>
            </div>
          </article>
        </section>
      </section>
    </div>
  );
};
