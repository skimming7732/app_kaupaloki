import React, { useState } from 'react';

interface EstadoTransitoSelectProps {
  estado: 'recibido' | 'pendiente' | string;
  disabled?: boolean;
  tipo: 'compra' | 'venta';
  onCambiarEstado: (nuevoEstado: 'recibido' | 'pendiente') => Promise<void>;
  className?: string;
}

export const EstadoTransitoSelect: React.FC<EstadoTransitoSelectProps> = ({
  estado,
  disabled = false,
  tipo,
  onCambiarEstado,
  className = '',
}) => {
  const [busy, setBusy] = useState(false);
  const current = estado === 'pendiente' ? 'pendiente' : 'recibido';

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as 'recibido' | 'pendiente';
    if (next === current || busy) return;

    const confirmMsg = next === 'recibido'
      ? (tipo === 'compra'
          ? '¿Confirmas que los USDT ya fueron recibidos en la wallet de destino? Sumará de inmediato al saldo de la billetera.'
          : '¿Confirmas que los fondos en COP ya fueron recibidos en la cuenta de destino? Sumará de inmediato al saldo contable.')
      : (tipo === 'compra'
          ? '¿Deseas cambiar el estado a "Por recibir (En tránsito)"? Se restará de la billetera destino hasta confirmar recepción.'
          : '¿Deseas cambiar el estado a "Por recibir (En tránsito)"? Se restará de la cuenta destino hasta confirmar recepción.');

    if (!window.confirm(confirmMsg)) {
      e.target.value = current;
      return;
    }

    setBusy(true);
    try {
      await onCambiarEstado(next);
    } catch (err: any) {
      alert(err?.message || 'Error al cambiar el estado.');
      e.target.value = current;
    } finally {
      setBusy(false);
    }
  };

  const isRecibido = current === 'recibido';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all border shadow-xs relative select-none ${
        isRecibido
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
      } ${disabled || busy ? 'opacity-70 cursor-wait' : 'cursor-pointer'} ${className}`}
    >
      <i
        className={`${
          busy
            ? 'ri-loader-4-line animate-spin'
            : isRecibido
            ? 'ri-checkbox-circle-fill'
            : 'ri-time-line animate-pulse'
        } text-xs shrink-0 pointer-events-none`}
      />

      <select
        value={current}
        disabled={disabled || busy}
        onChange={handleChange}
        className="appearance-none bg-transparent font-bold cursor-pointer pr-3.5 focus:outline-none text-[11px] text-inherit border-none"
        title="Cambiar estado de recepción de fondos"
      >
        <option value="recibido" className="bg-card text-foreground font-semibold">
          Recibido
        </option>
        <option value="pendiente" className="bg-card text-foreground font-semibold">
          Por recibir
        </option>
      </select>

      <i className="ri-arrow-down-s-line text-xs pointer-events-none absolute right-2 opacity-70" />
    </div>
  );
};
