import React from 'react';

/**
 * Normalizes any date string (ISO, UTC, timestamp, YYYY-MM-DD, DD/MM/YYYY)
 * to local calendar YYYY-MM-DD, matching exactly what the user sees rendered.
 */
export function normalizeDateToLocalYmd(val: string | number | Date | undefined | null): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Plain YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // DD/MM/YYYY or D/M/YYYY
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

/**
 * Checks if a given date falls within the selected [from, to] range inclusive.
 */
export function matchesDateRange(date: string | number | Date | undefined | null, from: string, to: string): boolean {
  if (!from && !to) return true;
  const day = normalizeDateToLocalYmd(date);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

const getTodayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDaysAgoYmd = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonthStartYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

export function DateRangeFilter({
  from,
  to,
  setFrom,
  setTo,
  className = 'sm:col-span-2',
}: {
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  className?: string;
}) {
  const hasFilter = Boolean(from || to);

  const applyPreset = (type: 'hoy' | '7d' | 'mes') => {
    const today = getTodayYmd();
    if (type === 'hoy') {
      setFrom(today);
      setTo(today);
    } else if (type === '7d') {
      setFrom(getDaysAgoYmd(7));
      setTo(today);
    } else if (type === 'mes') {
      setFrom(getMonthStartYmd());
      setTo(today);
    }
  };

  const handleClear = () => {
    setFrom('');
    setTo('');
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <i className="ri-calendar-line text-xs" />
          <span>Rango de fechas</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyPreset('hoy')}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Filtrar operaciones de hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => applyPreset('7d')}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Filtrar últimos 7 días"
          >
            7D
          </button>
          <button
            type="button"
            onClick={() => applyPreset('mes')}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Filtrar este mes"
          >
            Mes
          </button>
          {hasFilter && (
            <button
              type="button"
              onClick={handleClear}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-0.5"
              title="Quitar filtro de fechas"
            >
              <i className="ri-close-line" />
              <span>Borrar</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="relative">
          <input
            type="date"
            aria-label="Fecha desde"
            className="block h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="relative">
          <input
            type="date"
            aria-label="Fecha hasta"
            className="block h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
