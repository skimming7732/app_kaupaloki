export const receiptAccept = 'image/jpeg,image/png,image/webp,application/pdf';
export const receiptMaxBytes = 10 * 1024 * 1024;
const receiptTypes = new Set(receiptAccept.split(','));

export function receiptFileError(file: File): string | undefined {
  if (!receiptTypes.has(file.type)) return 'Usa una imagen JPG, PNG o WEBP, o un archivo PDF.';
  if (!file.size) return 'El archivo está vacío. Elige otro comprobante.';
  if (file.size > receiptMaxBytes) return 'El comprobante supera los 10 MB. Elige un archivo más pequeño.';
}

export function receiptFileSize(bytes: number): string {
  if (bytes < 1024) return new Intl.NumberFormat('en-US').format(bytes) + ' B';
  const unit = bytes >= 1024 * 1024 ? 'MB' : 'KB';
  const amount = bytes / (unit === 'MB' ? 1024 * 1024 : 1024);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(amount) + ' ' + unit;
}
