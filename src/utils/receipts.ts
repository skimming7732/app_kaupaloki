import { receiptFileError } from './receiptFiles';
export { receiptAccept } from './receiptFiles';
import { supabase } from '../lib/supabase';

const bucket = 'comprobantes';
const prefix = 'storage:';
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Compresses receipt images on the client before upload to minimize storage & bandwidth.
 * Scales photos to max 1600px width / 2000px height with 0.80 JPEG quality.
 * Typical phone camera photos drop from 5-10MB to 120-250KB without sacrificing readability.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 2000;
        let { width, height } = img;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width / MAX_WIDTH > height / MAX_HEIGHT) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // White background for receipts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const compressed = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          'image/jpeg',
          0.80
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadReceipt(file: FormDataEntryValue | null, folder: 'gastos' | 'dispersiones') {
  if (!(file instanceof File) || !file.name) return undefined;

  const problem = receiptFileError(file);
  if (problem) throw new Error(problem);

  // Compress image if applicable
  const fileToUpload = await compressImage(file);
  const extension = extensions[fileToUpload.type] || 'jpg';

  if (!fileToUpload.size || fileToUpload.size > 10 * 1024 * 1024) {
    throw new Error('Selecciona una imagen o PDF de hasta 10 MB.');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Inicia sesión para subir el comprobante.');

  const path = folder + '/' + user.id + '/' + crypto.randomUUID() + '.' + extension;
  const { error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
    contentType: fileToUpload.type,
    upsert: false,
  });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error('No se pudo subir el comprobante a storage: ' + error.message);
  }

  return prefix + path;
}

export async function receiptPreviewUrl(receipt: string) {
  if (!receipt.startsWith(prefix)) {
    if (!/^https?:\/\//i.test(receipt)) throw new Error('Comprobante inválido.');
    return receipt;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(receipt.slice(prefix.length), 900);
  if (error) throw error;
  return data.signedUrl;
}
