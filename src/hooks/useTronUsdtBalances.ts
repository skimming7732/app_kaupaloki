import { useEffect, useState } from 'react';
import { isTronAddress, readTronUsdtBalance } from '../utils/tronUsdtBalance';

export function useTronUsdtBalances(addresses: string[]) {
  const [balances, setBalances] = useState<Record<string, number | null>>({});
  const [refreshCount, setRefreshCount] = useState(0);
  const addressKey = [...new Set(addresses.map((address) => address.trim()).filter(isTronAddress))].join(',');

  useEffect(() => {
    if (!addressKey) return;
    const selected = addressKey.split(',');
    const controller = new AbortController();

    setBalances((previous) => {
      const next = { ...previous };
      for (const address of selected) delete next[address];
      return next;
    });

    for (const address of selected) {
      void readTronUsdtBalance(address, controller.signal)
        .catch(() => null)
        .then((balance) => {
          if (!controller.signal.aborted) setBalances((previous) => ({ ...previous, [address]: balance }));
        });
    }

    return () => controller.abort();
  }, [addressKey, refreshCount]);

  return { balances, refresh: () => setRefreshCount((count) => count + 1) };
}
