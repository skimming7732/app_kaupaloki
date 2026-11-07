import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { KpiStrip } from '../components/common/KpiStrip';
import { fallbackBanderaUrl, formatDate } from '../utils/formatters';

const weekMs = 7 * 86400000;
const bogotaDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota' });
const dayLabel = (time: number) => formatDate(new Date(time).toISOString().slice(0, 10)).slice(0, 5);

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

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="growth-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="growth-heading" className="text-base font-bold">Registro de negocios</h2>
          <p className="text-xs text-muted-foreground">Últimas ocho semanas · negocios autorizados para tu rol</p>
        </div>
        <p className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{total} en el período</p>
      </div>
      <ol className="grid grid-cols-8 gap-1.5 sm:gap-3" aria-label="Registros por semana">
        {counts.map((count, index) => (
          <li key={index} className="flex min-w-0 flex-col items-center text-center">
            <span className="flex h-28 w-full flex-col justify-end rounded-t-lg border-b border-border sm:h-36">
              <span className="pb-1 text-xs font-semibold tabular-nums">{count}</span>
              <span aria-hidden="true" style={{ height: (count / max) * 75 + '%' }}
                className="mx-auto w-full max-w-12 rounded-t-md bg-primary/75" />
            </span>
            <time className="mt-1.5 text-[9px] text-muted-foreground sm:text-xs" dateTime={new Date(start + weekMs * index).toISOString().slice(0, 10)}>
              {dayLabel(start + weekMs * index)}
            </time>
          </li>
        ))}
      </ol>
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <h1 className="text-2xl font-bold">Bienvenido, {profile?.full_name || user?.email?.split('@')[0] || 'Kaupaloki'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu panel de operaciones y clientes.</p>
        </div>
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
