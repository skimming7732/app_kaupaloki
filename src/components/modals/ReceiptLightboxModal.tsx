import React, { useEffect, useState } from 'react';
import { receiptPreviewUrl } from '../../utils/receipts';
import { formatCOP } from '../../utils/formatters';
import { downloadBlobOrDataUrl } from '../../utils/fileDownloadHelper';

export interface LightboxItem {
  id: string;
  codigo: string;
  clienteNombre: string;
  monto: number;
  montoFormatted?: string;
  comprobanteUrl: string;
}

interface ReceiptLightboxModalProps {
  isOpen: boolean;
  currentIndex: number;
  items: LightboxItem[];
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ReceiptLightboxModal: React.FC<ReceiptLightboxModalProps> = ({
  isOpen,
  currentIndex,
  items,
  onClose,
  onNavigate,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const current = items[currentIndex];

  useEffect(() => {
    if (!isOpen || !current?.comprobanteUrl) {
      setResolvedUrl(null);
      return;
    }

    let active = true;
    setLoading(true);
    setCopied(false);

    receiptPreviewUrl(current.comprobanteUrl)
      .then((url) => {
        if (active) {
          setResolvedUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedUrl(null);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, current?.comprobanteUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, items.length, onNavigate, onClose]);

  if (!isOpen || !current) return null;

  const handleCopy = async () => {
    if (!resolvedUrl) return;
    try {
      const res = await fetch(resolvedUrl);
      const blob = await res.blob();
      if (blob.type.startsWith('image/')) {
        // PNG or convert
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
          return;
        } catch {
          // Fallback to text copy
        }
      }
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      await navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = async () => {
    if (!resolvedUrl) return;
    try {
      const res = await fetch(resolvedUrl);
      const blob = await res.blob();
      const ext = blob.type.includes('pdf') ? 'pdf' : 'png';
      const filename = `Comprobante_${current.codigo}.${ext}`;
      await downloadBlobOrDataUrl(blob, filename, `Comprobante ${current.codigo}`);
    } catch {
      window.open(resolvedUrl, '_blank');
    }
  };

  const isPdf = /\.pdf(?:[?#]|$)/i.test(current.comprobanteUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Navigation Arrow Left */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center text-2xl backdrop-blur-sm transition-all z-20"
          title="Comprobante anterior (Flecha Izquierda)"
        >
          <i className="ri-arrow-left-s-line" />
        </button>
      )}

      {/* Navigation Arrow Right */}
      {currentIndex < items.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center text-2xl backdrop-blur-sm transition-all z-20"
          title="Siguiente comprobante (Flecha Derecha)"
        >
          <i className="ri-arrow-right-s-line" />
        </button>
      )}

      {/* Main Container in 9:16 mobile receipt aspect ratio */}
      <div
        className="relative bg-card rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] w-full max-w-sm z-10"
        style={{ aspectRatio: '9/16' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <header className="p-3.5 px-4 bg-card/95 border-b border-border flex items-center justify-between shrink-0 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-foreground">{current.codigo}</span>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {currentIndex + 1} de {items.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
              {current.clienteNombre} · <span className="font-semibold text-foreground">{current.montoFormatted || formatCOP(current.monto)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                copied ? 'bg-emerald-500 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
              title="Copiar comprobante al portapapeles"
            >
              <i className={copied ? 'ri-check-line text-sm' : 'ri-file-copy-line text-sm'} />
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors"
              title="Descargar comprobante"
            >
              <i className="ri-download-line text-sm" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Cerrar"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </header>

        {/* 9:16 Receipt Image Body */}
        <div className="flex-1 bg-black/95 relative overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <i className="ri-loader-4-line animate-spin text-2xl" />
              <span className="text-xs">Cargando comprobante…</span>
            </div>
          )}

          {!loading && !resolvedUrl && (
            <div className="text-center p-6 text-white/60">
              <i className="ri-error-warning-line text-3xl mb-2 block" />
              <p className="text-xs">No se pudo cargar el comprobante.</p>
            </div>
          )}

          {!loading && resolvedUrl && (
            isPdf ? (
              <object
                data={resolvedUrl + '#toolbar=0'}
                type="application/pdf"
                className="w-full h-full"
                aria-label="Comprobante PDF"
              >
                <div className="p-4 text-center text-white">
                  <p className="text-xs mb-3">Comprobante en formato PDF</p>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    Abrir PDF
                  </a>
                </div>
              </object>
            ) : (
              <img
                src={resolvedUrl}
                alt={`Comprobante ${current.codigo}`}
                className="w-full h-full object-contain select-none"
              />
            )
          )}
        </div>

        {/* Bottom Mobile Arrows bar */}
        <footer className="sm:hidden p-2.5 px-4 bg-card/95 border-t border-border flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => onNavigate(currentIndex - 1)}
            className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold disabled:opacity-30 flex items-center gap-1"
          >
            <i className="ri-arrow-left-s-line" /> Anterior
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            disabled={currentIndex === items.length - 1}
            onClick={() => onNavigate(currentIndex + 1)}
            className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold disabled:opacity-30 flex items-center gap-1"
          >
            Siguiente <i className="ri-arrow-right-s-line" />
          </button>
        </footer>
      </div>
    </div>
  );
};
