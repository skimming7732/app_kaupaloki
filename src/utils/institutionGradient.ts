/**
 * Utility to calculate high-contrast, visually stunning card gradients
 * based on the institution's brand color, adhering to contrast and aesthetic rules.
 */

export interface GradientOptions {
  color?: string | null;
  institutionName?: string | null;
  network?: string | null;
  fallbackIndex?: number;
  isDark?: boolean;
}

export const KNOWN_BRAND_COLORS: Record<string, string> = {
  bancolombia: '#F5A623',
  davivienda: '#ED1C24',
  bbva: '#004481',
  nequi: '#200020',
  bogota: '#003882',
  occidente: '#004A97',
  scotiabank: '#EC111A',
  colpatria: '#EC111A',
  itau: '#EC7000',
  falabella: '#509E2F',
  nu: '#820AD1',
  nubank: '#820AD1',
  binance: '#F0B90B',
  tronlink: '#10B981',
  tron: '#10B981',
  polygon: '#8247E5',
  matic: '#8247E5',
  kraken: '#5741D9',
  bitso: '#00EA90',
  metamask: '#E2761B',
  efectivo: '#059669',
  caja: '#059669',
  licoin: '#4F46E5',
};

export const POPULAR_PRESET_COLORS = [
  { label: 'Horizon Blue', hex: '#4318FF' },
  { label: 'Bancolombia / Dorado', hex: '#F5A623' },
  { label: 'Davivienda / Rojo', hex: '#ED1C24' },
  { label: 'BBVA / Azul Marino', hex: '#004481' },
  { label: 'Nequi / Ciruela', hex: '#200020' },
  { label: 'TRON / Esmeralda', hex: '#10B981' },
  { label: 'Polygon / Violeta', hex: '#8247E5' },
  { label: 'Binance / Oro', hex: '#F0B90B' },
  { label: 'Nu / Morado', hex: '#820AD1' },
  { label: 'Itaú / Naranja', hex: '#EC7000' },
  { label: 'Kraken / Índigo', hex: '#5741D9' },
  { label: 'Titanio / Obsidian', hex: '#1E293B' },
];

export function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function adjustBrightness(r: number, g: number, b: number, factor: number): string {
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function blendWithDark(r: number, g: number, b: number, darkRatio: number = 0.5): string {
  const dr = 15;
  const dg = 23;
  const db = 42;
  return rgbToHex(
    r * (1 - darkRatio) + dr * darkRatio,
    g * (1 - darkRatio) + dg * darkRatio,
    b * (1 - darkRatio) + db * darkRatio
  );
}

export function resolveBrandColor(opts: GradientOptions): string {
  if (opts.color && opts.color.trim().startsWith('#')) {
    return opts.color.trim();
  }
  const nameNorm = (opts.institutionName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, val] of Object.entries(KNOWN_BRAND_COLORS)) {
    if (nameNorm.includes(key)) {
      return val;
    }
  }
  if (opts.network && opts.network.toLowerCase().includes('poly')) {
    return '#8247E5';
  }
  const fallbacks = [
    '#4318FF', // Horizon Blue
    '#10B981', // Tron Green
    '#8B5CF6', // Radiant Violet
    '#0EA5E9', // Sky Blue
    '#D97706', // Warm Amber
    '#059669', // Deep Emerald
  ];
  const idx = opts.fallbackIndex ?? 0;
  return fallbacks[idx % fallbacks.length];
}

/**
 * Returns a CSS background gradient style string guaranteeing:
 * - Never washes out white text (even for white/yellow brand colors).
 * - Adapts gracefully between light & dark themes.
 * - Gives luxury card aesthetic with high contrast.
 */
export function getInstitutionCardGradient(opts: GradientOptions): string {
  const isDark = opts.isDark ?? true;
  const hex = resolveBrandColor(opts);
  const rgb = parseHexToRgb(hex);

  if (!rgb) {
    return isDark
      ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
      : 'linear-gradient(135deg, #4318FF 0%, #2563EB 100%)';
  }

  const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b);

  // 1. Caso Blanco o Muy Claro (Luminosidad > 210)
  // Usamos Obsidian Black / Titanio con resplandor plateado en la esquina
  if (lum > 210) {
    return isDark
      ? 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0%, transparent 60%), linear-gradient(135deg, #090d16 0%, #1e293b 100%)'
      : 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22) 0%, transparent 60%), linear-gradient(135deg, #0f172a 0%, #334155 100%)';
  }

  // 2. Caso Amarillo / Oro Brillante (Luminosidad 155 a 210) — ej. Bancolombia, Binance
  // Fondo de carbón/ámbar profundo que se difumina al dorado, manteniendo texto blanco 100% legible
  if (lum >= 155) {
    return isDark
      ? 'linear-gradient(135deg, #18120c 0%, #78350f 45%, #92400e 80%, #b45309 100%)'
      : 'linear-gradient(135deg, #451a03 0%, #78350f 45%, #b45309 80%, #d97706 100%)';
  }

  // 3. Colores Estándar (Azul, Rojo, Morado, Verde, etc.)
  if (isDark) {
    const start = blendWithDark(rgb.r, rgb.g, rgb.b, 0.25);
    const end = blendWithDark(rgb.r, rgb.g, rgb.b, 0.65);
    return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  } else {
    const start = rgbToHex(rgb.r, rgb.g, rgb.b);
    const end = adjustBrightness(rgb.r, rgb.g, rgb.b, 0.65);
    return `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
  }
}
