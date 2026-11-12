import { useEffect, useState } from 'react';
import { isTronAddress, isTronNetwork, readTronUsdtBalance, getCachedTronBalance } from '../utils/tronUsdtBalance';
import { isPolygonAddress, isPolygonNetwork, readPolygonUsdtBalance, getCachedPolygonBalance } from '../utils/polygonUsdtBalance';

export interface WalletBalanceTarget {
  address: string;
  red?: string;
}

export function useTronUsdtBalances(targets: Array<WalletBalanceTarget | string>) {
  // Normalizar los destinos a una lista única de { address, chain: 'tron' | 'polygon' }
  const normalizedTargets = targets
    .map((t) => {
      if (typeof t === 'string') {
        const clean = t.trim();
        if (isTronAddress(clean)) return { address: clean, chain: 'tron' as const };
        if (isPolygonAddress(clean)) return { address: clean.toLowerCase(), chain: 'polygon' as const };
        return null;
      }
      const clean = String(t.address || '').trim();
      if (!clean) return null;
      if (isPolygonNetwork(t.red) || isPolygonAddress(clean)) {
        return { address: clean.toLowerCase(), chain: 'polygon' as const };
      }
      if (isTronNetwork(t.red) || isTronAddress(clean)) {
        return { address: clean, chain: 'tron' as const };
      }
      return null;
    })
    .filter((item): item is { address: string; chain: 'tron' | 'polygon' } => item !== null);

  const targetsKey = normalizedTargets.map((item) => `${item.chain}:${item.address}`).sort().join(',');

  // Pre-cargar saldos desde la caché en memoria / sesión para visualización instantánea sin demora
  const [balances, setBalances] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    for (const item of normalizedTargets) {
      const cached = item.chain === 'polygon'
        ? getCachedPolygonBalance(item.address)
        : getCachedTronBalance(item.address);
      if (cached !== null) initial[item.address] = cached;
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (normalizedTargets.length === 0) return;

    const controller = new AbortController();
    setLoading(true);

    // Hidratar desde caché inmediatamente si hay valores guardados
    setBalances((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const item of normalizedTargets) {
        if (next[item.address] === undefined) {
          const cached = item.chain === 'polygon'
            ? getCachedPolygonBalance(item.address)
            : getCachedTronBalance(item.address);
          if (cached !== null) {
            next[item.address] = cached;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });

    // Consultar en paralelo todas las direcciones de TRON y Polygon
    Promise.allSettled(
      normalizedTargets.map(async (item) => {
        try {
          const balance = item.chain === 'polygon'
            ? await readPolygonUsdtBalance(item.address, controller.signal)
            : await readTronUsdtBalance(item.address, controller.signal);

          if (!controller.signal.aborted) {
            setBalances((prev) => ({ ...prev, [item.address]: balance }));
          }
        } catch {
          // Si falla la red, conservar el valor previo o caché si existe
          const cached = item.chain === 'polygon'
            ? getCachedPolygonBalance(item.address)
            : getCachedTronBalance(item.address);
          if (cached !== null && !controller.signal.aborted) {
            setBalances((prev) => ({ ...prev, [item.address]: cached }));
          }
        }
      })
    ).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [targetsKey, refreshCount]);

  return {
    balances,
    loading,
    refresh: () => setRefreshCount((count) => count + 1),
  };
}
