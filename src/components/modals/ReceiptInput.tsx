import React, { useEffect, useId, useRef, useState } from 'react';
import { receiptAccept, receiptFileError, receiptFileSize } from '../../utils/receiptFiles';

export const ReceiptInput = ({ required = false, disabled = false }: { required?: boolean; disabled?: boolean }) => {
  const id = useId();
  const area = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const shortcut = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ + V' : 'Ctrl + V';
  const unavailable = () => disabled || Boolean(input.current?.matches(':disabled'));

  const chooseFiles = (files: File[]) => {
    if (unavailable() || files.length === 0) return;
    const problem = files.length > 1 ? 'Adjunta un comprobante a la vez.' : receiptFileError(files[0]);
    if (problem) {
      setError(problem);
      // Keep the last valid selection in FormData when a replacement is rejected.
      if (input.current) {
        const selection = new DataTransfer();
        if (file) selection.items.add(file);
        input.current.files = selection.files;
      }
      return;
    }
    const selection = new DataTransfer();
    selection.items.add(files[0]);
    if (input.current) input.current.files = selection.files;
    setFile(files[0]);
    setError('');
    setHint('');
  };

  useEffect(() => {
    if (!file?.type.startsWith('image/')) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const container = area.current?.closest('dialog') || area.current?.closest('form') || area.current;
    if (!container) return;
    const paste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || unavailable()) return;
      if (container instanceof HTMLDialogElement && event.target instanceof Element && event.target.closest('dialog') !== container) return;
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length === 0) {
        for (const entry of Array.from(event.clipboardData?.items || [])) {
          const pasted = entry.kind === 'file' ? entry.getAsFile() : null;
          if (pasted) files.push(pasted);
        }
      }
      if (files.length === 0) return; // Ordinary text pastes keep their normal behavior.
      event.preventDefault();
      chooseFiles(files);
    };
    const reset = () => {
      setFile(undefined);
      setError('');
      setHint('');
      setDragging(false);
      dragDepth.current = 0;
    };
    container.addEventListener('paste', paste as EventListener);
    container.addEventListener('reset', reset);
    return () => {
      container.removeEventListener('paste', paste as EventListener);
      container.removeEventListener('reset', reset);
    };
  }, [file, disabled]);

  const pasteFromClipboard = async () => {
    if (unavailable() || reading) return;
    area.current?.focus();
    if (!navigator.clipboard?.read) {
      setHint('Con la zona seleccionada, usa ' + shortcut + ' para pegar una imagen copiada.');
      return;
    }
    setReading(true);
    try {
      const entries = await navigator.clipboard.read();
      // Clipboard contents may offer the same image in several formats; take one.
      for (const entry of entries) {
        const type = entry.types.find((value) => receiptAccept.split(',').includes(value));
        if (!type) continue;
        const blob = await entry.getType(type);
        const extension = type === 'application/pdf' ? 'pdf' : type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
        chooseFiles([new File([blob], 'comprobante-pegado.' + extension, { type })]);
        return;
      }
      setHint('Copia una imagen o un archivo y pégalo en esta zona.');
    } catch {
      setHint('Puedes pegar directamente con ' + shortcut + ' en esta zona.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <i className="ri-attachment-2 text-primary" aria-hidden="true" /> Comprobante
        </label>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{required ? 'Obligatorio' : 'Opcional'}</span>
      </div>
      <div
        ref={area}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label="Adjuntar comprobante: arrastra un archivo o pega una imagen"
        aria-describedby={id + '-help' + (error ? ' ' + id + '-error' : '')}
        aria-disabled={disabled}
        className={`relative rounded-2xl border border-dashed p-4 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-5 ${dragging ? 'border-primary bg-primary/10 ring-2 ring-primary/15' : error ? 'border-destructive/50 bg-destructive/5' : 'border-primary/25 bg-gradient-to-br from-primary/5 via-background to-background'} ${disabled ? 'opacity-60' : ''}`}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          if (unavailable()) return;
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = unavailable() ? 'none' : 'copy';
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepth.current = 0;
          setDragging(false);
          chooseFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={input} id={id} type="file" name="comprobante" required={required} disabled={disabled} accept={receiptAccept}
          className="sr-only" tabIndex={-1} aria-describedby={id + '-help'} aria-invalid={Boolean(error)}
          onChange={(event) => chooseFiles(Array.from(event.currentTarget.files || []))}
          onInvalid={(event) => { event.preventDefault(); setError('Adjunta un comprobante para continuar.'); area.current?.focus(); }}
        />
        {file ? (
          <div className="mb-4 flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {preview ? <img src={preview} alt="Vista previa del comprobante" className="h-full w-full object-contain" /> : <i className="ri-file-pdf-2-line text-2xl text-primary" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground" title={file.name}>{file.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{file.type === 'application/pdf' ? 'PDF' : 'Imagen'} · {receiptFileSize(file.size)}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"><i className="ri-checkbox-circle-line" aria-hidden="true" /> Listo para adjuntar</p>
            </div>
            <button type="button" disabled={disabled} aria-label="Quitar comprobante" title="Quitar comprobante" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50" onClick={() => {
              if (unavailable()) return;
              if (input.current) input.current.value = '';
              setFile(undefined); setError(''); setHint(''); area.current?.focus();
            }}><i className="ri-close-line text-lg" aria-hidden="true" /></button>
          </div>
        ) : (
          <div className="mb-4 flex flex-col items-center text-center">
            <span className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform ${dragging ? '-translate-y-1' : ''}`}><i className="ri-upload-cloud-2-line text-2xl" aria-hidden="true" /></span>
            <p className="text-sm font-semibold text-foreground">{dragging ? 'Suelta aquí tu comprobante' : 'Arrastra tu comprobante aquí'}</p>
            <p className="mt-1 text-xs text-muted-foreground">También puedes pegar una imagen copiada.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={disabled || reading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50" onClick={() => { if (!unavailable()) input.current?.click(); }}><i className="ri-folder-open-line" aria-hidden="true" /> {file ? 'Cambiar archivo' : 'Elegir archivo'}</button>
          <button type="button" disabled={disabled || reading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50" onClick={() => void pasteFromClipboard()}><i className={reading ? 'ri-loader-4-line animate-spin' : 'ri-clipboard-line'} aria-hidden="true" /> {reading ? 'Leyendo…' : 'Pegar imagen'}</button>
        </div>
        <p id={id + '-help'} className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">JPG, PNG, WEBP o PDF · Hasta 10 MB <span className="hidden sm:inline">· Pega con {shortcut}</span></p>
        {hint && <p role="status" className="mt-2 text-center text-xs text-muted-foreground">{hint}</p>}
      </div>
      {error && <p id={id + '-error'} role="alert" className="flex items-start gap-1.5 text-xs text-destructive"><i className="ri-error-warning-line shrink-0" aria-hidden="true" />{error}</p>}
    </div>
  );
};
