import { useEffect, useId, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCOP, formatDate } from '../../utils/formatters';
import { ChartCard, ChartEmpty, chartColors, compactCop } from './StatisticsCharts';

type IncomeDay = { fecha: string; monto_cop: number };

export function ClientIncomeComparisonChart({ syncedAt, profit }: { syncedAt?: string; profit: number | null }) {
  const gradientId = useId();
  const [days, setDays] = useState<IncomeDay[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let request: AbortController | undefined;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const { data, error } = await supabase.rpc('ingresos_clientes_30_dias').abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setDays((data ?? []).map((row) => ({ fecha: row.fecha, monto_cop: Number(row.monto_cop) })));
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(onVisible, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      request?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncedAt]);

  let total = 0;
  const series = days.map((day) => {
    total += day.monto_cop;
    return { ...day, total };
  });
  const selected = series.findIndex((day) => day.fecha === selectedDate);
  const activeIndex = selected < 0 ? series.length - 1 : selected;
  const active = series[activeIndex];
  const width = 360;
  const height = 140;
  const values = [0, profit ?? 0, ...series.map((day) => day.total)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const x = (index: number) => 4 + index * (width - 8) / Math.max(1, series.length - 1);
  const y = (value: number) => 8 + (max - value) * (height - 16) / span;
  const ticks = [...new Set([max, 0, min])];
  const path = series.map((day, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(day.total)}`).join(' ');

  return (
    <ChartCard title="Ingresos vs. ganancia neta" description="Últimos 30 días hasta hoy · COP" icon="ri-line-chart-line">
      <div className="grid gap-2 min-[1280px]:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Ingresos de clientes · 30 días</p>
          <p className="break-words text-base font-black tabular-nums text-[var(--brand-primary)]" title={days.length ? formatCOP(total) : undefined}>
            {days.length ? formatCOP(total) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Ganancia estimada neta · hoy</p>
          <p className="break-words text-base font-black tabular-nums" title={profit == null ? undefined : formatCOP(profit)}>
            {profit == null ? '—' : formatCOP(profit)}
          </p>
        </div>
      </div>

      {active ? (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
            <div aria-hidden="true" className="relative grid text-[10px] tabular-nums text-muted-foreground">
              {ticks.map((value) => <span key={value} className="invisible col-start-1 row-start-1">{compactCop(value)}</span>)}
              {ticks.map((value) => (
                <span key={value} style={{ top: `${y(value) / height * 100}%` }} className="absolute right-0 -translate-y-1/2 whitespace-nowrap">
                  {compactCop(value)}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-32 w-full overflow-visible text-[var(--brand-primary)]"
              role="img" aria-label="Ingresos de clientes acumulados en 30 días y línea de referencia de ganancia neta estimada de hoy">
              <defs>
                <linearGradient id={gradientId} x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity=".02" />
                </linearGradient>
              </defs>
              {ticks.map((value) => (
                <line key={value} x1="0" x2={width} y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".20" strokeDasharray="3 5" />
              ))}
              <path d={`${path} L ${x(series.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill={`url(#${gradientId})`} />
              <path d={path} pathLength="1" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="client-income-path" />
              {profit != null && (
                <line x1={0} x2={width} y1={y(profit)} y2={y(profit)} stroke={chartColors.coral} strokeWidth="2"
                  strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              )}
              <line x1={x(activeIndex)} x2={x(activeIndex)} y1={y(active.total)} y2={y(0)} stroke="currentColor" opacity=".45" strokeDasharray="4 4" />
              <line x1={x(activeIndex)} x2={x(activeIndex)} y1={y(active.total)} y2={y(active.total) + .01}
                stroke="currentColor" strokeLinecap="round" strokeWidth="7" vectorEffect="non-scaling-stroke" />
            </svg>
            <div aria-hidden="true" className="col-start-2 flex justify-between text-[10px] text-muted-foreground">
              {[0, Math.floor(series.length / 2), series.length - 1].map((index) => (
                <span key={index}>{formatDate(series[index].fecha).slice(0, 5)}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span><span aria-hidden="true" className="mr-1 inline-block w-3 border-t-2 align-middle border-[var(--brand-primary)]" />Ingresos acumulados</span>
            <span><span aria-hidden="true" className="mr-1 inline-block w-3 border-t-2 border-dashed border-destructive align-middle" />Referencia de hoy</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <select aria-label="Día del período" value={active.fecha} onChange={(event) => setSelectedDate(event.target.value)}
              className="min-h-8 rounded-lg bg-muted px-2 text-[11px] text-foreground">
              {series.map((day) => <option key={day.fecha} value={day.fecha}>{formatDate(day.fecha)}</option>)}
            </select>
            <div aria-live="polite" className="text-[11px] tabular-nums">
              <p><span className="text-muted-foreground">Ese día </span><strong>{formatCOP(active.monto_cop)}</strong></p>
              <p><span className="text-muted-foreground">Acumulado </span><strong>{formatCOP(active.total)}</strong></p>
            </div>
          </div>
        </>
      ) : <ChartEmpty>{status === 'loading' ? 'Consultando ingresos…' : status === 'error' ? 'No se pudieron cargar los ingresos.' : 'Sin datos para este período.'}</ChartEmpty>}
      {status === 'error' && active && <p role="status" className="text-[11px] text-destructive">Se muestran los últimos ingresos consultados.</p>}
    </ChartCard>
  );
}
