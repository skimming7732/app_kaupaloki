import { useId, useState, type ReactNode } from 'react';
import { formatCOP, formatDate, formatNumber } from '../../utils/formatters';

export const chartColors = {
  violet: 'var(--brand-primary)',
  sky: '#38BDF8',
  green: '#05B88D',
  coral: '#EE5D50',
  amber: '#E79B27',
  lavender: '#9F83FF',
};

export const formatUsdt = (amount: number) => formatNumber(amount, 0, 6) + ' USDT';

export function compactCop(amount: number) {
  const magnitude = Math.abs(amount);
  if (magnitude >= 1e9) return formatCOP(amount / 1e9) + ' mil M';
  if (magnitude >= 1e6) return formatCOP(amount / 1e6) + ' M';
  if (magnitude >= 1e3) return formatCOP(amount / 1e3) + ' mil';
  return formatCOP(amount);
}

export function ChartCard({ title, description, icon, action, children }: {
  title: string;
  description: string;
  icon: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="stats-card flex h-full min-w-0 flex-col gap-4 rounded-[24px] bg-card p-4 sm:p-5">
      <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-extrabold tracking-tight sm:text-base">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action ?? <span className="stats-icon" aria-hidden="true"><i className={icon} /></span>}
      </header>
      {children}
    </section>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return <p className="flex min-h-28 flex-1 items-center justify-center rounded-2xl bg-muted px-4 text-center text-xs text-muted-foreground">{children}</p>;
}

type Bar = { label: string; value: number; color: string; detail?: string };

export function MetricBars({ rows, format = formatCOP }: { rows: Bar[]; format?: (value: number) => string }) {
  const largest = Math.max(1, ...rows.map(({ value }) => Math.abs(value)));
  const hasNegative = rows.some(({ value }) => value < 0);
  const hasPositive = rows.some(({ value }) => value > 0);
  const mixed = hasPositive && hasNegative;
  return (
    <ul className="space-y-3.5">
      {rows.map(({ label, value, detail, color }) => {
        const width = Math.abs(value) / largest * (mixed ? 50 : 100);
        const left = mixed ? (value < 0 ? 50 - width : 50) : (hasNegative ? 100 - width : 0);
        return (
          <li key={label}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <strong className="tabular-nums">{format(value)}</strong>
            </div>
            <div aria-hidden="true" className="relative my-1.5 h-2 overflow-hidden rounded-full bg-muted">
              {mixed && <span className="absolute inset-y-0 left-1/2 border-l border-[var(--text-muted)]" />}
              <span className="stats-bar absolute inset-y-0 rounded-full" style={{ left: left + '%', width: width + '%', backgroundColor: color }} />
            </div>
            {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}

type Contribution = Bar & { key: string; abbreviation: string };

export function SettlementBridge({ steps, net, loading }: { steps: Contribution[]; net: number; loading: boolean }) {
  const [selection, setSelection] = useState('net');
  const items = [...steps, { key: 'net', abbreviation: 'Neto', label: 'Ganancia estimada neta', value: net, color: chartColors.violet }];
  let running = 0;
  const columns = items.map((step) => {
    const start = step.key === 'net' ? 0 : running;
    const end = start + step.value;
    running = end;
    return { ...step, start, end };
  });
  const selected = columns.find((step) => step.key === selection) ?? columns[columns.length - 1];
  const min = Math.min(0, ...columns.flatMap((step) => [step.start, step.end]));
  const max = Math.max(0, ...columns.flatMap((step) => [step.start, step.end]));
  const plotHeight = 116;
  const y = (value: number) => 7 + (max - value) / Math.max(1, max - min) * plotHeight;
  const plotWidth = 356;
  const columnSpacing = plotWidth / columns.length;
  const barWidth = Math.min(30, columnSpacing * 0.54);
  const x = (index: number) => (index + 0.5) * columnSpacing;

  return (
    <ChartCard title="Puente de liquidación" description="Cómo se forma el resultado neto" icon="ri-bar-chart-grouped-line">
      {loading ? <ChartEmpty>Consultando liquidación…</ChartEmpty> : (
        <>
          <div aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-x-2 rounded-xl bg-muted px-3 py-2 text-xs">
            <div>
              <span className="font-semibold">{selected.label}</span>
              {'detail' in selected && selected.detail && <span className="block text-[10px] text-muted-foreground">{selected.detail}</span>}
            </div>
            <strong className="tabular-nums" style={{ color: selected.color }}>{formatCOP(selected.value)}</strong>
          </div>
          <svg viewBox={`0 0 ${plotWidth} 132`} preserveAspectRatio="none" className="h-32 w-full text-muted-foreground"
            role="img" aria-label="Cascada de activos líquidos, liquidez USDT, saldo neto con clientes, gastos, intereses y capital hasta la ganancia neta">
            <line x1="0" x2={plotWidth} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity=".45" strokeDasharray="3 4" />
            {columns.map((step, index) => (
              <g key={step.key} opacity={step.key === selected.key ? 1 : 0.72}>
                {index < steps.length - 1 && <line x1={x(index) + barWidth / 2} x2={x(index + 1) - barWidth / 2} y1={y(step.end)} y2={y(step.end)} stroke="currentColor" strokeOpacity=".55" strokeDasharray="3 3" />}
                <rect className="stats-column" x={x(index) - barWidth / 2} y={Math.min(y(step.start), y(step.end))}
                  width={barWidth} height={Math.max(1, Math.abs(y(step.start) - y(step.end)))} rx="3" fill={step.color} />
              </g>
            ))}
          </svg>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Detalle de liquidación">
            {columns.map((step) => (
              <button key={step.key} type="button" onClick={() => setSelection(step.key)} aria-pressed={selected.key === step.key}
                aria-label={step.label} className="flex min-h-8 items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted aria-pressed:bg-muted aria-pressed:text-foreground">
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: step.color }} aria-hidden="true" />
                {step.abbreviation}
              </button>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
}

export function CapitalMix({ liquid, digital, usdt, invested, loading }: {
  liquid: number; digital: number; usdt: number; invested: number | null; loading: boolean;
}) {
  const [selected, setSelected] = useState<'all' | 'liquid' | 'digital'>('all');
  const total = liquid + digital;
  const ratio = total > 0 && liquid >= 0 && digital >= 0 ? liquid / total : null;
  const rows = [
    { id: 'liquid' as const, label: 'Líquidos', value: liquid, color: chartColors.violet },
    { id: 'digital' as const, label: 'Digitales', value: digital, color: chartColors.sky, detail: formatUsdt(usdt) },
  ];
  const focus = rows.find((row) => row.id === selected);
  const gap = invested == null ? null : Math.round((total - invested) * 100) / 100;
  const coverage = gap === null ? 'Por consultar' : gap === 0 ? 'Capital cubierto' : (gap > 0 ? 'Sobran ' : 'Faltan ') + formatCOP(Math.abs(gap));

  return (
    <ChartCard title="Capital y activos" description="Composición contable en COP" icon="ri-pie-chart-2-line">
      {loading ? <ChartEmpty>Consultando saldos…</ChartEmpty> : (
        <>
          {ratio == null ? <MetricBars rows={rows} /> : (
            <>
              <div className="relative mx-auto grid size-32 place-items-center sm:size-36">
                <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="51" fill="none" stroke="var(--bg-card-secondary)" strokeWidth="11" />
                  {rows.map((row, index) => {
                    const share = index === 0 ? ratio : 1 - ratio;
                    return <circle key={row.id} cx="60" cy="60" r="51" fill="none" stroke={row.color} strokeWidth="11" pathLength="1"
                      strokeDasharray={share + ' 1'} strokeDashoffset={index === 0 ? 0 : -ratio}
                      opacity={selected === 'all' || selected === row.id ? 1 : 0.25} className="transition-opacity" />;
                  })}
                </svg>
                <div className="z-10 px-3 text-center">
                  <p className="text-[10px] font-semibold text-muted-foreground">{focus?.label ?? 'Activos totales'}</p>
                  <p className="text-sm font-black tabular-nums" aria-live="polite" title={formatCOP(focus?.value ?? total)}>{compactCop(focus?.value ?? total)}</p>
                </div>
              </div>
              <div className="space-y-1" role="group" aria-label="Composición de activos">
                {rows.map((row) => (
                  <button key={row.id} type="button" aria-pressed={selected === row.id}
                    onClick={() => setSelected(selected === row.id ? 'all' : row.id)}
                    className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-muted aria-pressed:bg-muted">
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    <span>{row.label}</span>
                    <strong className="ml-auto tabular-nums">{formatCOP(row.value)}</strong>
                    {row.detail && <span className="w-full pl-4 text-[10px] text-muted-foreground">{row.detail}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="mt-auto border-t border-border pt-2 text-[11px]">
            <p className="flex flex-wrap justify-between gap-x-2"><span className="text-muted-foreground">Capital invertido</span><strong>{invested == null ? '—' : formatCOP(invested)}</strong></p>
            <p className="mt-1 font-semibold text-[var(--brand-primary)]">{coverage}</p>
          </div>
        </>
      )}
    </ChartCard>
  );
}

export function ActivityChart({ days, totalDeals, totalSales }: {
  days: { date: string; deals: number; sales: number }[];
  totalDeals: number;
  totalSales: number;
}) {
  const [date, setDate] = useState('');
  const active = days.find((day) => day.date === date) ?? days[days.length - 1];
  const ceiling = Math.max(1, ...days.map((day) => Math.max(day.deals, day.sales)));
  const noActivity = days.every((day) => day.deals === 0 && day.sales === 0);

  return (
    <ChartCard title="Ritmo operativo" description="Negocios y ventas USDT · últimos 14 días" icon="ri-pulse-line">
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-lg font-black tabular-nums">{formatNumber(totalDeals)}</p><p className="text-[11px] text-muted-foreground">Negocios registrados</p></div>
        <div><p className="text-lg font-black tabular-nums">{formatNumber(totalSales)}</p><p className="text-[11px] text-muted-foreground">Ventas monetizadas</p></div>
      </div>
      {noActivity ? <ChartEmpty>Sin operaciones registradas en estos 14 días.</ChartEmpty> : (
        <>
          <div className="relative grid h-24 grid-cols-[repeat(14,minmax(0,1fr))] gap-px border-b border-border" role="group" aria-label="Actividad diaria">
            <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" aria-hidden="true" />
            {days.map((day) => (
              <button key={day.date} type="button" aria-pressed={active.date === day.date}
                aria-label={`${formatDate(day.date)}, negocios: ${day.deals}, ventas: ${day.sales}`} onClick={() => setDate(day.date)}
                className="relative flex min-w-0 items-end justify-center gap-px rounded-t-sm px-px hover:bg-muted aria-pressed:bg-muted">
                <span className="stats-column w-2 rounded-t-sm" style={{ height: day.deals / ceiling * 100 + '%', background: chartColors.violet }} />
                <span className="stats-column w-2 rounded-t-sm" style={{ height: day.sales / ceiling * 100 + '%', background: chartColors.sky }} />
              </button>
            ))}
          </div>
          <div className="-mt-3 flex justify-between text-[10px] text-muted-foreground" aria-hidden="true">
            <span>{formatDate(days[0].date).slice(0, 5)}</span><span>{formatDate(days[days.length - 1].date).slice(0, 5)}</span>
          </div>
          <p aria-live="polite" className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            <strong>{formatDate(active.date)}</strong>
            <span><i aria-hidden="true" className="mr-1 inline-block size-2 rounded-full bg-[var(--brand-primary)]" />Negocios: {formatNumber(active.deals)}</span>
            <span><i aria-hidden="true" className="mr-1 inline-block size-2 rounded-full bg-sky-400" />Ventas: {formatNumber(active.sales)}</span>
          </p>
        </>
      )}
    </ChartCard>
  );
}
