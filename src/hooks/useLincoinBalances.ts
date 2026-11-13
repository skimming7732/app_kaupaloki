import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface LincoinTarget {
  id: string;
  apiId?: string;
  institucion?: string;
  divisa?: string;
  institution?: { name?: string };
}

export const isLincoinAsset = (asset: LincoinTarget) =>
  (asset.institution?.name || asset.institucion || '').trim().toLowerCase() === 'lincoin'
  && asset.divisa === 'COP';

export interface LincoinBalance {
  asset_id: string;
  api_id: string;
  saldo_real: number;
  consultado_at: string;
}

export function useLincoinBalances(assets: LincoinTarget[]) {
  const targetsKey = JSON.stringify(assets.filter((a) => isLincoinAsset(a) && a.apiId?.trim())
    .map((a) => [a.id, a.apiId!.trim().toUpperCase()]).sort());
  const [balances, setBalances] = useState<Record<string, LincoinBalance>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (targetsKey === '[]') return;
    let active = true;
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('lincoin_balances');
        if (rpcError) throw rpcError;
        if (!data || !Array.isArray(data.balances)) throw new Error('Respuesta inválida de Lincoin.');
        if (!active) return;
        const next: Record<string, LincoinBalance> = {};
        for (const row of data.balances as LincoinBalance[]) {
          if (typeof row.saldo_real === 'number' && Number.isFinite(row.saldo_real)
            && Number.isFinite(Date.parse(row.consultado_at))) {
            next[`${row.asset_id}:${row.api_id.trim().toUpperCase()}`] = row;
          }
        }
        setBalances(next);
        setError(data.error || null);
      } catch {
        if (active) setError('No se pudo actualizar Lincoin. Revisa la fecha de la última consulta.');
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [targetsKey, refreshCount]);

  return { balances, loading, error, refresh: () => setRefreshCount((n) => n + 1) };
}
