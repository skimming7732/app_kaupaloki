import { supabase } from '../lib/supabase';
import type { CashToken } from './tokenVoucherGenerator';

function actionError(error: { code?: string; message?: string }) {
  if (['22023', '40001', '42501', 'P0002'].includes(error.code || '') && error.message) return new Error(error.message);
  return new Error('No se pudo actualizar el token. Actualiza la lista e inténtalo de nuevo.');
}

export async function deliverCashToken(token: CashToken): Promise<CashToken> {
  if (!token.updated_at) throw new Error('Actualiza la lista o vuelve a escanear el token antes de entregarlo.');
  const { data, error } = await supabase.rpc('entregar_token_efectivo', { p_token_id: token.id, p_updated_at: token.updated_at });
  if (error) throw actionError(error);
  if (!data) throw new Error('El token ya no está disponible.');
  return data as CashToken;
}

export async function reopenCashToken(token: CashToken, reason: string): Promise<CashToken> {
  if (!token.updated_at) throw new Error('Actualiza la lista y vuelve a abrir el vale.');
  const { data, error } = await supabase.rpc('reabrir_token_efectivo', {
    p_token_id: token.id, p_motivo: reason.trim(), p_updated_at: token.updated_at,
  });
  if (error) throw actionError(error);
  if (!data) throw new Error('El token ya no está disponible.');
  return data as CashToken;
}

export async function readCashToken(id: string): Promise<CashToken | null> {
  const { data, error } = await supabase.from('cash_tokens').select('*').eq('id', id).maybeSingle();
  return error ? null : data as CashToken | null;
}
