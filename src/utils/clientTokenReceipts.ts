import { supabase } from '../lib/supabase';
import { readAllRows } from './supabasePagination';
import type { CashToken } from './tokenVoucherGenerator';

export type ClientCashToken = Pick<CashToken, 'id' | 'codigo' | 'token_code' | 'monto' | 'divisa' | 'referencia' | 'estado' | 'redeemed_at' | 'redeemed_by_name' | 'created_at' | 'created_by_name' | 'fecha'>;
export const clientTokenFields = 'id,codigo,token_code,monto,divisa,referencia,estado,redeemed_at,redeemed_by_name,created_at,created_by_name,fecha';

/** Authenticated portal preview; anonymous access is exclusively through the PIN RPC. */
export async function loadClientTokenReceipts(paymentIds: string[]) {
  const result: Record<string, ClientCashToken> = {};
  for (let offset = 0; offset < paymentIds.length; offset += 100) {
    const ids = paymentIds.slice(offset, offset + 100);
    const { data, error } = await readAllRows(() => supabase.from('cash_tokens').select(clientTokenFields + ',efectivo_id')
      .eq('estado', 'entregado').in('efectivo_id', ids).order('redeemed_at', { ascending: false }).order('id'));
    if (error) throw error;
    for (const row of data || []) if (row.efectivo_id && !result[row.efectivo_id]) result[row.efectivo_id] = row;
  }
  return result;
}
