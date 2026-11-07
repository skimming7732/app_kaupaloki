import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { useData, type NormalizedData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatNumber } from '../../utils/formatters';
import { formatAmountField, parseAmountInput } from '../../utils/amountInput';
import { ClientSearchSelect } from '../common/ClientSearchSelect';

interface AddComisionistaModalProps {
  isOpen: boolean;
  record?: NormalizedData['comisionistas'][number];
  onClose: () => void;
}

export const AddComisionistaModal = ({ isOpen, onClose, record }: AddComisionistaModalProps) =>
  isOpen ? <ComisionistaForm key={record?.id ?? 'new'} onClose={onClose} record={record} /> : null;

const ComisionistaForm = ({ onClose, record }: Omit<AddComisionistaModalProps, 'isOpen'>) => {
  const { data, saveComisionista, deleteComisionista } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [comisionistaId, setComisionistaId] = useState(record?.comisionistaId || '');
  const [selectedReferidos, setSelectedReferidos] = useState<string[]>(record?.comisionaDeIds ?? []);
  const [porcentaje, setPorcentaje] = useState(record ? formatNumber(record.porcentajeComision * 100, 0, 10) : '1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleReferido = (id: string) => {
    if (selectedReferidos.includes(id)) {
      setSelectedReferidos(selectedReferidos.filter((r) => r !== id));
    } else {
      setSelectedReferidos([...selectedReferidos, id]);
    }
  };

    const handleDelete = async () => {
    if (!record) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comisionista?')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await deleteComisionista(record.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar comisionista');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!comisionistaId) {
      setError('Por favor seleccione el cliente comisionista');
      return;
    }
    const pct = parseAmountInput(porcentaje);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError('Por favor ingrese un porcentaje de comisión válido');
      return;
    }

    setLoading(true);
    setError(null);

    const finishSound = prepareSuccessSound();
    try {
      const ok = await saveComisionista({
        id: record?.id,
        comisionistaId,
        comisionaDeIds: selectedReferidos,
        porcentajeComision: pct / 100,
      });

      if (!ok) {
        throw new Error('No se pudo registrar el comisionista');
      }

      finishSound(true);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar comisionista');
    } finally {
      finishSound(false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              <i className="ri-user-star-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{record ? 'Editar comisionista' : 'Registrar comisionista'}</h3>
              <p className="text-xs text-muted-foreground">Configurar porcentaje y clientes asignados</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Cliente Comisionista *
            </label>
            <ClientSearchSelect
              value={comisionistaId}
              onChange={(id) => setComisionistaId(id)}
              placeholder="Buscar cliente comisionista..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Porcentaje de Comisión (%) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                required
                value={porcentaje}
                onChange={(e) => { const value = formatAmountField(e.currentTarget); if (value !== undefined) setPorcentaje(value); }}
                placeholder="1.0"
                className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Clientes de los que comisiona ({selectedReferidos.length})
              </label>
              {selectedReferidos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedReferidos([])}
                  className="text-[11px] text-primary hover:underline"
                >
                  Limpiar selección
                </button>
              )}
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-border p-2 space-y-1 bg-muted/20">
              {data.clientes.map((c) => {
                const isSelected = selectedReferidos.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleReferido(c.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate">
                      <strong>{c.codigo}</strong> • {c.nombre}
                    </span>
                    <i className={isSelected ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <div>
              {record && isAdmin && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <i className="ri-delete-bin-line" />
                  <span>Eliminar comisionista</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !comisionistaId}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <i className="ri-loader-4-line animate-spin" />}
                <span>{record ? 'Guardar cambios' : 'Registrar comisionista'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
