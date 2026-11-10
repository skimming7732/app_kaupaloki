import React, { useEffect, useState } from 'react';
import { RecordDialog, recordButtonClass } from './RecordDialog';
import {
  CashToken,
  generateTokenVoucherDataUrl,
  downloadTokenVoucher,
  formatCurrencyAmount,
  getTokenState,
} from '../../utils/tokenVoucherGenerator';

interface TokenVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: CashToken | null;
  onRedeem?: (token: CashToken) => void;
  onCancel?: (token: CashToken) => void;
}

export const TokenVoucherModal: React.FC<TokenVoucherModalProps> = ({
  isOpen,
  onClose,
  token,
  onRedeem,
  onCancel,
}) => {
  const [preview, setPreview] = useState<{ token: CashToken; url: string | null } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    setPreview(null);

    generateTokenVoucherDataUrl(token)
      .then((url) => {
        if (isMounted) setPreview({ token, url });
      })
      .catch((err) => {
        console.error('Error generando voucher:', err);
        if (isMounted) setPreview({ token, url: null });
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  if (!isOpen || !token) return null;

  const state = getTokenState(token);
  const isActive = state === 'activo';
  const isDelivered = state === 'entregado';
  const dataUrl = preview?.token === token ? preview.url : null;
  const loading = preview?.token !== token;
  const title = isDelivered ? 'Comprobante de entrega' : 'Vale de retiro';
  const statusLabel = { activo: 'Activo', entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Expirado' }[state];
  const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50';
  const date = isDelivered ? token.redeemed_at : token.expires_at;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(token.token_code.toUpperCase());
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Error copiando código:', err);
    }
  };

  const handleCopyImage = async () => {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
    } catch (err) {
      console.error('Error copiando imagen al portapapeles:', err);
      // Fallback: download
      downloadTokenVoucher(token, dataUrl);
    }
  };

  return (
    <RecordDialog
      title={title}
      description={token.codigo || 'Autorización de caja'}
      icon={isDelivered ? 'ri-checkbox-circle-line' : 'ri-ticket-2-line'}
      onClose={onClose}
      wide
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
        <div className="space-y-3">
          <div className="mx-auto flex aspect-[9/16] w-full max-w-[19rem] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40">
            {loading ? (
              <span role="status" className="text-sm text-muted-foreground">Generando imagen…</span>
            ) : dataUrl ? (
              <img src={dataUrl} alt={title} className="h-full w-full object-contain" />
            ) : (
              <p role="alert" className="p-4 text-center text-sm text-destructive">No se pudo generar la imagen del vale.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { if (dataUrl) void downloadTokenVoucher(token, dataUrl); }}
              disabled={!dataUrl} className={recordButtonClass}>
              <i className="ri-download-2-line" aria-hidden="true" /> Descargar
            </button>
            <button type="button" onClick={handleCopyImage} disabled={!dataUrl} className={secondaryButton}>
              <i className={copiedImage ? 'ri-check-line' : 'ri-clipboard-line'} aria-hidden="true" />
              {copiedImage ? 'Copiada' : 'Copiar imagen'}
            </button>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Monto autorizado</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{statusLabel}</span>
            </div>
            <p className="break-words text-xl font-bold tabular-nums">{token.divisa} ${formatCurrencyAmount(token.monto, token.divisa)}</p>
          </div>
          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground">Código de validación</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-mono text-lg font-bold tracking-wider text-primary">{token.token_code.toUpperCase()}</span>
              <button type="button" onClick={handleCopyCode} className={secondaryButton}>
                <i className={copiedCode ? 'ri-check-line' : 'ri-file-copy-line'} aria-hidden="true" />
                {copiedCode ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            {token.referencia && <div><dt className="text-muted-foreground">Referencia</dt><dd className="break-words font-medium">{token.referencia}</dd></div>}
            <div><dt className="text-muted-foreground">Creado por</dt><dd>{token.created_by_name || 'Sistema'}</dd></div>
            {date && <div><dt className="text-muted-foreground">{isDelivered ? 'Entregado el' : 'Vence el'}</dt><dd>{new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</dd></div>}
            {isDelivered && token.redeemed_by_name && <div><dt className="text-muted-foreground">Entregado por</dt><dd>{token.redeemed_by_name}</dd></div>}
          </dl>
          {isActive && (onRedeem || onCancel) && (
            <div className="grid gap-2 border-t border-border pt-4">
              {onRedeem && (
                <button type="button" onClick={() => onRedeem(token)} className={recordButtonClass}>
                  <i className="ri-checkbox-circle-line" aria-hidden="true" /> Marcar como entregado
                </button>
              )}
              {onCancel && (
                <button type="button" onClick={() => onCancel(token)}
                  className="min-h-11 rounded-xl border border-destructive/20 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
                  Cancelar token
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </RecordDialog>
  );
};
