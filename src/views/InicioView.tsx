import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { KpiStrip } from '../components/common/KpiStrip';
import { formatNumber, fallbackBanderaUrl, formatDate } from '../utils/formatters';

const weekMs = 7 * 86400000;
const bogotaDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' });
const dayLabel = (time: number) => formatDate(new Date(time).toISOString().slice(0, 10)).slice(0, 5);

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 5.5;
    const cp1y = p1.y + (p2.y - p0.y) / 5.5;
    const cp2x = p2.x - (p3.x - p1.x) / 5.5;
    const cp2y = p2.y - (p3.y - p1.y) / 5.5;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
};

const GrowthChart = ({ negocios }: { negocios: NormalizedData['negocios'] }) => {
  const end = Date.parse(bogotaDay.format(new Date())) + 86400000;
  const start = end - weekMs * 8;
  const counts = Array<number>(8).fill(0);
  for (const negocio of negocios) {
    const createdAt = Date.parse(negocio.createdAtAudit || '');
    const day = Number.isFinite(createdAt) ? bogotaDay.format(createdAt) : negocio.fecha?.slice(0, 10) || '';
    const index = Math.floor((Date.parse(day) - start) / weekMs);
    if (index >= 0 && index < counts.length) counts[index]++;
  }

  const max = Math.max(1, ...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);

  // Default active point is the latest or highest
  const defaultIdx = counts.lastIndexOf(max) >= 0 ? counts.lastIndexOf(max) : counts.length - 1;
  const [activeIdx, setActiveIdx] = useState(defaultIdx);

  // SVG dimensions
  const width = 640;
  const height = 180;
  const padX = 35;
  const padTop = 45;
  const padBottom = 25;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const baseY = height - padBottom;

  const points = counts.map((count, i) => ({
    x: padX + (i * plotWidth) / (counts.length - 1),
    y: padTop + (1 - count / max) * plotHeight,
  }));

  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x},${baseY} L ${points[0].x},${baseY} Z` : '';
  const activePoint = points[activeIdx] || points[points.length - 1];

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm transition-all" aria-labelledby="growth-heading">
      {/* Top Header Card Info */}
      <div className="flex items-center justify-between pb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 text-xs font-semibold text-foreground border border-border/50">
          <i className="ri-calendar-line text-muted-foreground text-xs" />
          <span>Últimas 8 semanas</span>
        </span>
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
          <i className="ri-bar-chart-2-fill" />
        </div>
      </div>

      {/* Main Metric */}
      <div className="mt-2 mb-4">
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
          {formatNumber(total)}
        </div>
        <div className="flex items-center gap-2.5 mt-1">
          <span className="text-xs font-medium text-muted-foreground">Registro de negocios autorizados</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
            <i className="ri-checkbox-circle-fill text-xs" /> En curso
          </span>
        </div>
      </div>

      {/* Curved Spline Chart */}
      <div className="relative w-full pt-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 sm:h-52 overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <filter id="badgeShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4f46e5" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Area Fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Smooth Single Spline Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
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
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i)}
              />
            </g>
          ))}

          {/* Active Highlight Node with Glow and Tooltip Badge */}
          {activePoint && (
            <g className="transition-all duration-200">
              {/* Outer halo */}
              <circle cx={activePoint.x} cy={activePoint.y} r="10" fill="#6366f1" opacity="0.25" />
              {/* Inner dot */}
              <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="3" />

              {/* Tooltip Pill directly above point */}
              <g transform={`translate(${activePoint.x}, ${activePoint.y - 34})`} filter="url(#badgeShadow)">
                <rect x="-40" y="-12" width="80" height="24" rx="7" fill="#4f46e5" />
                <polygon points="-5,12 5,12 0,16" fill="#4f46e5" />
                <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="700" fontFamily="monospace">
                  {counts[activeIdx]} {counts[activeIdx] === 1 ? 'negocio' : 'negocios'}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Horizontal Dates Axis */}
        <div className="flex justify-between items-center px-1 sm:px-4 pt-1.5 border-t border-border/50">
          {counts.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`text-[10px] sm:text-xs font-semibold transition-colors ${
                i === activeIdx ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {dayLabel(start + weekMs * i)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const InicioView = () => {
  const { user, profile } = useAuth();
  const { data } = useAirtable();
  const admin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const canSeeNegocios = admin || profile?.role === 'operador';
  const authorized = profile?.authorized_currencies || [];
  const divisas = admin || !authorized.length ? data.divisas
    : data.divisas.filter((currency) => authorized.includes(currency.codigo));
  const negocios = canSeeNegocios ? data.negocios.filter((item) =>
    admin || !authorized.length || authorized.includes(item.divisaCodigo)
  ) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4">
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
          {canSeeNegocios && <Link to="/negocios" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ver negocios</Link>}
          <Link to="/clientes" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Ver clientes</Link>
        </div>
      </div>

      {canSeeNegocios && <GrowthChart negocios={negocios} />}

      <KpiStrip label="Indicadores de inicio" metrics={[
        ...(canSeeNegocios ? [{ label: 'Negocios registrados', value: negocios.length, icon: 'ri-exchange-dollar-line' }] : []),
        { label: 'Clientes registrados', value: data.clientes.length, icon: 'ri-team-line' },
        { label: 'Divisas autorizadas', value: divisas.length, icon: 'ri-global-line' },
      ]} />

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="currency-heading">
        <h2 id="currency-heading" className="mb-3 text-sm font-bold">Mis divisas autorizadas</h2>
        {divisas.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {divisas.map((currency) => {
            const flag = fallbackBanderaUrl[currency.codigo] || currency.banderaUrl;
            return <li key={currency.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              {flag ? <img src={flag} alt="" className="h-3.5 w-5 rounded-sm object-cover"
                onError={(event) => { event.currentTarget.hidden = true; }} /> : <i className="ri-global-line text-muted-foreground" aria-hidden="true" />}
              <span className="shrink-0 font-mono text-xs font-semibold">{currency.codigo}</span>
              <span className="truncate text-xs text-muted-foreground" title={currency.nombre}>{currency.nombre}</span>
            </li>;
          })}
        </ul> : <p className="text-xs text-muted-foreground">No hay divisas disponibles para tu perfil.</p>}
      </section>
    </div>
  );
};
