import React, { useState } from 'react';
import { DateRangeFilter, matchesDateRange } from './DateRangeFilter';

export const TABLE_PAGE_SIZE = 50;

export function PaginatedRows<T>({ rows, children, columns, getDate, resetKey, pageSize = TABLE_PAGE_SIZE, stackedMobile = false }: {
  rows: readonly T[];
  children: (row: T, index: number) => React.ReactNode;
  columns: number;
  pageSize?: number;
  stackedMobile?: boolean;
  resetKey?: string;
  getDate?: (row: T) => string | undefined;
}) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const pageKey = resetKey ?? rows;
  const [previousPageKey, setPreviousPageKey] = useState(pageKey);
  if (pageKey !== previousPageKey) {
    setPreviousPageKey(pageKey);
    setPage(1);
  }
  const filtered = getDate ? rows.filter((row) => matchesDateRange(getDate(row), from, to)) : rows;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const offset = (current - 1) * pageSize;

  const pageNumbers = [...new Set([1, current - 1, current, current + 1, totalPages])]
    .filter((number) => number >= 1 && number <= totalPages)
    .sort((left, right) => left - right);
  const buttonClass = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border px-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

  return <>
    {getDate && <tr><td colSpan={columns} className="px-4 py-2">
      <div className="max-w-sm"><DateRangeFilter from={from} to={to}
        setFrom={(value) => { setFrom(value); setPage(1); }}
        setTo={(value) => { setTo(value); setPage(1); }} /></div>
    </td></tr>}
    {filtered.length === 0 && rows.length > 0 && <tr><td colSpan={columns} className="px-4 py-6 text-center text-muted-foreground">Sin resultados para estas fechas.</td></tr>}
    {filtered.slice(offset, offset + pageSize).map((row, index) => children(row, offset + index))}
    {filtered.length > 0 && (
      <tr className={stackedMobile ? 'block lg:table-row' : undefined}><td colSpan={columns} className={'border-t border-border bg-card px-3 py-3 ' + (stackedMobile ? 'block lg:table-cell' : '')}>
        <nav aria-label="Paginación de la tabla" className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground tabular-nums">
            {offset + 1}–{Math.min(offset + pageSize, filtered.length)} de {filtered.length} · {pageSize} por página
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className={buttonClass} aria-label="Primera página" onClick={() => setPage(1)} disabled={current === 1}>
              <i className="ri-skip-back-line" aria-hidden="true" />
            </button>
            <button type="button" className={buttonClass} aria-label="Página anterior" onClick={() => setPage(current - 1)} disabled={current === 1}>
              <i className="ri-arrow-left-s-line" aria-hidden="true" />
            </button>
            {pageNumbers.map((number, index) => (
              <React.Fragment key={number}>
                {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="px-1 text-muted-foreground" aria-hidden="true">…</span>}
                <button type="button" aria-label={`Página ${number}`} aria-current={current === number ? 'page' : undefined}
                  className={buttonClass + (current === number ? ' border-primary bg-primary text-primary-foreground hover:bg-primary/90' : '')}
                  onClick={() => setPage(number)}>
                  {number}
                </button>
              </React.Fragment>
            ))}
            <button type="button" className={buttonClass} aria-label="Página siguiente" onClick={() => setPage(current + 1)} disabled={current === totalPages}>
              <i className="ri-arrow-right-s-line" aria-hidden="true" />
            </button>
            <button type="button" className={buttonClass} aria-label="Última página" onClick={() => setPage(totalPages)} disabled={current === totalPages}>
              <i className="ri-skip-forward-line" aria-hidden="true" />
            </button>
            <label className="ml-2 flex items-center gap-1.5 text-muted-foreground">
              <span>Ir a</span>
              <input type="number" min={1} max={totalPages} aria-label="Ir a la página" value={current}
                onChange={(event) => {
                  const number = Number(event.currentTarget.value);
                  if (Number.isInteger(number) && number >= 1 && number <= totalPages) setPage(number);
                }}
                className="h-9 w-16 rounded-lg border border-input bg-background px-2 text-center text-xs text-foreground" />
            </label>
          </div>
        </nav>
      </td></tr>
    )}
  </>;
}
