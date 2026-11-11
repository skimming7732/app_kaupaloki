import React, { useEffect } from 'react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onClear?: () => void;
  activeCount?: number;
  children: React.ReactNode;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  title = 'Filtros',
  onClear,
  activeCount = 0,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg flex flex-col rounded-none sm:rounded-2xl bg-card border-0 sm:border sm:border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <i className="ri-filter-3-line text-lg" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>{title}</span>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    {activeCount} activo{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground">Filtra y personaliza los registros visibles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="Cerrar modal de filtros"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {children}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          {onClear && activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1 py-1 px-2"
            >
              <i className="ri-delete-bin-line" />
              <span>Limpiar filtros</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            Aplicar y ver registros
          </button>
        </div>
      </div>
    </div>
  );
};

export const FilterTriggerButton: React.FC<{
  onClick: () => void;
  activeCount?: number;
  label?: string;
  className?: string;
}> = ({ onClick, activeCount = 0, label = 'Filtros', className = '' }) => {
  const hasActive = activeCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
        hasActive
          ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
          : 'border-input bg-background hover:bg-muted/50 text-foreground'
      } ${className}`}
      title="Abrir filtros"
    >
      <i className="ri-filter-3-line text-sm" />
      <span className="hidden sm:inline">{label}</span>
      {hasActive && (
        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
          {activeCount}
        </span>
      )}
    </button>
  );
};
