import React, { useState, useMemo } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { formatCOP } from '../../utils/formatters';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

interface AddNegocioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddNegocioModal: React.FC<AddNegocioModalProps> = ({ isOpen, onClose }) => {
  const { data, createRecord, createCliente } = useAirtable();
  const [clienteId, setClienteId] = useState('');
  const [divisaId, setDivisaId] = useState('');
  const [monto, setMonto] = useState('');
  const [tasa, setTasa] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inline client creation
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPais, setNewClientPais] = useState('COLOMBIA');
  const [clientLoading, setClientLoading] = useState(false);

  const parsedMonto = parseFloat(monto) || 0;
  const parsedTasa = parseFloat(tasa) || 0;
  const ingresoCOP = useMemo(() => parsedMonto * parsedTasa, [parsedMonto, parsedTasa]);

  if (!isOpen) return null;

  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setClientLoading(true);
    setError(null);
    try {
      const res = await createCliente(newClientName.trim(), newClientPais.trim());
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
    if (!clienteId || !divisaId || parsedMonto <= 0 || parsedTasa <= 0) {
      setError('Por favor complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = 'NEG-' + Math.floor(1000 + Math.random() * 9000);
      await createRecord('Negocios', {
        'Código': code,
        'Fecha': fecha,
        'Cliente': [clienteId],
        'Divisa': [divisaId],
        'Monto Divisa': parsedMonto,
        'Tasa Cambio': parsedTasa,
        'Ingreso COP': ingresoCOP,
        'Estado': 'Completado',
      });
      setMonto('');
      setTasa('');
      setClienteId('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg md:max-w-xl rounded-3xl border border-border shadow-2xl p-6 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
              <i className="ri-exchange-dollar-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Nuevo Negocio</h3>
              <p className="text-xs text-muted-foreground">Registro de operación cambiaria con cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Inline Client Creator Sub-Form */}
        {isCreatingClient && (
          <div className="mb-4 p-3.5 rounded-2xl bg-muted/50 border border-primary/20 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="ri-user-add-line text-primary" />
                Registrar Cliente Rápido
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingClient(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: MARÍA FERNANDA PÉREZ"
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">País</label>
                <input
                  type="text"
                  value={newClientPais}
                  onChange={(e) => setNewClientPais(e.target.value)}
                  placeholder="COLOMBIA"
                  className="w-full px-3 py-1.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingClient(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleQuickCreateClient}
                disabled={clientLoading || !newClientName.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {clientLoading && <i className="ri-loader-4-line animate-spin" />}
                <span>Guardar y Seleccionar</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Client Selector Row with + Button */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Cliente *
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ClientSearchSelect
                  value={clienteId}
                  onChange={(id) => setClienteId(id)}
                  placeholder="Buscar cliente por código o nombre..."
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingClient(!isCreatingClient)}
                title="Crear nuevo cliente"
                className="h-[34px] px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 flex items-center gap-1.5 text-xs font-bold transition-all shrink-0"
              >
                <i className={isCreatingClient ? "ri-close-line text-sm" : "ri-user-add-line text-sm"} />
                <span className="hidden sm:inline">{isCreatingClient ? 'Ocultar' : '+ Cliente'}</span>
              </button>
            </div>
          </div>

          {/* Divisa & Fecha Operación */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Divisa *
              </label>
              <select
                required
                value={divisaId}
                onChange={(e) => setDivisaId(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Seleccionar...</option>
                {data.divisas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.codigo} - {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Fecha Operación
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Monto & Tasa */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Monto en Divisa *
              </label>
              <input
                type="number"
                step="any"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 5000"
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                Tasa Cambio (COP) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={tasa}
                onChange={(e) => setTasa(e.target.value)}
                placeholder="Ej: 3950"
                className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Slim Calculation Pill */}
          <div className="px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Ingreso Estimado:</span>
            <span className="font-mono font-bold text-foreground">{formatCOP(ingresoCOP)}</span>
          </div>

          {/* Compact Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !clienteId || !divisaId || parsedMonto <= 0 || parsedTasa <= 0}
              className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-sm shadow-primary/20 flex items-center gap-1.5 transition-all"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Registrar Negocio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
