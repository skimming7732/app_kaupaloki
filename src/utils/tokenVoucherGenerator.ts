import QRCode from 'qrcode';

export interface TokenVoucherData {
  codigo?: string;
  token_code: string;
  monto: number;
  divisa: string;
  referencia?: string;
  estado: 'activo' | 'entregado' | 'cancelado' | 'expirado' | string;
  expires_at?: string;
  fecha?: string;
  created_by_name?: string;
  redeemed_by_name?: string;
  redeemed_at?: string;
}

export interface CashToken extends TokenVoucherData {
  id: string;
  efectivo_id?: string | null;
  pago_codigo?: string | null;
  status?: string;
  created_at: string;
}

export function getTokenState(token: TokenVoucherData & { status?: string }) {
  if (token.estado === 'cancelado' || token.status === 'cancelled') return 'cancelado';
  if (token.estado === 'entregado' || token.status === 'redeemed') return 'entregado';
  if (token.estado === 'expirado' || (token.expires_at && Date.parse(token.expires_at) <= Date.now())) return 'expirado';
  return 'activo';
}

let logoPromise: Promise<HTMLImageElement | null> | undefined;

/**
 * Loads an image from a URL or public path as an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Formats currency amount
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const isCrypto = ['USDT', 'USDC', 'BTC', 'ETH'].includes(currency.toUpperCase());
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isCrypto ? 2 : 0,
    maximumFractionDigits: isCrypto ? 2 : 2,
  }).format(amount || 0);
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas
 */
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

/** Generates the shareable 9:16 voucher or a redacted table thumbnail. */
export async function generateTokenVoucherDataUrl(token: CashToken, preview = false): Promise<string> {
  const width = 540;
  const height = 960;
  const scale = preview ? 0.25 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar Canvas');

  const state = getTokenState(token);
  const delivered = state === 'entregado';
  const badge = {
    activo: { label: 'PENDIENTE DE ENTREGA', color: '#7dd3fc', background: '#12324b' },
    entregado: { label: 'ENTREGADO', color: '#86efac', background: '#153b35' },
    cancelado: { label: 'CANCELADO', color: '#fecaca', background: '#492736' },
    expirado: { label: 'EXPIRADO', color: '#cbd5e1', background: '#293649' },
  }[state];

  ctx.scale(scale, scale);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0b2540');
  gradient.addColorStop(1, '#080f1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const box = (x: number, y: number, w: number, h: number, radius: number, color: string) => {
    roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const write = (value: string, y: number, font: string, color: string, maxWidth = 412) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(value, width / 2, y, maxWidth);
  };
  const font = '"Segoe UI", sans-serif';
  const muted = '#b3c1d4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  logoPromise ??= loadImage('/iso-type-white.png').catch(() => null);
  const logo = await logoPromise;
  if (logo) {
    const ratio = Math.min(62 / logo.width, 62 / logo.height);
    const logoWidth = logo.width * ratio;
    const logoHeight = logo.height * ratio;
    ctx.drawImage(logo, (width - logoWidth) / 2, 26 + (62 - logoHeight) / 2, logoWidth, logoHeight);
  }
  write('KAUPALOKI', 112, `700 25px ${font}`, '#ffffff');
  write('TESORERÍA · CONTROL DE EFECTIVO', 141, `600 13px ${font}`, muted);

  box(28, 166, 484, 762, 28, '#101d30');
  ctx.strokeStyle = '#284461';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  box(146, 190, 248, 36, 18, badge.background);
  write(badge.label, 208, `700 15px ${font}`, badge.color);
  write(delivered ? 'COMPROBANTE DE ENTREGA' : 'VALE DE AUTORIZACIÓN', 256, `600 18px ${font}`, muted);
  write(`${token.divisa} $${formatCurrencyAmount(token.monto, token.divisa)}`, 305, `700 48px ${font}`, '#ffffff');
  if (token.codigo) write(`N.º ${token.codigo}`, 348, `600 18px ${font}`, badge.color);

  const qrSize = 252;
  const qrX = (width - qrSize) / 2;
  const qrY = 376;
  if (preview) {
    box(qrX, qrY, qrSize, qrSize, 22, '#1b304b');
    write('VER VALE', qrY + qrSize / 2, `700 26px ${font}`, muted);
  } else {
    box(qrX, qrY, qrSize, qrSize, 22, '#ffffff');
    const qrDataUrl = await QRCode.toDataURL(token.token_code.trim().toUpperCase(), {
      margin: 4,
      width: qrSize - 12,
      color: { dark: '#080f1e', light: '#ffffff' },
    });
    const qr = await loadImage(qrDataUrl);
    ctx.drawImage(qr, qrX + 6, qrY + 6, qrSize - 12, qrSize - 12);
  }

  write('CÓDIGO DE VALIDACIÓN', 661, `600 15px ${font}`, muted);
  box(114, 682, 312, 56, 14, '#0a1424');
  write(preview ? '••••••••' : token.token_code.toUpperCase(), 710, '700 31px Consolas, monospace', badge.color, 278);

  const reference = token.referencia?.trim().toUpperCase();
  if (reference) {
    const label = reference.length > 42 ? reference.slice(0, 41) + '…' : reference;
    write(label, 770, `600 20px ${font}`, '#f1f5f9');
  }
  const date = delivered ? token.redeemed_at : token.expires_at;
  if (date && Number.isFinite(Date.parse(date))) {
    const formatted = new Date(date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    const label = delivered ? 'Entregado' : state === 'expirado' ? 'Venció' : 'Válido hasta';
    write(`${label} · ${formatted}`, 808, `500 17px ${font}`, muted);
  }
  if (delivered && token.redeemed_by_name) {
    write(`Entregado por ${token.redeemed_by_name}`, 839, `500 16px ${font}`, muted);
  }

  box(66, 862, 408, 1, 0, '#284461');
  write('Uso interno para entregas en efectivo en caja.', 890, `500 14px ${font}`, muted);

  return canvas.toDataURL('image/png');
}

/**
 * Utility to download the generated token voucher image
 */
export async function downloadTokenVoucher(token: CashToken, precomputedDataUrl?: string) {
  const dataUrl = precomputedDataUrl || (await generateTokenVoucherDataUrl(token));
  const link = document.createElement('a');
  const cleanCode = (token.codigo || token.token_code || 'token').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Token_${cleanCode}_${token.estado || 'activo'}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
