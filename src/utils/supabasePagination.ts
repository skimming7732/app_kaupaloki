/** Read bounded API batches so the dashboard never stops at Supabase's row limit. */
export async function readAllRows<T>(createQuery: () => {
  range: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { code?: string; message: string } | null;
  }>;
}) {
  const rows: T[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await createQuery().range(offset, offset + batchSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < batchSize) return { data: rows, error: null };
  }
}
