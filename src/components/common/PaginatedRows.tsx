import React, { useState } from 'react';
import { DateRangeFilter, matchesDateRange } from './DateRangeFilter';

export const TABLE_PAGE_SIZE = 50;

export function PaginatedRows<T>({ rows, children, columns, getDate }: {
  rows: readonly T[];
  children: (row: T, index: number) => React.ReactNode;
  columns: number;
  getDate?: (row: T) => string | undefined;
}) {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [previousRows, setPreviousRows] = useState(rows);
  if (rows !== previousRows) {
    setPreviousRows(rows);
    setPage(1);
  }
  const filtered = getDate ? rows.filter((row) => matchesDateRange(getDate(row), from, to)) : rows;
  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const offset = (current - 1) * TABLE_PAGE_SIZE;

  return <>
    {getDate && <tr><td colSpan={columns} className="px-4 py-2">
      <div className="max-w-sm"><DateRangeFilter from={from} to={to}
        setFrom={(value) => { setFrom(value); setPage(1); }}
        setTo={(value) => { setTo(value); setPage(1); }} /></div>
    </td></tr>}
    {filtered.length === 0 && rows.length > 0 && <tr><td colSpan={columns} className="px-4 py-6 text-center text-muted-foreground">Sin resultados para estas fechas.</td></tr>}
    {filtered.slice(offset, offset + TABLE_PAGE_SIZE).map((row, index) => children(row, offset + index))}
    {totalPages > 1 && (
      <tr><td colSpan={columns} className="border-t border-border px-4 py-3">
        <nav aria-label="Paginación de la tabla" className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-muted-foreground">{offset + 1}–{Math.min(offset + TABLE_PAGE_SIZE, filtered.length)} de {filtered.length}</span>
          <button type="button" className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" onClick={() => setPage(current - 1)} disabled={current === 1}>Anterior</button>
          <button type="button" className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" onClick={() => setPage(current + 1)} disabled={current === totalPages}>Siguiente</button>
        </nav>
      </td></tr>
    )}
  </>;
}
