import React, { useState } from 'react';
import { currencyFlagUrl } from '../../utils/formatters';
import { recordFieldClass } from './RecordDialog';

export function CurrencyFlagField({ codigo, initialUrl }: { codigo: string; initialUrl?: string }) {
  const [manual, setManual] = useState(Boolean(initialUrl && !initialUrl.includes('airtableusercontent.com/') && initialUrl !== currencyFlagUrl(codigo)));
  const [url, setUrl] = useState(initialUrl || '');
  const [error, setError] = useState('');
  const [failed, setFailed] = useState('');
  const image = manual ? url : currencyFlagUrl(codigo);
  const validManual = /^https:\/\//i.test(url) || /^data:image\/(png|jpeg|webp);base64,/i.test(url);
  return <div className="space-y-2 sm:col-span-2">
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={!manual} onChange={(event) => { setManual(!event.target.checked); setError(''); }} />
      Detectar bandera automáticamente
    </label>
    <input type="hidden" name="bandera_url" value={image || ''} />
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
      {image && image !== failed
        ? <img key={image} src={image} alt="Vista previa de bandera" className="h-6 w-9 shrink-0 rounded object-contain" onError={() => setFailed(image)} />
        : <i className="ri-global-line text-xl text-muted-foreground" aria-hidden="true" />}
      <p className="text-xs text-muted-foreground">{image && image !== failed ? 'Vista previa de la bandera' : 'Sin bandera detectada. Puedes indicar una URL o subir una imagen.'}</p>
    </div>
    {manual && <>
      <label className="block space-y-1 text-xs font-medium">
        URL de la bandera (opcional)
        <input type="text" value={url.startsWith('data:') ? '' : url} onChange={(event) => { setUrl(event.target.value.trim()); setError(''); }} placeholder="https://…" className={recordFieldClass} aria-invalid={Boolean(url && !validManual)} />
      </label>
      <label className="block space-y-1 text-xs font-medium">
        Subir bandera (PNG, JPG o WebP, máximo 256 KB)
        <input type="file" accept="image/png,image/jpeg,image/webp" className={recordFieldClass} onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 256 * 1024) {
            setError('Selecciona una imagen PNG, JPG o WebP de hasta 256 KB.');
            event.target.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => { setUrl(String(reader.result)); setError(''); };
          reader.onerror = () => setError('No se pudo leer la imagen.');
          reader.readAsDataURL(file);
        }} />
      </label>
    </>}
    {(error || (manual && url && !validManual)) && <p role="alert" className="text-xs text-destructive">{error || 'Usa una URL HTTPS válida o sube una imagen.'}</p>}
  </div>;
}
