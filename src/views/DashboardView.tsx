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

  const operationalItems = [
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
      detail: 'Saldo por pagar menos saldo por cobrar de clientes',
      icon: 'ri-group-line',
      color: 'text-foreground',
    },
    {
      label: 'Capital invertido',
      value: metrics.capitalInvertidoCOP == null ? '—' : formatCOP(metrics.capitalInvertidoCOP),
      detail: 'Aportes menos retiros de capital (socios e inversionistas)',
      icon: 'ri-coins-line',
      color: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-5 pb-2 motion-safe:animate-[cash-percent-enter_250ms_ease-out] sm:space-y-7">
      <div className="p-4 rounded-2xl bg-card border border-border">
        <h1 className="text-base font-bold text-foreground">Panel de Control</h1>
        <p className="text-xs text-muted-foreground">Liquidación y métricas en tiempo real</p>
      </div>
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
              Activos líquidos + Liquidez USDT − Saldo neto con clientes − Capital invertido = Utilidad Operativa Neta
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

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {operationalItems.map((item) => (
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

        <section aria-label="Resultados de liquidación" className="mt-5 space-y-5 border-t border-border pt-5 sm:mt-6 sm:pt-6">
          {/* Ecuación Principal: 3 Grandes Indicadores */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
            <article className="flex min-w-0 flex-col justify-between rounded-2xl border border-primary/20 bg-primary/10 p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-2xl text-primary">
                  <i className="ri-pie-chart-2-line" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">Generada</span>
              </div>
              <div className="mt-4 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Utilidad Operativa Neta</h4>
                <p className="mt-1 break-words text-2xl font-bold tracking-tight tabular-nums text-primary sm:text-3xl">
                  {formatCOP(metrics.gananciaEsperada)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Lo que produjo el negocio antes de reparto de ganancias a socios
                </p>
              </div>
            </article>

            <article className="flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl text-muted-foreground">
                  <i className="ri-time-line" aria-hidden="true" />
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${metrics.compromisosPendientesCOP > 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
                  {metrics.compromisosPendientesCOP > 0 ? 'Por transferir' : 'Al día'}
                </span>
              </div>
              <div className="mt-4 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">Saldo por liquidar (Intereses + Dividendos)</h4>
                <p className={`mt-1 break-words text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${metrics.compromisosPendientesCOP > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {formatCOP(metrics.compromisosPendientesCOP)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Suma pendiente por transferir a socios (dividendos − adelantos) e inversionistas
                </p>
              </div>
            </article>

            <article className="flex min-w-0 flex-col justify-between rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-card p-5 shadow-sm shadow-primary/5">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-2xl text-primary">
                  <i className="ri-bar-chart-grouped-line" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">Patrimonio libre</span>
              </div>
              <div className="mt-4 min-w-0">
                <h4 className="text-sm font-bold text-foreground">Utilidad Neta Retenida</h4>
                <p className="mt-1 break-words text-2xl font-bold tracking-tight tabular-nums text-primary sm:text-3xl">
                  {formatCOP(metrics.gananciaDespuesDividendosCOP)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Ganancia libre final que permanece en la empresa tras cubrir dividendos
                </p>
              </div>
            </article>
          </div>

          {/* Bloque de Desglose de Claridad Total: Ya Pagado vs Pendiente por Liquidar */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="ri-scales-3-line text-lg text-primary" aria-hidden="true" />
                Desglose de utilidades, adelantos y compromisos con socios e inversionistas
              </h4>
              <span className="text-xs text-muted-foreground">Auditoría de desembolsos vs. saldos pendientes</span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Columna 1: Ya Pagado / Desembolsado */}
              <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <i className="ri-checkbox-circle-line" />
                    Ya pagado / desembolsado
                  </span>
                  <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCOP(metrics.totalPagadoSociosInversionistasCOP)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Dinero que ya salió materialmente de las cuentas bancarias:</p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
                    <div>
                      <p className="font-semibold text-foreground">Adelantos y liquidaciones a socios</p>
                      <p className="text-[11px] text-muted-foreground">Anticipos de utilidades pagados a socios</p>
                    </div>
                    <span className="font-mono font-bold text-foreground">{formatCOP(metrics.distribucionPagadaSociosCOP)}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
                    <div>
                      <p className="font-semibold text-foreground">Intereses pagados a inversionistas</p>
                      <p className="text-[11px] text-muted-foreground">Rendimientos pagados en efectivo / banco</p>
                    </div>
                    <span className="font-mono font-bold text-foreground">{formatCOP(metrics.interesesPagadosCOP)}</span>
                  </div>
                </div>
              </div>

              {/* Columna 2: Pendiente por Liquidar */}
              <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <i className="ri-time-line" />
                    Pendiente por liquidar
                  </span>
                  <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">
                    {formatCOP(metrics.compromisosPendientesCOP)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Dinero aún retenido en bancos pendiente de transferir:</p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
                    <div>
                      <p className="font-semibold text-foreground">Saldo por liquidar a socios</p>
                      <p className="text-[11px] text-muted-foreground">Dividendos decretados menos adelantos previos</p>
                    </div>
                    <span className={`font-mono font-bold ${metrics.saldoPendienteSociosCOP > 0 ? 'text-primary' : 'text-foreground'}`}>
                      {formatCOP(metrics.saldoPendienteSociosCOP)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-card p-2.5 border border-border">
                    <div>
                      <p className="font-semibold text-foreground">Intereses por pagar a inversionistas</p>
                      <p className="text-[11px] text-muted-foreground">Rendimientos acreditados al saldo de contratos</p>
                    </div>
                    <span className={`font-mono font-bold ${metrics.interesesPendientesCOP > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {formatCOP(metrics.interesesPendientesCOP)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila de totales decretados de referencia */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-2.5 text-xs">
              <span className="text-muted-foreground font-medium">Totales decretados de referencia:</span>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Dividendos decretados a socios: </span>
                  <strong className="font-mono text-foreground">{formatCOP(metrics.dividendosSociosCOP)}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Intereses totales de inversionistas: </span>
                  <strong className="font-mono text-foreground">{formatCOP(metrics.interesesSociosCOP)}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
};
