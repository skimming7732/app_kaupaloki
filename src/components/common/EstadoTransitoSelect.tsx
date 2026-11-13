import React, { useState, useRef, useEffect } from 'react';

export interface EstadoOption<T extends string = string> {
  value: T;
  label: string;
  description: string;
  icon: string;
  badgeClass: string;
  iconClass: string;
}

interface EstadoTransitoSelectProps {
  estado: 'recibido' | 'pendiente' | string;
  disabled?: boolean;
  tipo?: 'compra' | 'venta';
  onCambiarEstado: (nuevoEstado: 'recibido' | 'pendiente') => Promise<void>;
  className?: string;
  align?: 'left' | 'right';
}

const USDT_OPTIONS: EstadoOption<'recibido' | 'pendiente'>[] = [
  {
    value: 'recibido',
    label: 'Recibido',
    description: 'Fondos disponibles en destino',
    icon: 'ri-checkbox-circle-fill',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    iconClass: 'text-emerald-500',
  },
  {
    value: 'pendiente',
    label: 'Por recibir',
    description: 'En tránsito / por confirmar recepción',
    icon: 'ri-time-line',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
    iconClass: 'text-amber-500',
  },
];

export const EstadoTransitoSelect: React.FC<EstadoTransitoSelectProps> = ({
  estado,
  disabled = false,
  tipo = 'compra',
  onCambiarEstado,
  className = '',
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = (estado === 'pendiente' ? 'pendiente' : 'recibido') as 'recibido' | 'pendiente';
  const currentOption = USDT_OPTIONS.find((opt) => opt.value === current) || USDT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = async (next: 'recibido' | 'pendiente') => {
    setOpen(false);
    if (next === current || busy || disabled) return;

    const confirmMsg =
      next === 'recibido'
        ? tipo === 'compra'
          ? '¿Confirmas que los USDT ya fueron recibidos en la wallet de destino? Sumará de inmediato al saldo de la billetera.'
          : '¿Confirmas que los fondos en COP ya fueron recibidos en la cuenta de destino? Sumará de inmediato al saldo contable.'
        : tipo === 'compra'
        ? '¿Deseas cambiar el estado a "Por recibir (En tránsito)"? Se restará de la billetera destino hasta confirmar recepción.'
        : '¿Deseas cambiar el estado a "Por recibir (En tránsito)"? Se restará de la cuenta destino hasta confirmar recepción.';

    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    try {
      await onCambiarEstado(next);
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar el estado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button / Badge */}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => !disabled && !busy && setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all border shadow-xs ${
          currentOption.badgeClass
        } ${disabled ? 'opacity-50 cursor-not-allowed' : busy ? 'cursor-wait opacity-80' : 'cursor-pointer active:scale-95'}`}
        title="Clic para cambiar estado de recepción"
      >
        <i
          className={`${
            busy
              ? 'ri-loader-4-line animate-spin'
              : current === 'recibido'
              ? 'ri-checkbox-circle-fill'
              : 'ri-time-line animate-pulse'
          } text-xs shrink-0`}
        />
        <span>{busy ? 'Guardando…' : currentOption.label}</span>
        <i
          className={`ri-arrow-down-s-line text-xs opacity-75 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu with rich styling */}
      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[220px] w-max rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            Cambiar estado de fondos
          </div>

          <div className="space-y-1">
            {USDT_OPTIONS.map((opt) => {
              const isSelected = opt.value === current;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                    isSelected
                      ? 'bg-muted font-bold'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        opt.value === 'recibido'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <i className={`${opt.icon} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight truncate">
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <i className="ri-check-line text-sm font-bold text-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   DispersionStatusDropdown: Dropdown with identical cohesive styling
   for Dispersiones (Completado / Rechazado)
   ========================================================================= */
interface DispersionStatusDropdownProps {
  estado: string;
  disabled?: boolean;
  onCambiarEstado: (nuevoEstado: 'COMPLETADO' | 'RECHAZADO') => Promise<void>;
  className?: string;
  align?: 'left' | 'right';
}

const DISPERSION_OPTIONS: EstadoOption<'COMPLETADO' | 'RECHAZADO'>[] = [
  {
    value: 'COMPLETADO',
    label: 'Completado',
    description: 'Transferencia realizada con éxito',
    icon: 'ri-checkbox-circle-fill',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
    iconClass: 'text-emerald-500',
  },
  {
    value: 'RECHAZADO',
    label: 'Rechazado',
    description: 'Transferencia fallida / no debitada',
    icon: 'ri-close-circle-fill',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25',
    iconClass: 'text-destructive',
  },
];

export const DispersionStatusDropdown: React.FC<DispersionStatusDropdownProps> = ({
  estado,
  disabled = false,
  onCambiarEstado,
  className = '',
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRechazado = String(estado || '').trim().toUpperCase() === 'RECHAZADO';
  const current: 'COMPLETADO' | 'RECHAZADO' = isRechazado ? 'RECHAZADO' : 'COMPLETADO';
  const currentOption = DISPERSION_OPTIONS.find((opt) => opt.value === current) || DISPERSION_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = async (next: 'COMPLETADO' | 'RECHAZADO') => {
    setOpen(false);
    if (next === current || busy || disabled) return;

    const confirmMsg =
      next === 'COMPLETADO'
        ? '¿Confirmas marcar esta dispersión como COMPLETADA? Debitará el monto del saldo origen.'
        : '¿Confirmas RECHAZAR esta dispersión? No debitará del saldo contable ni contará en el total pagado.';

    if (!window.confirm(confirmMsg)) return;

    setBusy(true);
    try {
      await onCambiarEstado(next);
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar el estado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left select-none ${className}`}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => !disabled && !busy && setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all border shadow-xs ${
          currentOption.badgeClass
        } ${disabled ? 'opacity-50 cursor-not-allowed' : busy ? 'cursor-wait opacity-80' : 'cursor-pointer active:scale-95'}`}
        title="Clic para cambiar estado de la dispersión"
      >
        <i
          className={`${
            busy
              ? 'ri-loader-4-line animate-spin'
              : current === 'COMPLETADO'
              ? 'ri-checkbox-circle-fill'
              : 'ri-close-circle-fill'
          } text-xs shrink-0`}
        />
        <span>{busy ? 'Guardando…' : currentOption.label}</span>
        <i
          className={`ri-arrow-down-s-line text-xs opacity-75 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[220px] w-max rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            Estado de dispersión
          </div>

          <div className="space-y-1">
            {DISPERSION_OPTIONS.map((opt) => {
              const isSelected = opt.value === current;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                    isSelected
                      ? 'bg-muted font-bold'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        opt.value === 'COMPLETADO'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      <i className={`${opt.icon} text-sm`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold leading-tight text-foreground">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight truncate">
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <i
                      className={`ri-check-line text-sm font-bold shrink-0 ${
                        opt.value === 'COMPLETADO' ? 'text-emerald-500' : 'text-destructive'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
