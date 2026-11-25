import { useAuth } from '../../context/AuthContext';
import { reopenCashToken } from '../../utils/cashTokenActions';
import { prepareSuccessSound } from '../../utils/confirmationSound';
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
  onReopened?: (token: CashToken) => void;
}

export const TokenVoucherModal: React.FC<TokenVoucherModalProps> = ({
  isOpen,
  onClose,
  token,
  onRedeem,
  onCancel,
  onReopened,
}) => {
  const { profile } = useAuth();
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState('Entrega marcada por error');
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState('');
  const [preview, setPreview] = useState<{ token: CashToken; url: string | null } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => { setConfirmReopen(false); setReopenError(''); setReopenReason('Entrega marcada por error'); }, [isOpen, token?.id]);

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
  const statusLabel = { activo: 'Pendiente de entrega', entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Expirado' }[state];
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

  const handleReopen = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reopening || profile?.role !== 'super_admin' || !onReopened || !isDelivered) return;
    if (reopenReason.trim().length < 3) { setReopenError('Escribe un motivo de al menos 3 caracteres.'); return; }
    setReopening(true);
    setReopenError('');
    const finish = prepareSuccessSound();
    try {
      const updated = await reopenCashToken(token, reopenReason);
      onReopened(updated);
      setConfirmReopen(false);
      finish(true);
    } catch (error) {
      setReopenError(error instanceof Error ? error.message : 'No se pudo corregir la entrega.');
    } finally {
      finish(false);
      setReopening(false);
    }
  };

  return (
    <RecordDialog
      title={title}
      description={token.codigo || 'Autorización de caja'}
      icon={isDelivered ? 'ri-checkbox-circle-line' : 'ri-ticket-2-line'}
      onClose={onClose}
      busy={reopening}
      error={reopenError}
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
            {token.referencia && <div><dt className="text-muted-foreground">Referencia</dt><dd className="break-words font-medium">{token.referencia.toUpperCase()}</dd></div>}
            <div><dt className="text-muted-foreground">Creado por</dt><dd>{token.created_by_name || 'Sistema'}</dd></div>
            {date && <div><dt className="text-muted-foreground">{isDelivered ? 'Entregado el' : 'Vence el'}</dt><dd>{new Date(date).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</dd></div>}
            {isDelivered && token.redeemed_by_name && <div><dt className="text-muted-foreground">Entregado por</dt><dd>{token.redeemed_by_name}</dd></div>}
          </dl>
          {Boolean(token.reopen_history?.length) && (
            <details className="rounded-xl border border-border p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-muted-foreground">Historial de correcciones ({token.reopen_history!.length})</summary>
              <ol className="mt-3 space-y-3">
                {token.reopen_history!.map((entry, index) => <li key={entry.reopened_at + index} className="space-y-1 border-l-2 border-primary/25 pl-3">
                  <p className="font-semibold">{entry.reopened_by_name}</p>
                  <p className="text-muted-foreground">{new Date(entry.reopened_at).toLocaleString('es-CO')}</p>
                  <p className="break-words">{entry.reason}</p>
                  {entry.previous_redeemed_at && <p className="text-muted-foreground">Entrega corregida: {new Date(entry.previous_redeemed_at).toLocaleString('es-CO')}{entry.previous_redeemed_by_name ? ' · ' + entry.previous_redeemed_by_name : ''}</p>}
                </li>)}
              </ol>
            </details>
          )}
          {isDelivered && profile?.role === 'super_admin' && onReopened && (
            <div className="border-t border-border pt-4">
              {confirmReopen ? (
                <form onSubmit={handleReopen} className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm font-semibold">Volver a pendiente de entrega</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">Confirma solo si el dinero no fue entregado. El mismo código quedará vigente por 2 meses. El pago y el saldo de caja no cambian.</p>
                  <label className="block space-y-1.5 text-xs font-medium">Motivo de la corrección
                    <textarea value={reopenReason} onChange={event => setReopenReason(event.target.value)} required minLength={3} maxLength={500} rows={2} disabled={reopening} className="w-full resize-none rounded-xl border border-border bg-background p-2.5 text-sm outline-none focus:border-primary" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={reopening} className={recordButtonClass}>
                      <i className={reopening ? 'ri-loader-4-line animate-spin' : 'ri-history-line'} aria-hidden="true" />{reopening ? 'Guardando…' : 'Confirmar corrección'}
                    </button>
                    <button type="button" disabled={reopening} onClick={() => { setConfirmReopen(false); setReopenError(''); }} className={secondaryButton}>Volver</button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setConfirmReopen(true)} className={secondaryButton + ' w-full text-primary'}>
                  <i className="ri-history-line" aria-hidden="true" /> Volver a pendiente
                </button>
              )}
            </div>
          )}
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
