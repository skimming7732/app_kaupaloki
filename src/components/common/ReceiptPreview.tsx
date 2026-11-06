import React, { useEffect, useState } from 'react';
import { receiptPreviewUrl } from '../../utils/receipts';

export const ReceiptPreview = ({ receipt, compact = false }: { receipt: string; compact?: boolean }) => {
  const [result, setResult] = useState<{ receipt: string; url: string | null }>();
  useEffect(() => {
    let active = true;
    void receiptPreviewUrl(receipt).then(
      (url) => { if (active) setResult({ receipt, url }); },
      () => { if (active) setResult({ receipt, url: null }); },
    );
    return () => { active = false; };
  }, [receipt]);

  if (result?.receipt !== receipt) return <span className="text-xs text-muted-foreground">Cargando comprobante…</span>;
  if (!result.url) return <span className="text-xs text-muted-foreground">Vista previa no disponible.</span>;

  const size = compact ? 'h-20 w-28' : 'h-[65vh] w-[min(76vw,44rem)]';
  const link = <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary">Abrir comprobante</a>;
  return (
    <div className="flex flex-col items-start gap-1">
      {/\.pdf(?:[?#]|$)/i.test(receipt) ? (
        <object data={result.url + '#toolbar=0'} type="application/pdf" aria-label="Vista previa del PDF" className={size + ' rounded border border-border'}>
          {link}
        </object>
      ) : (
        <a href={result.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir comprobante">
          <img src={result.url} loading={compact ? 'lazy' : 'eager'} alt="Vista previa del comprobante" className={size + ' rounded border border-border object-contain'} />
        </a>
      )}
      {link}
    </div>
  );
};
