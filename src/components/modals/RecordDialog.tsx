import React, { useEffect, useId, useRef } from 'react';

interface RecordDialogProps {
  title: string;
  description: string;
  icon: string;
  busy?: boolean;
  error?: string | null;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const recordFieldClass = 'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';
export const recordLabelClass = 'block space-y-1.5 text-sm font-medium text-foreground';
export const recordButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';

export const RecordDialog = ({ title, description, icon, busy, error, wide, onClose, children }: RecordDialogProps) => {
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
      className={
        'overflow-y-auto border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm ' +
        'max-sm:fixed max-sm:inset-0 max-sm:m-0 max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 ' +
        'sm:m-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:border ' +
        (wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')
      }
    >
      <header className="flex items-start gap-3 border-b border-border p-4 sm:p-6 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary">
          <i className={icon} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id={titleId} className="text-base sm:text-lg font-bold truncate">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <i className="ri-close-line text-xl" aria-hidden="true" />
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
          className="min-h-11 rounded-xl px-3 sm:px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center justify-center gap-1.5"
          title={deleteLabel}
          aria-label={deleteLabel}
        >
          {isDeleting ? <i className="ri-loader-4-line animate-spin text-sm" /> : <i className="ri-delete-bin-line text-sm" />}
          <span className="hidden sm:inline">{deleteLabel}</span>
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
