import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { ClientSearchSelect } from '../common/ClientSearchSelect';
import { formatCOP } from '../../utils/formatters';

interface AddEfectivoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddEfectivoModal: React.FC<AddEfectivoModalProps> = ({ isOpen, onClose }) => {
  const { createMovimientoEfectivo, createCliente, data } = useAirtable();

  // 1. Tipo
  const [tipo, setTipo] = useState<'Ingreso' | 'Pago'>('Pago');
  // 2. Cliente (opcional para ingreso, recomendado para pago)
  const [clienteId, setClienteId] = useState('');
  // 3. Referencia / PIN (opcional)
  const [referencia, setReferencia] = useState('');
  // 4. Monto (COP)
  const [monto, setMonto] = useState('');
  // 5. Fecha
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);

  // Quick Client Creation
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPais, setNewClientPais] = useState('Colombia');
  const [clientLoading, setClientLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickCreateClient = async () => {
    if (!newClientName.trim()) return;
    setClientLoading(true);
    setError(null);
    try {
      const res = await createCliente(newClientName.trim(), (newClientPais || 'Colombia').trim());
      const createdId = res?.created?.id || res?.id;
      if (createdId) {
        setClienteId(createdId);
      }
      setNewClientName('');
      setIsCreatingClient(false);
    } catch (err: any) {
      setError(err?.message || 'Error al crear cliente');
    } finally {
      setClientLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMonto = parseFloat(monto) || 0;
    if (parsedMonto <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = 'EFEC-' + Math.floor(1000 + Math.random() * 9000);
      const ok = await createMovimientoEfectivo({
        codigo: code,
        fecha: fecha || new Date().toISOString().split('T')[0],
        tipo: tipo,
        clienteId: clienteId || undefined,
        referencia: referencia.trim() || undefined,
        montoCop: parsedMonto,
      });
      if (!ok) {
        throw new Error('No se pudo guardar el movimiento en Airtable. Verifica la conexión.');
      }
      setMonto('');
      setReferencia('');
      setClienteId('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el movimiento de efectivo');
    } finally {
      setLoading(false);
    }
  };

  const parsedNumber = parseFloat(monto) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-xl rounded-3xl border border-border shadow-2xl p-6 sm:p-7 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl border border-emerald-500/20 shadow-sm">
              <i className="ri-money-dollar-circle-line" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Registrar Movimiento de Efectivo
              </h3>
              <p className="text-xs text-muted-foreground">
                Gestión de caja y pagos en efectivo a clientes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Inline Client Creator Sub-Form */}
        {isCreatingClient && (
          <div className="mb-5 p-4 rounded-2xl bg-muted/60 border border-primary/30 space-y-3.5 animate-fade-in shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <i className="ri-user-add-line text-primary text-sm" />
                Registrar y Asignar Nuevo Cliente
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingClient(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: MARÍA FERNANDA PÉREZ"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={newClientPais}
                  onChange={(e) => setNewClientPais(e.target.value)}
                  placeholder="Colombia"
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingClient(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleQuickCreateClient}
                disabled={clientLoading || !newClientName.trim()}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {clientLoading && <i className="ri-loader-4-line animate-spin" />}
                <span>Guardar y Seleccionar</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Tipo de Movimiento */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              1. Tipo de Operación *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('Pago')}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  tipo === 'Pago'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ri-hand-coin-line text-lg" />
                    <span className="font-bold text-xs sm:text-sm">Pago a Cliente</span>
                  </div>
                  {tipo === 'Pago' && <i className="ri-checkbox-circle-fill text-amber-500 text-sm" />}
                </div>
                <span className="text-[11px] opacity-80">Entrega de dinero / Egreso de caja</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo('Ingreso')}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  tipo === 'Ingreso'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ri-safe-2-line text-lg" />
                    <span className="font-bold text-xs sm:text-sm">Ingreso a Caja</span>
                  </div>
                  {tipo === 'Ingreso' && <i className="ri-checkbox-circle-fill text-emerald-500 text-sm" />}
                </div>
                <span className="text-[11px] opacity-80">Recepción de efectivo / Abono</span>
              </button>
            </div>
          </div>

          {/* 2. Cliente Selector con botón de Crear Nuevo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                2. Cliente Asignado {tipo === 'Pago' ? '*' : '(Opcional)'}
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingClient(!isCreatingClient)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <i className={isCreatingClient ? "ri-close-line" : "ri-user-add-line"} />
                <span>{isCreatingClient ? 'Ocultar formulario' : '+ Nuevo Cliente'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ClientSearchSelect
                  value={clienteId}
                  onChange={(id) => setClienteId(id)}
                  placeholder="Buscar cliente por código o nombre..."
                  required={tipo === 'Pago'}
                  onAddNewClient={(q) => {
                    if (q) setNewClientName(q);
                    setIsCreatingClient(true);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingClient(!isCreatingClient)}
                title="Registrar nuevo cliente"
                className="h-[42px] px-3.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 flex items-center gap-1.5 text-xs font-bold transition-all shrink-0 shadow-sm"
              >
                <i className="ri-user-add-line text-sm" />
                <span className="hidden sm:inline">+ Cliente</span>
              </button>
            </div>
          </div>

          {/* 3. Monto (COP) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                3. Monto en Pesos (COP) *
              </label>
              {parsedNumber > 0 && (
                <span className="text-xs font-mono font-bold text-primary">
                  {formatCOP(parsedNumber)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                $
              </span>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-input bg-background text-base sm:text-lg font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* 4. Referencia / PIN y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                4. Referencia o PIN (Opcional)
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: PIN 4582 o Entrega Oficina"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                5. Fecha del Movimiento
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || parsedNumber <= 0 || (tipo === 'Pago' && !clienteId)}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>{tipo === 'Pago' ? 'Registrar Pago' : 'Registrar Ingreso'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
