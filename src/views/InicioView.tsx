import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatNumber, formatCOP, fallbackBanderaUrl } from '../utils/formatters';

export interface DailyIngreso {
  dia: string;       // YYYY-MM-DD
  label: string;     // '12 nov'
  fullDate: string;  // '12 nov 2026'
  montoCop: number;
  txCount: number;
}

function toDateKey(raw: any): string | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * Genera los nodos diarios correspondientes al período seleccionado (30 o 90 días naturales).
 * Agrupa los ingresos de negocios y efectivo registrados por fecha sin requerir filtros manuales.
 */
function buildDailyIngresos(
  negocios: Array<any>,
  efectivo: Array<any> = [],
  daysCount: number = 30
): DailyIngreso[] {
  const mapByDate = new Map<string, { monto: number; count: number }>();

  for (const n of negocios || []) {
    if (!n) continue;
    const dateStr = toDateKey(n.fecha || n.fechaRegistro || n.raw?.fecha);
    if (!dateStr) continue;
    const amount = Number(
      n.ingresoCOP ??
      n.ingresoCop ??
      n.montoCop ??
      n.raw?.ingreso_cop ??
      n.raw?.monto_cop ??
      (n as any).ingreso_cop ??
      (n as any).monto_cop ??
      0
    ) || 0;
    const current = mapByDate.get(dateStr) || { monto: 0, count: 0 };
    current.monto += amount;
    current.count += 1;
    mapByDate.set(dateStr, current);
  }

  for (const e of efectivo || []) {
    if (!e) continue;
    const tipo = String(e.tipo || e.raw?.tipo || '').toUpperCase();
    if (tipo !== 'INGRESO') continue;
    const dateStr = toDateKey(e.fecha || e.raw?.fecha);
    if (!dateStr) continue;
    const amount = Number(e.monto ?? e.montoCop ?? e.raw?.monto ?? 0) || 0;
    const current = mapByDate.get(dateStr) || { monto: 0, count: 0 };
    current.monto += amount;
    current.count += 1;
    mapByDate.set(dateStr, current);
  }

  const result: DailyIngreso[] = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(yyyy).slice(-2);
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const fullDate = `${dd}/${mm}/${yy}`; // e.g. "12/11/26"
    const label = `${dd}/${mm}`;

    const stat = mapByDate.get(dateKey) || { monto: 0, count: 0 };

    result.push({
      dia: dateKey,
      label,
      fullDate,
      montoCop: stat.monto,
      txCount: stat.count,
    });
  }

  return result;
}

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    // Si ambos puntos están en la base plana (sin ingresos), mantener línea recta perfecta
    if (p1.y === p2.y) {
      d += ` L ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
      continue;
    }

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
};

const GrowthChart = ({ negocios, efectivo = [], loading }: { negocios: any[]; efectivo?: any[]; loading: boolean }) => {
  const [daysRange, setDaysRange] = useState<30 | 90>(30);
  const dailyData = useMemo(() => buildDailyIngresos(negocios, efectivo, daysRange), [negocios, efectivo, daysRange]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <section className="h-full min-h-[300px] rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm flex flex-col items-center justify-center gap-3">
        <i className="ri-loader-4-line text-2xl text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-semibold">Cargando métricas y gráfica diaria...</span>
      </section>
    );
  }

  const amounts = dailyData.map((d) => d.montoCop);
  const max = Math.max(1, ...amounts);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const average = total / daysRange;

  // Por defecto seleccionar el día con transacciones más reciente o hoy
  const defaultIdx = useMemo(() => {
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].montoCop > 0) return i;
    }
    return dailyData.length - 1;
  }, [dailyData]);

  const activeIdx = selectedIdx !== null && selectedIdx >= 0 && selectedIdx < dailyData.length ? selectedIdx : defaultIdx;
  const activeDay = dailyData[activeIdx] || dailyData[dailyData.length - 1];

  // Dimensiones SVG con espacio óptimo para 30 o 90 nodos
  const width = 720;
  const height = 185;
  const padX = 32;
  const padTop = 42;
  const padBottom = 24;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;

  const points = amounts.map((amount, i) => ({
    x: padX + (i * plotWidth) / Math.max(1, amounts.length - 1),
    y: padTop + (1 - amount / max) * plotHeight,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)},${(height - padBottom).toFixed(2)} L ${points[0].x.toFixed(2)},${(height - padBottom).toFixed(2)} Z`
    : '';

  const activePoint = points[activeIdx] || points[points.length - 1];
  const activeAmount = activeDay?.montoCop || 0;
  const tooltipText = `${activeDay?.fullDate}: ${formatCOP(activeAmount)}`;
  const pillWidth = Math.max(115, tooltipText.length * 6.8 + 20);
  const tooltipX = activePoint ? Math.max(pillWidth / 2 + 8, Math.min(width - pillWidth / 2 - 8, activePoint.x)) : 360;

  // Interacción suave deslizando el cursor o dedo por los nodos
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = clientX / rect.width;
    const svgX = ratio * width;
    const relativeX = svgX - padX;
    const index = Math.round((relativeX / plotWidth) * (dailyData.length - 1));
    const clamped = Math.max(0, Math.min(dailyData.length - 1, index));
    setSelectedIdx(clamped);
  };

  // Marcadores de fecha distribuidos a lo largo del período seleccionado
  const tickIndices = daysRange === 30 ? [0, 6, 12, 18, 24, 29] : [0, 18, 36, 54, 72, 89];

  return (
    <section className="h-full rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm transition-all flex flex-col justify-between" aria-labelledby="growth-heading">
      {/* Top Header Card Info */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle 30 días vs 90 días */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => { setDaysRange(30); setSelectedIdx(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  daysRange === 30
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => { setDaysRange(90); setSelectedIdx(null); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  daysRange === 90
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                90 días
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Promedio diario: <strong className="font-mono text-foreground">{formatCOP(average)}</strong>
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
            <i className="ri-line-chart-line" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mt-2">
          <div>
            <h2 id="growth-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ingresos de clientes
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground mt-0.5 font-mono">
              {formatCOP(total)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {selectedIdx !== null ? 'Día seleccionado' : 'Última actividad'}
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-primary">
              {activeDay?.fullDate} • {formatCOP(activeDay?.montoCop || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
            className="w-full h-44 sm:h-56 select-none cursor-crosshair touch-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setSelectedIdx(null)}
          >
            <defs>
              <linearGradient id="curveStrokeGrad90" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4318ff" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="curveAreaGrad90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                <stop offset="85%" stopColor="#6366f1" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Guías horizontales tenues */}
            <line x1={padX} y1={padTop} x2={width - padX} y2={padTop} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1={padX} y1={padTop + plotHeight * 0.5} x2={width - padX} y2={padTop + plotHeight * 0.5} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1={padX} y1={height - padBottom} x2={width - padX} y2={height - padBottom} stroke="currentColor" strokeOpacity="0.12" />

            {/* Relleno de área degradada */}
            {areaPath && <path d={areaPath} fill="url(#curveAreaGrad90)" />}

            {/* Curva continua de 90 nodos diarios */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#curveStrokeGrad90)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Micro nodos a lo largo de los días */}
            {points.map((p, i) => {
              const hasAmount = amounts[i] > 0;
              if (!hasAmount && i % (daysRange === 30 ? 1 : 3) !== 0) return null;
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hasAmount ? (daysRange === 30 ? 3.5 : 2.5) : (daysRange === 30 ? 1.8 : 1.2)}
                  fill={hasAmount ? '#6366f1' : 'currentColor'}
                  opacity={hasAmount ? 0.9 : 0.25}
                />
              );
            })}

            {/* Línea vertical de seguimiento interactiva */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={height - padBottom}
                stroke="#6366f1"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
            )}

            {/* Nodo activo con halo y tooltip interactivo */}
            {activePoint && (
              <g className="transition-all duration-75">
                <circle cx={activePoint.x} cy={activePoint.y} r="8" fill="#6366f1" opacity="0.25" />
                <circle cx={activePoint.x} cy={activePoint.y} r="4.5" fill="#ffffff" stroke="#4318ff" strokeWidth="2.5" />

                {/* Tooltip con fecha y monto del día */}
                <g transform={`translate(${tooltipX}, ${Math.max(16, activePoint.y - 28)})`}>
                  <rect x={-pillWidth / 2} y="-11" width={pillWidth} height="22" rx="7" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
                  <polygon points="-4,11 4,11 0,15" fill="#1e1b4b" />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10.5"
                    fontWeight="700"
                    letterSpacing="0.01em"
                    style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  >
                    {tooltipText}
                  </text>
                </g>
              </g>
            )}
          </svg>

          {/* Marcadores de fecha en el eje X */}
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono px-2 pt-1 border-t border-border/40">
            {tickIndices.map((idx) => {
              const day = dailyData[idx];
              if (!day) return null;
              return (
                <span
                  key={day.dia}
                  className="hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => setSelectedIdx(idx)}
                  title={`${day.fullDate}: ${formatCOP(day.montoCop)}`}
                >
                  {day.fullDate}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export const InicioView = () => {
  const { user, profile } = useAuth();
  const { data, loading, metrics } = useData();
  const admin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const canSeeNegocios = admin || ['comercial', 'operador', 'supervisor'].includes(profile?.role || '');
  const authorized = profile?.authorized_currencies || [];
  const divisas = admin || !authorized.length ? data.divisas
    : data.divisas.filter((currency) => authorized.includes(currency.codigo));

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4">
      {/* Top Banner */}
      <div className="relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm sm:p-8">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <i className="ri-shield-check-line" aria-hidden="true" /> Plataforma Operativa Kaupaloki
          </span>
          <h1 className="text-2xl font-bold sm:text-3xl">Bienvenido, {profile?.full_name || user?.email?.split('@')[0] || 'Kaupaloki'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu panel de operaciones y clientes.</p>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-12 -z-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-wrap gap-2">
          {canSeeNegocios && <Link to="/negocios" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm">Ver negocios</Link>}
          <Link to="/clientes" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">Ver clientes</Link>
        </div>
      </div>

      {/* 75% Chart / 25% Stacked KPIs Layout — Gráfica de 90 Nodos Diarios */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Chart takes 75% of width */}
        <div className="lg:col-span-3">
          <GrowthChart negocios={data.negocios || []} efectivo={data.efectivo || []} loading={loading} />
        </div>

        {/* KPIs stacked vertically taking 25% of width */}
        <div className="lg:col-span-1 flex flex-col justify-between gap-3">
          <div className="flex-1 rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Ingresos Clientes</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm">
                <i className="ri-hand-coin-line" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground font-mono mt-2 truncate" title={formatCOP(metrics.totalClientesIngresosCOP || metrics.totalNegocioCOP)}>
              {formatCOP(metrics.totalClientesIngresosCOP || metrics.totalNegocioCOP)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Histórico consolidado</span>
          </div>

          <div className="flex-1 rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Negocios registrados</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm">
                <i className="ri-exchange-dollar-line" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground font-mono mt-2">
              {formatNumber(data.negocios.length)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Operaciones registradas</span>
          </div>

          <div className="flex-1 rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Clientes registrados</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">
                <i className="ri-team-line" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground font-mono mt-2">
              {formatNumber(data.clientes.length)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Cartera global</span>
          </div>
        </div>
      </div>

      {/* Authorized Currencies */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="currency-heading">
        <h2 id="currency-heading" className="mb-3 text-sm font-bold">Mis divisas autorizadas ({divisas.length})</h2>
        {divisas.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {divisas.map((currency) => {
              const flag = fallbackBanderaUrl[currency.codigo] || currency.banderaUrl;
              return (
                <li key={currency.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  {flag ? (
                    <img
                      src={flag}
                      alt=""
                      className="h-3.5 w-5 rounded-sm object-cover"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                  ) : (
                    <i className="ri-global-line text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="shrink-0 font-mono text-xs font-semibold">{currency.codigo}</span>
                  <span className="truncate text-xs text-muted-foreground" title={currency.nombre}>{currency.nombre}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No hay divisas disponibles para tu perfil.</p>
        )}
      </section>
    </div>
  );
};
