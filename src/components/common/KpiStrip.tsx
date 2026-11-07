import React from 'react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

type Metric = { label: string; value: React.ReactNode; icon?: string; featured?: boolean };

export const KpiStrip = ({ metrics, label = 'Resumen filtrado' }: { metrics: Metric[]; label?: string }) => (
  <section aria-label={label}
    style={{ '--kpi-columns': Math.max(1, Math.min(6, metrics.length)) } as React.CSSProperties}
    className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(var(--kpi-columns),minmax(0,1fr))]">
    {metrics.map((metric) => (
      <div key={metric.label} className={`min-w-0 rounded-xl border px-4 py-3 ${metric.featured ? 'border-primary/30 bg-primary/10' : 'border-border bg-card'}`}>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {metric.icon && <i className={metric.icon + ' text-primary'} aria-hidden="true" />}
          {metric.label}
        </p>
        <div className="mt-1.5 break-words text-lg font-bold tabular-nums text-foreground">{typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}</div>
      </div>
    ))}
  </section>
);

export const sumRows = <T,>(rows: T[], amount: (row: T) => number) =>
  rows.reduce((total, row) => total + (Number(amount(row)) || 0), 0);

export function totalsByCurrency<T>(rows: T[], code: (row: T) => string, amount: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const currency = code(row);
    if (!currency) continue;
    totals.set(currency, (totals.get(currency) || 0) + (Number(amount(row)) || 0));
  }
  if (!totals.size) return '—';
  if (totals.size === 1) return [...totals].map(([currency, total]) => formatCurrency(total, currency))[0];
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary">Ver {totals.size} divisas</summary>
      <ul className="mt-2 space-y-1 text-xs font-medium">
        {[...totals].sort(([left], [right]) => left.localeCompare(right)).map(([currency, total]) => (
          <li key={currency}>{formatCurrency(total, currency)}</li>
        ))}
      </ul>
    </details>
  );
}
