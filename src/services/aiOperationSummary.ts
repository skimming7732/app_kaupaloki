interface Operation {
  fecha?: string;
  estado?: string;
  divisaCodigo?: string;
  valorComprado?: number;
  usdtComprado?: number;
  usdtVendido?: number;
  totalCOP?: number;
}

export function summarizeUsdtOperations(records: Operation[], kind: 'compra' | 'venta') {
  const days = new Map<string, {
    fecha: string; cantidad: number; usdt: number;
    importesPorDivisa: Record<string, number>; estados: Record<string, number>;
  }>();
  let sinFecha = 0;
  for (const record of records) {
    // fecha is the business date used by the operation forms, not its audit timestamp.
    const fecha = record.fecha?.slice(0, 10);
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { sinFecha++; continue; }
    const day = days.get(fecha) || { fecha, cantidad: 0, usdt: 0, importesPorDivisa: {}, estados: {} };
    day.cantidad++;
    day.usdt += Number((kind === 'compra' ? record.usdtComprado : record.usdtVendido) || 0);
    const divisa = kind === 'compra' ? (record.divisaCodigo || 'SIN_DIVISA') : 'COP';
    day.importesPorDivisa[divisa] = (day.importesPorDivisa[divisa] || 0)
      + Number((kind === 'compra' ? record.valorComprado : record.totalCOP) || 0);
    const estado = record.estado || 'sin_estado';
    day.estados[estado] = (day.estados[estado] || 0) + 1;
    days.set(fecha, day);
  }
  return { totalRegistros: records.length, sinFecha, porFecha: [...days.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)) };
}

export type UsdtOperationSummary = ReturnType<typeof summarizeUsdtOperations>;
