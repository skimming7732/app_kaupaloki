type WriteError = { code?: string; message?: string };
type WriteResult = { error: WriteError | null };
type RecordFields = Record<string, string | number | boolean | null | undefined>;

export async function writeDashboardRecord<T extends WriteResult>(
  fields: RecordFields,
  write: (fields: RecordFields) => PromiseLike<T>,
  options: { optionalColumns?: string[]; generatedColumns?: string[]; fallbackCode?: string } = {},
): Promise<T> {
  const record = { ...fields };

  while (true) {
    const result = await write(record);
    const { error } = result;
    if (!error) return result;

    const missing = error.message?.match(/Could not find the '([^']+)' column/)?.[1];
    const column = error.message?.match(/column "([^"]+)"/)?.[1];
    if (error.code === '23502' && column === 'codigo' && options.fallbackCode && record.codigo === undefined) {
      record.codigo = options.fallbackCode;
      continue;
    }
    const rejected = error.code === 'PGRST204' && missing && options.optionalColumns?.includes(missing)
      ? missing
      : error.code === '428C9' && column && options.generatedColumns?.includes(column) ? column : undefined;
    if (!rejected || !Object.hasOwn(record, rejected)) return result;

    // PostgREST/Postgres rejected the whole write, so these retries cannot duplicate it.
    delete record[rejected];
  }
}

export function dashboardWriteError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const code = (error as WriteError | null)?.code;
  const message = (error as WriteError | null)?.message;
  if (['P0001', '22023'].includes(code || '') && message && /^(Vincula una cuenta de origen|Ingresa un monto válido para completar la dispersión|La cuenta de origen no está disponible o su saldo contable|La cuenta no está disponible o el saldo es insuficiente para la venta y su fee|No se puede revertir el abono de esta venta|Saldo insuficiente en la billetera de origen para la venta y su fee|La cuenta de destino de esta venta ya no está disponible|La billetera de origen de esta venta ya no está disponible|Ingresa un monto, una tasa, un fee y una fecha válidos|Selecciona una billetera de origen y una cuenta de destino válidas)/.test(message)) {
    return new Error(message);
  }
  if (code === '42501' || code === 'PGRST301') return new Error('Tu sesión no tiene permiso para guardar este registro.');
  if (code === 'PGRST204' || code === 'PGRST205' || code === '42703' || code === '42883') {
    return new Error('Falta actualizar la base de datos para guardar este formulario.');
  }
  if (code === '23505') return new Error('Ya existe un registro con los mismos datos únicos.');
  if (code === '23503') return new Error('Uno de los registros seleccionados ya no está disponible. Actualiza la vista y vuelve a seleccionarlo.');
  if (code === 'PGRST116') return new Error('El registro ya no está disponible o tu sesión no tiene permiso para modificarlo.');
  return new Error(code ? fallback + ' Código: ' + code + '.' : fallback);
}
