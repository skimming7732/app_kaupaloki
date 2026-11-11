import { KpiStrip, totalsByCurrency } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { formatNumber, fallbackBanderaUrl } from '../utils/formatters';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, type NormalizedData } from '../context/DataContext';
import { formatCurrency, formatDate, compareChronologicalDesc } from '../utils/formatters';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';

const formatAmount = (value: number) => formatNumber(value, 0, 8);

type Divisa = NormalizedData['divisas'][number];

const ExtractoDivisa = ({ divisa, data, onBack }: { divisa: Divisa; data: NormalizedData; onBack: () => void }) => {
  const { codigo } = divisa;
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const rawMovimientos = useMemo(() => [
    ...data.negocios.filter((item) => item.divisaCodigo === codigo).map((item) => ({
      ...item, tipo: 'Negocio', detalle: item.clienteNombre, entrada: item.montoDivisa, salida: 0,
    })),
    ...data.comprasUsdt.filter((item) => item.divisaCodigo === codigo || codigo === 'USDT').map((item) => ({
      ...item, tipo: item.divisaCodigo === 'USDT' && codigo === 'USDT' ? 'Movimiento USDT a USDT' : 'Compra USDT',
      detalle: item.walletDestino,
      entrada: codigo === 'USDT' ? item.usdtComprado : 0,
      salida: item.divisaCodigo === codigo ? item.valorComprado : 0,
    })),
    ...(codigo === 'USDT' || codigo === 'COP' ? data.ventasUsdt : []).map((item) => ({
      ...item, tipo: 'Venta USDT', detalle: item.concepto,
      entrada: codigo === 'COP' ? item.totalCOP : 0, salida: codigo === 'USDT' ? item.usdtVendido : 0,
    })),
  ].sort(compareChronologicalDesc), [data, codigo]);

  const movimientos = useMemo(() => {
    return rawMovimientos.filter((m) => matchesDateRange(m.fecha, fechaDesde, fechaHasta));
  }, [rawMovimientos, fechaDesde, fechaHasta]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors w-fit"
        >
          <i className="ri-arrow-left-line" aria-hidden="true" /> Volver a divisas
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          {(fallbackBanderaUrl[codigo] || divisa.banderaUrl) && (
            <img
              src={fallbackBanderaUrl[codigo] || divisa.banderaUrl}
              alt=""
              className="inline-block h-6 w-8 rounded-sm object-cover shadow-sm"
              onError={(event) => { event.currentTarget.hidden = true; }}
            />
          )}
          <span>Extracto de {codigo}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{divisa.nombre} · Movimientos de cambio registrados</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total recibido', amount: divisa.totalRecibido, detail: codigo === 'USDT' ? 'De negocios registrados en USDT' : 'Acumulado registrado' },
          { label: codigo === 'USDT' ? 'USDT entregados' : 'Total comprado', amount: divisa.totalComprado, detail: 'Divisa entregada en operaciones de compra' },
          { label: 'Total pendiente', amount: divisa.totalPendiente, detail: 'Recibido menos lo entregado' },
        ].map(({ label, amount, detail }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{formatAmount(amount)}</dd>
            <dd className="text-xs text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>

      {/* Date Range Filter Toolbar placed strictly BEFORE the table */}
      <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <DateRangeFilter
          from={fechaDesde}
          to={fechaHasta}
          setFrom={setFechaDesde}
          setTo={setFechaHasta}
          className="w-full sm:w-auto"
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatNumber(movimientos.length)} de {formatNumber(rawMovimientos.length)} movimientos</span>
          {(fechaDesde || fechaHasta) && (
            <button
              type="button"
              onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
              className="text-primary hover:underline font-semibold"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {/* Desktop Movements Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Movimientos de cambio en {codigo}</caption>
          <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
            <tr>
              {['Fecha', 'Operación', 'Referencia', 'Detalle', 'Entrada', 'Salida'].map((label) => (
                <th key={label} scope="col" className="px-4 py-3">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {rawMovimientos.length === 0
                    ? 'No hay movimientos registrados para esta divisa.'
                    : 'No hay movimientos en el rango de fechas seleccionado.'}
                </td>
              </tr>
            ) : (
              <PaginatedRows columns={6} rows={movimientos} getDate={(movement) => movement.fecha}>
                {(item) => (
                  <tr key={item.tipo + '-' + item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{formatDate(item.fecha)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{item.tipo}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-muted-foreground">{item.codigo}</td>
                    <td className="px-4 py-3">{item.detalle || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-emerald-600 font-mono font-medium">
                      {item.entrada ? formatCurrency(item.entrada, codigo) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-rose-600 font-mono font-medium">
                      {item.salida ? formatCurrency(item.salida, codigo) : '—'}
                    </td>
                  </tr>
                )}
              </PaginatedRows>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const DivisasView: React.FC = () => {
  const { data } = useData();
  const navigate = useNavigate();
  const { codigo } = useParams<{ codigo?: string }>();
  const [search, setSearch] = useState('');

  const selectedDivisa = useMemo(() => {
    if (!codigo) return null;
    return data.divisas.find((item) => item.codigo.toUpperCase() === codigo.toUpperCase()) || null;
  }, [data.divisas, codigo]);

  const filteredDivisas = data.divisas.filter((d) => {
    return (
      d.codigo.toLowerCase().includes(search.toLowerCase()) ||
      d.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (d.pais && d.pais.toLowerCase().includes(search.toLowerCase()))
    );
  });

  if (codigo) {
    if (selectedDivisa) {
      return <ExtractoDivisa divisa={selectedDivisa} data={data} onBack={() => navigate('/divisas')} />;
    }
    if (data.divisas.length > 0) {
      return (
        <div className="p-8 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Divisa "{codigo}" no encontrada.</p>
          <button
            type="button"
            onClick={() => navigate('/divisas')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Volver a Divisas
          </button>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ISO, nombre o país..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{filteredDivisas.length} divisas configuradas</span>
          <AddCatalogButton table="divisas" />
        </div>
      </div>

      <KpiStrip metrics={([
        ['Divisas', filteredDivisas.length],
        ['Total recibido', totalsByCurrency(filteredDivisas, (d) => d.codigo, (d) => d.totalRecibido)],
        ['Total comprado', totalsByCurrency(filteredDivisas, (d) => d.codigo, (d) => d.totalComprado)],
        ['Total pendiente', totalsByCurrency(filteredDivisas, (d) => d.codigo, (d) => d.totalPendiente)],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código ISO</th>
                <th className="py-3 px-4">Nombre de la Divisa</th>
                <th className="py-3 px-4">País / Región</th>
                <th className="py-3 px-4 text-right">Total Recibido</th>
                <th className="py-3 px-4 text-right">Total Comprado</th>
                <th className="py-3 px-4 text-right">Total Pendiente</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {filteredDivisas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No hay divisas que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={7} rows={filteredDivisas}>{(d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => navigate('/divisas/' + d.codigo)}
                        aria-label={'Ver extracto de ' + d.codigo}
                        className="whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary hover:bg-primary/20 transition-colors inline-flex items-center gap-1.5"
                      >
                        {(fallbackBanderaUrl[d.codigo] || d.banderaUrl) && (
                          <img src={fallbackBanderaUrl[d.codigo] || d.banderaUrl} alt="" className="inline-block h-[1em] w-[1.35em] rounded-sm object-cover align-[-0.1em]" onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                        <span>{d.codigo}</span>
                        <i className="ri-arrow-right-s-line" aria-hidden="true" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{d.nombre}</td>
                    <td className="py-3 px-4 text-muted-foreground">{d.pais || 'Internacional'}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatAmount(d.totalRecibido)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatAmount(d.totalComprado)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-500">
                      {formatAmount(d.totalPendiente)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Activo'}
                      </span>
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Movements Cards */}
      <div className="block md:hidden space-y-2.5">
        {movimientos.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
            {rawMovimientos.length === 0
              ? 'No hay movimientos registrados para esta divisa.'
              : 'No hay movimientos en el rango de fechas seleccionado.'}
          </div>
        ) : (
          movimientos.map((item) => (
            <div key={item.tipo + '-' + item.id} className="p-3.5 rounded-xl bg-card border border-border shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{item.tipo}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{item.codigo}</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{formatDate(item.fecha)}</span>
              </div>
              {item.detalle && (
                <p className="text-muted-foreground text-[11px] truncate">{item.detalle}</p>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50 font-mono text-xs font-bold">
                <span className="text-muted-foreground text-[10px] font-sans">Monto</span>
                {item.entrada ? (
                  <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(item.entrada, codigo)}</span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400">-{formatCurrency(item.salida, codigo)}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
