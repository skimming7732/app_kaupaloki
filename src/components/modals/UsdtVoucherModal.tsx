import React, { useEffect, useState } from 'react';
import { RecordDialog, recordButtonClass } from './RecordDialog';
import {
  UsdtTransactionVoucherData,
  generateUsdtVoucherDataUrl,
  downloadUsdtVoucher,
} from '../../utils/usdtVoucherGenerator';
import { formatNumber } from '../../utils/formatters';

interface UsdtVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: UsdtTransactionVoucherData | null;
}

export const UsdtVoucherModal: React.FC<UsdtVoucherModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  useEffect(() => {
    if (!isOpen || !data) {
      setDataUrl(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setDataUrl(null);

    generateUsdtVoucherDataUrl(data)
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error generando comprobante USDT:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const isBuy = data.tipo === 'COMPRA';
  const title = isBuy ? 'Comprobante de Compra USDT' : 'Comprobante de Venta USDT';
  const secondaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors';

  const handleCopyText = async () => {
    const lines = [
      `🧾 KAUPALOKI · ${title.toUpperCase()}`,
      `Código: ${data.codigo}`,
      `Fecha: ${data.fecha}`,
      `Contraparte: ${data.contraparte}`,
      `Monto USDT: ${formatNumber(data.usdtMonto, 2, 4)} USDT`,
      `Divisa: ${formatNumber(data.montoDivisa, 2, 2)} ${data.divisa.toUpperCase()}`,
      `Tasa: 1 USDT = ${formatNumber(data.tasa, 2, 4)} ${data.divisa.toUpperCase()}`,
      data.feeUsdt ? `Fee: ${formatNumber(data.feeUsdt, 2, 4)} USDT` : null,
      `Billetera: ${data.wallet}`,
      data.cuentaContraparte ? `Cuenta: ${data.cuentaContraparte}` : null,
      `Registrado por: ${data.createdByName || 'Sistema'}`,
      `Estado: COMPLETADO`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Error al copiar texto:', err);
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
      console.warn('Portapapeles de imagen no soportado directamente, descargando archivo:', err);
      void downloadUsdtVoucher(data, dataUrl);
    }
  };

  return (
    <RecordDialog
      title={title}
      description={data.codigo || 'Registro digital de operación'}
      icon={isBuy ? 'ri-shopping-cart-2-line' : 'ri-funds-line'}
      onClose={onClose}
      wide
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
        {/* Left Column: 9:16 Canvas Graphic Preview */}
        <div className="space-y-3">
          <div className="mx-auto flex aspect-[9/16] w-full max-w-[19rem] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground p-6">
                <i className="ri-loader-4-line text-2xl animate-spin text-primary" />
                <span>Generando comprobante oficial…</span>
              </div>
            ) : dataUrl ? (
              <img src={dataUrl} alt={title} className="h-full w-full object-contain" />
            ) : (
              <p role="alert" className="p-4 text-center text-xs text-destructive">
                No se pudo generar la imagen del comprobante.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (dataUrl) void downloadUsdtVoucher(data, dataUrl);
              }}
              disabled={!dataUrl}
              className={recordButtonClass}
              title="Descargar o guardar imagen en tu dispositivo"
            >
              <i className="ri-download-2-line" aria-hidden="true" />
              <span>Descargar</span>
            </button>
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={!dataUrl}
              className={secondaryButton}
              title="Copiar imagen al portapapeles"
            >
              <i
                className={copiedImage ? 'ri-check-line text-emerald-500' : 'ri-clipboard-line'}
                aria-hidden="true"
              />
              <span>{copiedImage ? 'Copiada' : 'Copiar imagen'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Key Details */}
        <div className="min-w-0 space-y-4">
          <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Monto de Operación</span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold">
                Completado
              </span>
            </div>
            <p className="text-2xl font-black text-foreground font-mono">
              {formatNumber(data.usdtMonto, 2, 4)} USDT
            </p>
            <p className="text-xs text-muted-foreground">
              Equivalente:{' '}
              <strong className="text-foreground font-mono">
                {formatNumber(data.montoDivisa, 2, 2)} {data.divisa.toUpperCase()}
              </strong>{' '}
              a tasa <span className="font-mono">{formatNumber(data.tasa, 2, 4)}</span>
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-semibold">Resumen de transacción</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
              >
                <i className={copiedText ? 'ri-check-line text-emerald-500' : 'ri-file-copy-line'} />
                <span>{copiedText ? 'Copiado' : 'Copiar texto'}</span>
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono font-bold text-foreground">{data.codigo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-mono text-foreground">{data.fecha || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">
                  {isBuy ? 'Proveedor' : 'Concepto'}
                </dt>
                <dd className="font-bold text-foreground">{data.contraparte}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {isBuy ? 'Billetera destino' : 'Billetera origen'}
                </dt>
                <dd className="font-medium text-foreground">{data.wallet}</dd>
              </div>
              {data.cuentaContraparte && (
                <div>
                  <dt className="text-muted-foreground">Cuenta destino COP</dt>
                  <dd className="font-medium text-foreground">{data.cuentaContraparte}</dd>
                </div>
              )}
              {data.feeUsdt ? (
                <div>
                  <dt className="text-muted-foreground">Fee de envío</dt>
                  <dd className="font-mono font-semibold text-foreground">
                    {formatNumber(data.feeUsdt, 2, 4)} USDT
                  </dd>
                </div>
              ) : null}
              <div className="col-span-2">
                <dt className="text-muted-foreground">Registrado por</dt>
                <dd className="text-foreground">{data.createdByName || 'Sistema'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </RecordDialog>
  );
};
