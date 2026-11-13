import type { NormalizedData } from '../context/DataContext';
import { matchesDateRange } from '../components/common/DateRangeFilter';

/** Period activity uses the same source amounts as the catalog aggregates. */
export function divisasForPeriod(
  data: Pick<NormalizedData, 'divisas' | 'negocios' | 'comprasUsdt'>,
  from: string,
  to: string,
) {
  // Keep stored historical balances when no period is selected.
  if (!from && !to) return data.divisas;

  const received = new Map<string, number>();
  const purchased = new Map<string, number>();
  for (const negocio of data.negocios) {
    if (!matchesDateRange(negocio.fecha, from, to)) continue;
    received.set(negocio.divisaCodigo, (received.get(negocio.divisaCodigo) || 0) + negocio.montoDivisa);
  }
  for (const compra of data.comprasUsdt) {
    if (!matchesDateRange(compra.fecha, from, to)) continue;
    purchased.set(compra.divisaCodigo, (purchased.get(compra.divisaCodigo) || 0) + compra.valorComprado);
  }

  return data.divisas.map((divisa) => {
    const totalRecibido = received.get(divisa.codigo) || 0;
    const totalComprado = purchased.get(divisa.codigo) || 0;
    return {
      ...divisa,
      totalRecibido,
      totalComprado,
      totalPendiente: Math.max(0, totalRecibido - totalComprado),
    };
  });
}
