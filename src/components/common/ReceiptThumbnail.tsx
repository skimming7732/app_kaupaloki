import React, { useEffect, useState } from 'react';
import { receiptPreviewUrl } from '../../utils/receipts';

export const ReceiptThumbnail: React.FC<{ receipt: string; className?: string }> = ({
  receipt,
  className = '',
}) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    receiptPreviewUrl(receipt)
      .then((res) => {
        if (active) setUrl(res);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [receipt]);

  if (!url) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <i className="ri-file-line text-xs" />
      </div>
    );
  }

  if (/\.pdf(?:[?#]|$)/i.test(receipt)) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-rose-500/10 text-rose-500 ${className}`}>
        <i className="ri-file-pdf-line text-xs font-bold" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Comprobante"
      loading="lazy"
      className={`w-full h-full object-cover ${className}`}
    />
  );
};
