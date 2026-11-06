import { supabase } from '../lib/supabase';

const bucket = 'comprobantes';
const prefix = 'storage:';
export const receiptAccept = 'image/jpeg,image/png,image/webp,application/pdf';
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

export async function uploadReceipt(file: FormDataEntryValue | null, folder: 'gastos' | 'dispersiones') {
  if (!(file instanceof File) || !file.name) return undefined;
  const extension = extensions[file.type];
  if (!extension || !file.size || file.size > 10 * 1024 * 1024) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP, o un PDF de hasta 10 MB.');
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Inicia sesión para subir el comprobante.');
  const path = folder + '/' + user.id + '/' + crypto.randomUUID() + '.' + extension;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw new Error('No se pudo subir el comprobante.');
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
