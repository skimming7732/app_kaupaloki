import { useEffect, useId, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCOP, formatDate, todayBogota } from '../../utils/formatters';
import { ChartCard, ChartEmpty, compactCop } from './StatisticsCharts';

type ProfitDay = { fecha: string; ganancia_cop: number };
const DAY_MS = 86_400_000;
const dayTime = (day: string) => Date.parse(day + 'T00:00:00Z');
const firstDay = (days: number) => new Date(dayTime(todayBogota()) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function ProfitHistoryChart({ syncedAt, profit }: { syncedAt?: string; profit: number | null }) {
  const gradientId = useId();
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState<ProfitDay[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let request: AbortController | undefined;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const { data, error } = await supabase.from('historial_ganancia_diaria')
          .select('fecha,ganancia_cop').gte('fecha', firstDay(90)).order('fecha').abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setHistory((data ?? []).map((row) => ({ fecha: row.fecha, ganancia_cop: Number(row.ganancia_cop) })));
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

  const today = todayBogota();
  const startDate = firstDay(days);
  const series = history.filter((row) => row.fecha >= startDate && row.fecha <= today);
  const selected = series.find((row) => row.fecha === selectedDate) ?? series.at(-1);
  const amounts = series.map((row) => row.ganancia_cop);
  const minimum = Math.min(...amounts);
  const maximum = Math.max(...amounts);
  const padding = Math.max((maximum - minimum) * 0.15, 1);
  const bottom = minimum - padding;
  const top = maximum + padding;
  const width = 800;
  const height = 190;
  const x = (day: string) => series.length === 1 ? width / 2
    : 10 + (dayTime(day) - dayTime(series[0].fecha)) / (dayTime(series[series.length - 1].fecha) - dayTime(series[0].fecha)) * (width - 20);
  const y = (amount: number) => 10 + (top - amount) / (top - bottom) * (height - 20);
  const paths: { path: string; firstX: number; lastX: number }[] = [];
  series.forEach((row, index) => {
    const previous = series[index - 1];
    const currentX = x(row.fecha);
    const currentY = y(row.ganancia_cop);
    if (!previous || dayTime(row.fecha) - dayTime(previous.fecha) > DAY_MS) {
      paths.push({ path: `M ${currentX} ${currentY}`, firstX: currentX, lastX: currentX });
      return;
    }
    const middle = (x(previous.fecha) + currentX) / 2;
    const segment = paths[paths.length - 1];
    segment.lastX = currentX;
    segment.path += ` C ${middle} ${y(previous.ganancia_cop)} ${middle} ${currentY} ${currentX} ${currentY}`;
  });
  const tickValues = minimum === maximum ? [minimum] : [maximum, (minimum + maximum) / 2, minimum];
  const dateTicks = [series[0], series.length > 3 ? series[Math.floor(series.length / 2)] : null, series.length > 1 ? series.at(-1) : null];

  return (
    <ChartCard title="Ganancia estimada neta" description="Evolución diaria · COP" icon="ri-line-chart-line" action={
      <div aria-label="Período del historial" role="group" className="stats-toggle">
        {[7, 30, 90].map((range) => (
          <button type="button" key={range} onClick={() => { setDays(range); setSelectedDate(''); }}
            aria-label={`Últimos ${range} días`} aria-pressed={days === range}>{range}D</button>
        ))}
      </div>
    }>
      <div>
        <p className="stats-profit-value break-words font-black tracking-tight tabular-nums">{profit == null ? '…' : formatCOP(profit)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Estimación actual en pesos</p>
      </div>
      {selected ? (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
            <div aria-hidden="true" className="relative grid text-[10px] tabular-nums text-muted-foreground">
              {tickValues.map((amount) => <span key={amount} className="invisible col-start-1 row-start-1">{compactCop(amount)}</span>)}
              {tickValues.map((amount) => (
                <span key={amount} style={{ top: `${y(amount) / height * 100}%` }} className="absolute right-0 -translate-y-1/2 whitespace-nowrap">{compactCop(amount)}</span>
              ))}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
              role="img" aria-label="Evolución diaria de la ganancia en pesos colombianos" className="h-32 w-full overflow-visible text-[var(--brand-primary)]">
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity=".23" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {tickValues.map((amount) => (
                <line key={amount} x1="0" x2={width} y1={y(amount)} y2={y(amount)} stroke="currentColor" opacity=".20" strokeDasharray="3 5" />
              ))}
              {paths.map(({ path, firstX, lastX }) => firstX !== lastX && (
                <g key={firstX}>
                  <path d={`${path} L ${lastX} ${height} L ${firstX} ${height} Z`} fill={`url(#${gradientId})`} />
                  <path d={path} pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" vectorEffect="non-scaling-stroke" className="profit-history-path" />
                </g>
              ))}
              <line x1={x(selected.fecha)} x2={x(selected.fecha)} y1={y(selected.ganancia_cop)} y2={height}
                stroke="currentColor" opacity=".5" strokeDasharray="4 4" />
              {series.map((row) => (
                <line key={row.fecha} x1={x(row.fecha)} x2={x(row.fecha)} y1={y(row.ganancia_cop)} y2={y(row.ganancia_cop) + .1}
                  stroke="currentColor" strokeLinecap="round" strokeWidth={row.fecha === selected.fecha ? 8 : 3}
                  vectorEffect="non-scaling-stroke" opacity={row.fecha === selected.fecha ? 1 : .55} />
              ))}
            </svg>
            <div aria-hidden="true" className={`col-start-2 flex gap-2 text-[10px] text-muted-foreground ${series.length === 1 ? 'justify-center' : 'justify-between'}`}>
              {dateTicks.map((row) => row && <span key={row.fecha}>{formatDate(row.fecha).slice(0, 5)}</span>)}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <select aria-label="Día del historial" value={selected.fecha} onChange={(event) => setSelectedDate(event.target.value)}
              className="min-h-8 rounded-lg bg-muted px-2 text-[11px] text-foreground">
              {series.map((row) => <option key={row.fecha} value={row.fecha}>{dayLabel.format(dayTime(row.fecha))}</option>)}
            </select>
            <p aria-live="polite" className="text-xs font-bold tabular-nums text-[var(--brand-primary)]">{formatCOP(selected.ganancia_cop)}</p>
          </div>
        </>
      ) : <ChartEmpty>{status === 'loading' ? 'Cargando cierres diarios…' : status === 'error' ? 'No se pudo cargar el historial.' : 'Sin cierres en este período.'}</ChartEmpty>}
      {status === 'error' && selected && <p role="status" className="text-[11px] text-destructive">No se pudo actualizar el historial.</p>}
    </ChartCard>
  );
}
