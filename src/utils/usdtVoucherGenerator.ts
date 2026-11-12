import { downloadBlobOrDataUrl } from './fileDownloadHelper';
import { formatNumber } from './formatters';

export interface UsdtTransactionVoucherData {
  tipo: 'COMPRA' | 'VENTA';
  codigo: string;
  fecha: string;
  contraparte: string; // Proveedor in Compra, Concepto in Venta
  divisa: string;
  montoDivisa: number;
  usdtMonto: number;
  tasa: number;
  feeUsdt?: number;
  wallet: string;
  cuentaContraparte?: string;
  createdByName?: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a high-resolution 9:16 PNG voucher image for USDT purchases/sales.
 */
export async function generateUsdtVoucherDataUrl(
  data: UsdtTransactionVoucherData
): Promise<string> {
  const width = 540;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

  const isBuy = data.tipo === 'COMPRA';
  const font = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0B1437');
  bgGrad.addColorStop(0.5, '#0E1A47');
  bgGrad.addColorStop(1, '#080E29');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Background ambient glowing orbs
  const glow = ctx.createRadialGradient(isBuy ? 120 : 420, 200, 10, isBuy ? 120 : 420, 200, 260);
  glow.addColorStop(0, isBuy ? 'rgba(5, 205, 153, 0.18)' : 'rgba(67, 24, 255, 0.25)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 400);

  // Helper drawers
  const box = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const text = (
    str: string,
    x: number,
    y: number,
    style: string,
    color: string,
    align: CanvasTextAlign = 'center'
  ) => {
    ctx.font = style;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  };

  // Outer framing card
  box(24, 24, 492, 912, 28, '#111C44', '#1E2D63');

  // Top header brand pill
  box(44, 46, 452, 42, 14, '#1B254B', '#2B3968');
  text('KAUPALOKI · TREASURY & TRADING', width / 2, 72, `700 12px ${font}`, '#8FA0D7');

  // Operation Type Badge
  const badgeColor = isBuy ? '#05CD99' : '#38BDF8';
  const badgeBg = isBuy ? 'rgba(5, 205, 153, 0.12)' : 'rgba(56, 189, 248, 0.12)';
  const badgeBorder = isBuy ? 'rgba(5, 205, 153, 0.35)' : 'rgba(56, 189, 248, 0.35)';
  box(width / 2 - 130, 106, 260, 32, 12, badgeBg, badgeBorder);
  text(
    isBuy ? 'COMPRA DE USDT' : 'VENTA DE USDT',
    width / 2,
    127,
    `800 12px ${font}`,
    badgeColor
  );

  // Status Pill
  box(width / 2 - 60, 148, 120, 24, 8, 'rgba(5, 205, 153, 0.15)', 'rgba(5, 205, 153, 0.4)');
  text('COMPLETADO', width / 2, 164, `700 11px ${font}`, '#05CD99');

  // Main USDT Amount
  const sign = isBuy ? '+' : '−';
  const usdtFormatted = `${sign}${formatNumber(data.usdtMonto, 2, 4)} USDT`;
  text(usdtFormatted, width / 2, 222, `900 34px ${font}`, isBuy ? '#05CD99' : '#FFFFFF');

  // Secondary Currency and Rate Subtitle
  const rateLabel = `Tasa: 1 USDT = ${formatNumber(data.tasa, 2, 4)} ${data.divisa.toUpperCase()}`;
  text(rateLabel, width / 2, 252, `600 13px ${font}`, '#A3AED0');

  // Divider
  box(48, 274, 444, 1, 0, '#1E2D63');

  // Details Table Container Card
  box(44, 292, 452, 492, 20, '#172352', '#263777');

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    { label: 'CÓDIGO DE OPERACIÓN', value: data.codigo, highlight: true },
    { label: 'FECHA DE TRANSACCIÓN', value: data.fecha || '—' },
    {
      label: isBuy ? 'PROVEEDOR / CONTRAPARTE' : 'CONCEPTO / CONTRAPARTE',
      value: (data.contraparte || 'SIN REGISTRO').toUpperCase(),
    },
    {
      label: isBuy ? 'MONTO ENTREGADO' : 'TOTAL RECIBIDO',
      value: `${formatNumber(data.montoDivisa, 2, 2)} ${data.divisa.toUpperCase()}`,
      highlight: true,
    },
    {
      label: 'USDT OPERADOS',
      value: `${formatNumber(data.usdtMonto, 2, 4)} USDT`,
    },
    ...(data.feeUsdt && data.feeUsdt > 0
      ? [{ label: 'FEE DE ENVÍO', value: `${formatNumber(data.feeUsdt, 2, 4)} USDT` }]
      : []),
    {
      label: isBuy ? 'BILLETERA DESTINO' : 'BILLETERA ORIGEN',
      value: (data.wallet || 'Billetera Principal').toUpperCase(),
    },
    ...(data.cuentaContraparte
      ? [{ label: 'CUENTA DESTINO COP', value: data.cuentaContraparte.toUpperCase() }]
      : []),
    {
      label: 'REGISTRADO POR',
      value: (data.createdByName || 'SISTEMA').toUpperCase(),
    },
  ];

  let currentY = 328;
  const rowSpacing = Math.min(48, 440 / rows.length);

  rows.forEach((r, idx) => {
    text(r.label, 64, currentY, `600 11px ${font}`, '#8FA0D7', 'left');
    text(
      r.value,
      476,
      currentY,
      `800 12px ${font}`,
      r.highlight ? '#FFFFFF' : '#E0E5F2',
      'right'
    );
    if (idx < rows.length - 1) {
      box(64, currentY + 12, 412, 1, 0, '#1F2F6B');
    }
    currentY += rowSpacing;
  });

  // Security Seal & Compliance Footer
  box(44, 804, 452, 70, 16, '#0E173C', '#1D2A5E');
  text('COMPROBANTE ELECTRÓNICO INTERNO', width / 2, 828, `800 11px ${font}`, '#8FA0D7');
  text(
    'Registro contable emitido y certificado bajo el sistema de tesorería Kaupaloki.',
    width / 2,
    846,
    `500 10px ${font}`,
    '#586899'
  );
  text(
    'Validez para auditoría, conciliación y control interno.',
    width / 2,
    862,
    `500 10px ${font}`,
    '#586899'
  );

  // Bottom Watermark
  text(
    `KAUPALOKI CO · ${new Date().toISOString().slice(0, 10)}`,
    width / 2,
    914,
    `600 10px ${font}`,
    '#3B4B7B'
  );

  return canvas.toDataURL('image/png');
}

/**
 * Downloads or shares the USDT operation voucher image.
 */
export async function downloadUsdtVoucher(
  data: UsdtTransactionVoucherData,
  precomputedDataUrl?: string
): Promise<void> {
  const dataUrl = precomputedDataUrl || (await generateUsdtVoucherDataUrl(data));
  const filename = `Comprobante_${data.codigo || 'USDT'}.png`;
  await downloadBlobOrDataUrl(
    dataUrl,
    filename,
    `Comprobante ${data.codigo || 'USDT'}`
  );
}
