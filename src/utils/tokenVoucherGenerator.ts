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

/**
 * Generates a 9:16 (540x960) high-resolution PNG data URL for a cash token
 */
export async function generateTokenVoucherDataUrl(token: TokenVoucherData): Promise<string> {
  const width = 540;
  const height = 960;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto de Canvas');

  const isCancelled = token.estado === 'cancelado' || token.estado === 'cancelled';
  const isRedeemed = token.estado === 'entregado' || token.estado === 'redeemed';
  const isExpired = token.estado === 'expirado' || token.estado === 'expired';

  // 1. Background fill
  let bgColor = '#070b14'; // Kaupaloki dark navy
  if (isCancelled) bgColor = '#140c0e';
  else if (isRedeemed) bgColor = '#05140d';
  else if (isExpired) bgColor = '#121214';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Glow effects
  const drawGlow = (
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number
  ) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  if (isCancelled) {
    drawGlow(width * 0.8, height * 0.15, 300, '#ef4444', 0.25);
    drawGlow(width * 0.2, height * 0.85, 300, '#f97316', 0.15);
  } else if (isRedeemed) {
    drawGlow(width * 0.8, height * 0.15, 320, '#10b981', 0.28);
    drawGlow(width * 0.2, height * 0.85, 300, '#059669', 0.2);
  } else {
    // Kaupaloki theme glows
    drawGlow(width * 0.85, height * 0.12, 340, '#0284c7', 0.22);
    drawGlow(width * 0.15, height * 0.88, 320, '#06b6d4', 0.18);
    drawGlow(width * 0.5, height * 0.45, 260, '#3b82f6', 0.08);
  }

  // 3. Subtle grid pattern or border accent
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 30; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 30; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Logo header
  let logoDrawn = false;
  try {
    const logoImg = await loadImage('/iso-type-white.png');
    const logoWidth = 64;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    ctx.drawImage(logoImg, width / 2 - logoWidth / 2, 45, logoWidth, logoHeight);
    logoDrawn = true;
  } catch (err) {
    console.warn('No se pudo cargar /iso-type-white.png, dibujando fallback', err);
  }

  // Brand Name
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('KAUPALOKI', width / 2, logoDrawn ? 130 : 70);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.font = '600 10px "Inter", "Segoe UI", system-ui, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('TESORERÍA • CONTROL DE EFECTIVO', width / 2, logoDrawn ? 148 : 90);
  ctx.restore();

  // 5. Main Card Container
  const cardX = 35;
  const cardY = logoDrawn ? 175 : 120;
  const cardW = width - 70;
  const cardH = 720;

  // Glass card background
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fill();
  ctx.strokeStyle = isCancelled
    ? 'rgba(239, 68, 68, 0.35)'
    : isRedeemed
    ? 'rgba(16, 185, 129, 0.4)'
    : 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  let curY = cardY + 36;

  // 6. Status Banner (if not active)
  if (isCancelled || isRedeemed || isExpired) {
    const badgeText = isCancelled ? 'CANCELADO' : isRedeemed ? 'ENTREGADO / REDIMIDO' : 'EXPIRADO';
    const badgeBg = isCancelled
      ? 'rgba(239, 68, 68, 0.15)'
      : isRedeemed
      ? 'rgba(16, 185, 129, 0.18)'
      : 'rgba(100, 116, 139, 0.2)';
    const badgeBorder = isCancelled ? '#ef4444' : isRedeemed ? '#10b981' : '#64748b';
    const badgeColor = isCancelled ? '#fca5a5' : isRedeemed ? '#6ee7b7' : '#cbd5e1';

    ctx.save();
    const badgeW = 230;
    const badgeH = 34;
    const badgeX = width / 2 - badgeW / 2;
    roundRect(ctx, badgeX, curY - 10, badgeW, badgeH, 17);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 12px "Inter", "Segoe UI", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(badgeText, width / 2, curY + 12);
    ctx.restore();

    curY += 46;
  }

  // 7. Token Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('VALE DE AUTORIZACIÓN', width / 2, curY);
  curY += 34;

  // 8. Amount Display
  const formattedAmount = formatCurrencyAmount(token.monto, token.divisa);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(`${token.divisa} $${formattedAmount}`, width / 2, curY);
  curY += 28;

  if (token.codigo) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
    ctx.font = '600 13px monospace';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(`N° ${token.codigo}`, width / 2, curY);
  }
  ctx.restore();

  curY += 24;

  // 9. QR Code Box
  const qrBoxSize = 220;
  const qrBoxX = width / 2 - qrBoxSize / 2;
  const qrBoxY = curY;

  ctx.save();
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 20;
  ctx.restore();

  // Generate QR Code data URL
  try {
    const qrDataUrl = await QRCode.toDataURL(token.token_code.trim().toUpperCase(), {
      margin: 1,
      width: qrBoxSize - 24,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrBoxX + 12, qrBoxY + 12, qrBoxSize - 24, qrBoxSize - 24);
  } catch (err) {
    console.error('Error generando QR code:', err);
  }

  curY += qrBoxSize + 28;

  // 10. Monospace Token Code
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.font = '500 10px "Inter", "Segoe UI", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('CÓDIGO DE VALIDACIÓN', width / 2, curY);
  curY += 26;

  // Pill for code
  const codePillW = 240;
  const codePillH = 44;
  const codePillX = width / 2 - codePillW / 2;
  roundRect(ctx, codePillX, curY - 14, codePillW, codePillH, 12);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px "SF Mono", "Consolas", monospace';
  ctx.letterSpacing = '4px';
  ctx.fillText(token.token_code.toUpperCase(), width / 2, curY + 16);
  ctx.restore();

  curY += 46;

  // 11. Reference / Recipient (if any)
  if (token.referencia && token.referencia.trim()) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '500 13px "Inter", "Segoe UI", sans-serif';
    const truncatedRef =
      token.referencia.length > 36
        ? token.referencia.substring(0, 36) + '...'
        : token.referencia;
    ctx.fillText(`Ref / Beneficiario: ${truncatedRef}`, width / 2, curY);
    ctx.restore();
    curY += 22;
  }

  // 12. Expiration Date & Security Notice
  ctx.save();
  ctx.textAlign = 'center';

  if (isRedeemed && token.redeemed_at) {
    const redDate = new Date(token.redeemed_at).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '500 11px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`Entregado: ${redDate}${token.redeemed_by_name ? ` por ${token.redeemed_by_name}` : ''}`, width / 2, curY);
    curY += 20;
  } else if (token.expires_at) {
    const expDate = new Date(token.expires_at).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    ctx.fillStyle = isExpired ? '#f87171' : 'rgba(148, 163, 184, 0.7)';
    ctx.font = '500 11px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`Válido hasta: ${expDate}`, width / 2, curY);
    curY += 20;
  }

  // Security microcopy
  ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
  ctx.font = '400 9.5px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Este vale es de uso interno operativo para entrega en caja.', width / 2, curY + 4);
  ctx.fillText('No constituye valor negociable ni afecta saldos contables.', width / 2, curY + 18);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Utility to download the generated token voucher image
 */
export async function downloadTokenVoucher(token: TokenVoucherData, precomputedDataUrl?: string) {
  const dataUrl = precomputedDataUrl || (await generateTokenVoucherDataUrl(token));
  const link = document.createElement('a');
  const cleanCode = (token.codigo || token.token_code || 'token').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Token_${cleanCode}_${token.estado || 'activo'}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
