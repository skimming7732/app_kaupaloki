import React from 'react';

export function matchesDateRange(date: string | undefined, from: string, to: string) {
  if (!from && !to) return true;
  const day = date?.slice(0, 10);
  return !!day && (!from || day >= from) && (!to || day <= to);
}

export function DateRangeFilter({ from, to, setFrom, setTo }: {
  from: string; to: string; setFrom: (value: string) => void; setTo: (value: string) => void;
}) {
  const fieldClass = 'block h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground';
  return <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2">
    <label className="text-xs font-medium text-muted-foreground">Desde
      <input type="date" className={fieldClass} value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
    </label>
    <label className="text-xs font-medium text-muted-foreground">Hasta
      <input type="date" className={fieldClass} value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
    </label>
  </div>;
}
