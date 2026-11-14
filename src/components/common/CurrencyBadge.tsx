import React from 'react';
import { currencyFlagUrl } from '../../utils/formatters';

export function CurrencyBadge({ codigo, banderaUrl }: { codigo: string; banderaUrl?: string }) {
  const flag = currencyFlagUrl(codigo, banderaUrl);
  return <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
    {flag && <img key={flag} src={flag} alt="" width={12} height={8} className="h-2 w-3 shrink-0 rounded-[1px] object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />}
    {codigo}
  </span>;
}
