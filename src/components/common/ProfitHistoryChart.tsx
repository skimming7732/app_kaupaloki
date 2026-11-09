import { useEffect, useId, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCOP, formatNumber, todayBogota } from '../../utils/formatters';

type ProfitDay = { fecha: string; ganancia_cop: number };
const DAY_MS = 86_400_000;
const dayTime = (day: string) => Date.parse(day + 'T00:00:00Z');
const firstDay = (days: number) => new Date(dayTime(todayBogota()) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const axisValue = (amount: number) => Math.abs(amount) >= 1_000_000
  ? '$' + formatNumber(amount / 1_000_000, 0, 2) + ' M'
  : formatCOP(amount);

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
  const paths: string[] = [];
  series.forEach((row, index) => {
    const previous = series[index - 1];
    const currentX = x(row.fecha);
    const currentY = y(row.ganancia_cop);
    if (!previous || dayTime(row.fecha) - dayTime(previous.fecha) > DAY_MS) {
      paths.push(`M ${currentX} ${currentY}`);
      return;
    }
    const middle = (x(previous.fecha) + currentX) / 2;
    paths[paths.length - 1] += ` C ${middle} ${y(previous.ganancia_cop)} ${middle} ${currentY} ${currentX} ${currentY}`;
  });
  const tickValues = minimum === maximum ? [minimum] : [maximum, (minimum + maximum) / 2, minimum];
  const dateTicks = [series[0], series.length > 3 ? series[Math.floor(series.length / 2)] : null, series.length > 1 ? series.at(-1) : null];

  return (
    <section aria-labelledby="profit-history-title" className="overflow-hidden rounded-3xl border border-primary/15 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <i className="ri-line-chart-line" aria-hidden="true" />
            <h2 id="profit-history-title">Ganancia estimada neta</h2>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight tabular-nums sm:text-4xl">{profit == null ? '…' : formatCOP(profit)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Estimación actual en COP</p>
        </div>
        <div aria-label="Período del historial" role="group" className="flex gap-1 rounded-xl bg-muted p-1">
          {[7, 30, 90].map((range) => (
            <button type="button" key={range} onClick={() => { setDays(range); setSelectedDate(''); }}
              aria-pressed={days === range}
              className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors ${days === range ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {range} días
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Fecha
              <select value={selected.fecha} onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground">
                {series.map((row) => <option key={row.fecha} value={row.fecha}>{dayLabel.format(dayTime(row.fecha))}</option>)}
              </select>
            </label>
            <p aria-live="polite" className="text-sm font-bold tabular-nums text-primary">
              {formatCOP(selected.ganancia_cop)} COP
            </p>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 sm:gap-x-4">
            <div aria-hidden="true" className="relative text-[10px] font-medium tabular-nums text-muted-foreground sm:text-xs">
              <span className="invisible">{axisValue(tickValues.reduce((widest, amount) => axisValue(amount).length > axisValue(widest).length ? amount : widest))}</span>
              {tickValues.map((amount) => (
                <span key={amount} style={{ top: `${y(amount) / height * 100}%` }} className="absolute right-0 -translate-y-1/2 whitespace-nowrap">
                  {axisValue(amount)}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
              role="img" aria-label="Evolución diaria de la ganancia en pesos colombianos"
              className="h-40 w-full overflow-visible text-primary sm:h-56">
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity=".13" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {tickValues.map((amount, index) => (
                <line key={index} x1="0" x2={width} y1={y(amount)} y2={y(amount)} stroke="currentColor" opacity=".14" strokeDasharray="3 5" />
              ))}
              <rect width={width} height={height} fill={`url(#${gradientId})`} opacity=".65" rx="8" />
              {paths.map((path, index) => (
                <path key={index} d={path} pathLength={1} fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" vectorEffect="non-scaling-stroke" className="profit-history-path" />
              ))}
              <line x1={x(selected.fecha)} x2={x(selected.fecha)} y1={y(selected.ganancia_cop)} y2={height}
                stroke="currentColor" opacity=".5" strokeDasharray="4 4" />
              {series.map((row) => (
                <line key={row.fecha} x1={x(row.fecha)} x2={x(row.fecha)} y1={y(row.ganancia_cop)} y2={y(row.ganancia_cop) + .1}
                  stroke="currentColor" strokeLinecap="round" strokeWidth={row.fecha === selected.fecha ? 9 : 4}
                  vectorEffect="non-scaling-stroke" opacity={row.fecha === selected.fecha ? 1 : .65} />
              ))}
            </svg>
            <div aria-hidden="true" className={`col-start-2 flex gap-2 text-[10px] font-medium text-muted-foreground sm:text-xs ${series.length === 1 ? 'justify-center' : 'justify-between'}`}>
              {dateTicks.map((row) => row && <span key={row.fecha}>{dayLabel.format(dayTime(row.fecha))}</span>)}
            </div>
          </div>
        </div>
      )}

      {status === 'error' ? (
        <p role="status" className="mt-4 text-xs text-destructive">No se pudo actualizar el historial. Usa Actualizar para reintentar.</p>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          {status === 'loading' ? 'Cargando historial…' : series.length === 0 ? 'Aún no hay registros en este período.' :
            series.length === 1 ? 'Primer registro disponible en este período. Los cierres diarios se guardan en hora de Bogotá.' :
            'Cierres diarios en hora de Bogotá. El valor de hoy cambia con las operaciones.'}
        </p>
      )}
    </section>
  );
}
