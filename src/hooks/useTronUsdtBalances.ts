import { useEffect, useState } from 'react';
import { isTronAddress, readTronUsdtBalance, getCachedTronBalance } from '../utils/tronUsdtBalance';

export function useTronUsdtBalances(addresses: string[]) {
  const addressKey = [...new Set(addresses.map((address) => address.trim()).filter(isTronAddress))].join(',');

  // Pre-cargar saldos desde la caché en memoria / sesión para visualización instantánea sin demora
  const [balances, setBalances] = useState<Record<string, number | null>>(() => {
    const initial: Record<string, number | null> = {};
    const selected = addressKey.split(',').filter(Boolean);
    for (const addr of selected) {
      const cached = getCachedTronBalance(addr);
      if (cached !== null) initial[addr] = cached;
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!addressKey) return;
    const selected = addressKey.split(',').filter(Boolean);
    if (selected.length === 0) return;

    const controller = new AbortController();
    setLoading(true);

    // Si hay direcciones sin saldo en el estado pero que tienen caché, hidratarlas de inmediato
    setBalances((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const addr of selected) {
        if (next[addr] === undefined) {
          const cached = getCachedTronBalance(addr);
          if (cached !== null) {
            next[addr] = cached;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });

    // Consultar en paralelo todas las direcciones sin borrar los saldos anteriores
    Promise.allSettled(
      selected.map(async (address) => {
        try {
          const balance = await readTronUsdtBalance(address, controller.signal);
          if (!controller.signal.aborted) {
            setBalances((prev) => ({ ...prev, [address]: balance }));
          }
        } catch {
          // Si falla, conservar el valor previo o caché
          const cached = getCachedTronBalance(address);
          if (cached !== null && !controller.signal.aborted) {
            setBalances((prev) => ({ ...prev, [address]: cached }));
          }
        }
      })
    ).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [addressKey, refreshCount]);

  return {
    balances,
    loading,
    refresh: () => setRefreshCount((count) => count + 1),
  };
}
