import React, { useEffect, useState } from 'react';
import {
  CashToken,
  generateTokenVoucherDataUrl,
  downloadTokenVoucher,
  formatCurrencyAmount,
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
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    if (!isOpen || !token) {
      setDataUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    generateTokenVoucherDataUrl(token)
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generando voucher:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  if (!isOpen || !token) return null;

  const isCancelled = token.estado === 'cancelado' || token.status === 'cancelled';
  const isRedeemed = token.estado === 'entregado' || token.status === 'redeemed';
  const isActive = !isCancelled && !isRedeemed;

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

  const handleDownload = () => {
    if (token) {
      downloadTokenVoucher(token, dataUrl || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <i className="ri-ticket-2-line text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Vale de Retiro {token.codigo ? `(${token.codigo})` : ''}
              </h2>
              <p className="text-xs text-slate-400">
                {token.divisa} ${formatCurrencyAmount(token.monto, token.divisa)} •{' '}
                {token.referencia || 'Sin referencia'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Card Preview (9:16 Canvas Image) */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/60 max-w-[270px] w-full aspect-[9/16] flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <i className="ri-loader-4-line animate-spin text-3xl text-sky-400" />
                  <span className="text-xs">Generando imagen...</span>
                </div>
              ) : dataUrl ? (
                <img
                  src={dataUrl}
                  alt={`Voucher ${token.token_code}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-rose-400">Error al cargar imagen</span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 text-center">
              Resolución HD 9:16 optimizada para WhatsApp y móvil
            </span>
          </div>

          {/* Details & Actions Panel */}
          <div className="flex flex-col justify-between h-full space-y-4">
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Estado
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isCancelled
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : isRedeemed
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {isCancelled ? 'Cancelado' : isRedeemed ? 'Entregado' : 'Activo'}
                </span>
              </div>

              {/* Code Box */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest block font-medium">
                  Código de Validación
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-2xl font-black text-sky-400 tracking-widest">
                    {token.token_code.toUpperCase()}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5 transition-colors"
                  >
                    <i
                      className={
                        copiedCode ? 'ri-check-line text-emerald-400' : 'ri-file-copy-line'
                      }
                    />
                    {copiedCode ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Monto:</span>
                  <span className="font-bold text-white">
                    {token.divisa} ${formatCurrencyAmount(token.monto, token.divisa)}
                  </span>
                </div>
                {token.referencia && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Referencia:</span>
                    <span className="text-white text-right font-medium">{token.referencia}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Creado por:</span>
                  <span className="text-white">{token.created_by_name || 'Sistema'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Vence:</span>
                  <span className="text-slate-300">
                    {token.expires_at
                      ? new Date(token.expires_at).toLocaleString('es-CO', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : 'Sin fecha'}
                  </span>
                </div>
                {token.redeemed_at && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-emerald-400">Entregado el:</span>
                    <span className="text-emerald-300">
                      {new Date(token.redeemed_at).toLocaleString('es-CO', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!dataUrl}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
                >
                  <i className="ri-download-2-line text-sm" />
                  Descargar PNG
                </button>
                <button
                  onClick={handleCopyImage}
                  disabled={!dataUrl}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors disabled:opacity-50"
                >
                  <i
                    className={
                      copiedImage
                        ? 'ri-check-line text-emerald-400 text-sm'
                        : 'ri-clipboard-line text-sm'
                    }
                  />
                  {copiedImage ? '¡Copiada!' : 'Copiar Imagen'}
                </button>
              </div>

              {isActive && onRedeem && (
                <button
                  onClick={() => onRedeem(token)}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <i className="ri-checkbox-circle-line text-sm" />
                  Marcar como Entregado en Caja
                </button>
              )}

              {isActive && onCancel && (
                <button
                  onClick={() => onCancel(token)}
                  className="w-full py-2 px-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <i className="ri-close-circle-line text-sm" />
                  Cancelar este Token
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
