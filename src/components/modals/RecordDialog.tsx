import React, { useEffect, useId, useRef } from 'react';

interface RecordDialogProps {
  title: string;
  description: string;
  icon: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  children: React.ReactNode;
}

export const recordFieldClass = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
export const recordLabelClass = 'block space-y-1.5 text-sm font-medium text-foreground';
export const recordButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';

export const RecordDialog = ({ title, description, icon, busy, error, onClose, children }: RecordDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <header className="flex items-start gap-3 border-b border-border p-4 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
          <i className={icon} aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-lg px-2 py-1 text-lg text-muted-foreground hover:bg-muted">
          <i className="ri-close-line" aria-hidden="true" />
        </button>
      </header>
      {error && <p role="alert" className="mx-4 mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive sm:mx-6">{error}</p>}
      <div className="p-4 sm:p-6">{children}</div>
    </dialog>
  );
};

export const RecordActions = ({
  busy,
  label,
  onClose,
  submitDisabled,
  onDelete,
  deleteLabel = 'Eliminar',
  isDeleting = false,
}: {
  busy: boolean;
  label: string;
  onClose: () => void;
  submitDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  isDeleting?: boolean;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
    <div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || isDeleting}
          className="min-h-11 rounded-xl px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
        >
          {isDeleting ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-delete-bin-line" />}
          <span>{deleteLabel}</span>
        </button>
      )}
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={onClose} disabled={busy || isDeleting} className="min-h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-muted">
        Cancelar
      </button>
      <button type="submit" disabled={busy || isDeleting || submitDisabled} className={recordButtonClass}>
        {busy ? 'Guardando…' : label}
      </button>
    </div>
  </div>
);
