/**
 * Utility to download or share files reliably across desktop and mobile (especially iOS Safari / iPhone).
 * On iOS, standard <a download> often fails or hangs on blobs/dataUrls.
 * Using navigator.share({ files }) triggers the native iOS share sheet ("Guardar imagen" / "Guardar en Archivos").
 */

export function isIosDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function downloadBlobOrDataUrl(
  source: Blob | string,
  filename: string,
  title?: string
): Promise<void> {
  const blob: Blob = typeof source === 'string' ? await dataUrlToBlob(source) : source;
  const isIos = isIosDevice();

  // Try Web Share API with files on iOS/mobile to open system "Guardar imagen" / "Guardar en Archivos"
  if (isIos && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || filename,
        });
        return;
      }
    } catch (err: any) {
      // If user cancelled the share sheet (AbortError), exit cleanly without falling back
      if (err?.name === 'AbortError') return;
      console.warn('Web Share API falló, reintentando con descarga tradicional:', err);
    }
  }

  // Standard <a download> approach
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Keep blob URL alive long enough for mobile browser engines to finish processing (do NOT revoke immediately!)
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);
}
