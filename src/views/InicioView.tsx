import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData, type IngresoMensual } from '../context/DataContext';
import { formatNumber, formatCOP, fallbackBanderaUrl } from '../utils/formatters';

const monthLabel = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
};

const GrowthChart = ({ meses, loading }: { meses: IngresoMensual[]; loading: boolean }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>();
  if (loading) {
    return (
      <section className="h-full min-h-[280px] rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm flex flex-col items-center justify-center gap-3">
        <i className="ri-loader-4-line text-2xl text-primary animate-spin" />
        <span className="text-xs text-muted-foreground font-semibold">Cargando métricas y gráfica...</span>
      </section>
    );
  }
  const amounts = meses.map((month) => month.montoCop);
  const max = Math.max(1, ...amounts);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const selectedIndex = meses.findIndex((month) => month.mes === selectedMonth);
  const activeIdx = selectedIndex < 0 ? meses.length - 1 : selectedIndex;

  // SVG dimensions
  const width = 640;
  const height = 180;
  const padX = 42;
  const padTop = 45;
  const padBottom = 25;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;

  const points = amounts.map((amount, i) => ({
    x: padX + (i * plotWidth) / Math.max(1, amounts.length - 1),
    y: padTop + (1 - amount / max) * plotHeight,
  }));

  const linePath = buildSmoothPath(points);
  const activePoint = points[activeIdx] || points[points.length - 1];

  const activeAmount = amounts[activeIdx] || 0;
  const tooltipText = formatCOP(activeAmount);
  const pillWidth = Math.max(90, tooltipText.length * 7.5 + 24);
  const tooltipX = activePoint ? Math.max(pillWidth / 2 + 8, Math.min(width - pillWidth / 2 - 8, activePoint.x)) : 320;

  return (
    <section className="h-full rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm transition-all flex flex-col justify-between" aria-labelledby="growth-heading">
      {/* Top Header Card Info */}
      <div>
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 text-xs font-semibold text-foreground border border-border/50">
              <i className="ri-calendar-line text-muted-foreground text-xs" />
              <span>Últimos 3 meses</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
            <i className="ri-bar-chart-2-fill" />
          </div>
        </div>
        <h2 id="growth-heading" className="mt-2 text-sm font-semibold text-muted-foreground">Ingresos de clientes</h2>
        {meses.length > 0 && <p className="text-2xl font-bold tabular-nums">{formatCOP(total)}</p>}
      </div>

      {meses.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Los ingresos del período no están disponibles.</p>
      ) : (
      <div>
      <div className="relative w-full pt-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
          className="w-full h-44 sm:h-52 select-none"
        >
          <defs>
            <linearGradient id="curveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          {/* Glow shadow line (safe across all mobile GPUs) */}
          <path
            d={linePath}
            pathLength={1}
            className="inicio-income-path"
            fill="none"
            stroke="#6366f1"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
          />

          {/* Smooth Single Spline Line */}
          <path
            d={linePath}
            pathLength={1}
            className="inicio-income-path"
            fill="none"
            stroke="url(#curveStrokeGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Node Anchors */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="20"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setSelectedMonth(meses[i].mes)}
                onClick={() => setSelectedMonth(meses[i].mes)}
                onTouchStart={() => setSelectedMonth(meses[i].mes)}
              />
            </g>
          ))}

          {/* Active Highlight Node matching user design */}
          {activePoint && (
            <g className="transition-all duration-200">
              <circle cx={activePoint.x} cy={activePoint.y} r="5.5" fill="#ffffff" stroke="#6366f1" strokeWidth="3" />

              {/* Tooltip Pill directly above point */}
              <g transform={`translate(${tooltipX}, ${activePoint.y - 32})`}>
                <rect x={-pillWidth / 2} y="-11" width={pillWidth} height="22" rx="6" fill="#4f46e5" />
                <polygon points="-4,11 4,11 0,15" fill="#4f46e5" />
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                  letterSpacing="0.02em"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  {tooltipText}
                </text>
              </g>
            </g>
          )}
        </svg>

        <div className="flex justify-between gap-2 px-1 pt-2 sm:px-4">
          {meses.map((month, i) => (
            <button
              key={month.mes}
              type="button"
              aria-pressed={i === activeIdx}
              onClick={() => setSelectedMonth(month.mes)}
              className="flex min-w-0 flex-col gap-0.5 rounded-lg px-1.5 py-1 text-left text-[10px] text-muted-foreground hover:bg-muted aria-pressed:bg-primary/10 aria-pressed:text-primary sm:px-2 sm:text-xs"
            >
              <span className="capitalize">{monthLabel.format(new Date(month.mes + 'T00:00:00Z'))}</span>
              <strong className="break-all tabular-nums">{formatCOP(month.montoCop)}</strong>
            </button>
          ))}
        </div>
      </div>
      </div>
      )}
    </section>
  );
};

export const InicioView = () => {
  const { user, profile } = useAuth();
  const { data, loading, metrics, snapshot } = useData();
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

      {/* 75% Chart / 25% Stacked KPIs Layout — Visible para TODOS los usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
        {/* Chart takes 75% of width */}
        <div className="lg:col-span-3">
          <GrowthChart meses={snapshot.ingresosMensuales || []} loading={loading} />
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
