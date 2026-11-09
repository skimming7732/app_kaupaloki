import React, { useId, useState } from 'react';
import { useData, type NormalizedData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { ClientCountrySelect } from '../common/ClientCountrySelect';

interface EditClienteModalProps {
  cliente: NormalizedData['clientes'][number] | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditClienteModal: React.FC<EditClienteModalProps> = ({ cliente, isOpen, onClose }) => {
  const { data, updateCliente, deleteCliente } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [nombre, setNombre] = useState(() => cliente?.nombre || '');
  const [pais, setPais] = useState(() => cliente?.pais || 'COLOMBIA');
  const countryId = useId();
  const [authorId, setAuthorId] = useState(() => cliente?.createdBy || '');
  const [authorSearch, setAuthorSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRelatedRecords = Boolean(
    cliente && (
      (cliente.totalNegocios || 0) > 0 ||
      (cliente.totalIngresosCOP || 0) > 0 ||
      (cliente.totalDispersadoCOP || 0) > 0 ||
      (cliente.saldoPendienteCOP || 0) !== 0 ||
      cliente.esComisionista ||
      (Array.isArray(cliente.comisionaDeIds) && cliente.comisionaDeIds.length > 0) ||
      data.negocios.some((n) => n.clienteId === cliente.id || n.clienteCodigo === cliente.codigo) ||
      data.dispersiones.some((d) => d.clienteId === cliente.id || d.clienteCodigo === cliente.codigo) ||
      data.efectivo.some((e) => e.clienteId === cliente.id || e.clienteCodigo === cliente.codigo) ||
      data.comisionistas.some((c) => c.comisionistaClienteId === cliente.id || (Array.isArray(c.comisionaDeIds) && c.comisionaDeIds.includes(cliente.id)))
    )
  );

  if (!isOpen || !cliente) return null;

    const handleDelete = async () => {
    if (!cliente) return;
    if (hasRelatedRecords) {
      setError('No se puede eliminar el cliente porque tiene negocios, pagos o movimientos asociados.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${cliente.nombre}" (${cliente.codigo})? Esta acción no se puede deshacer.`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await deleteCliente(cliente.id);
      if (ok) onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar el cliente.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    setError(null);
    const finishSound = prepareSuccessSound();

    try {
      const ok = await updateCliente({
        id: cliente.id,
        nombre: nombre.trim(),
        pais: pais.trim() || 'COLOMBIA',
        authorId: authorId || undefined,
      });

      if (!ok) throw new Error('No se pudo actualizar el cliente.');
      finishSound(true);
      onClose();
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const eligibleUsers = data.usuarios.filter((u) => {
    const q = authorSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.correo || '').toLowerCase().includes(q) ||
      (u.codigo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-user-settings-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Editar Cliente</h3>
              <p className="text-xs text-muted-foreground font-mono">{cliente.codigo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Nombre Completo o Razón Social *
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Daniel Ramírez"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label htmlFor={countryId} className="block text-xs font-semibold text-muted-foreground mb-1">
              País
            </label>
            <ClientCountrySelect
              id={countryId}
              value={pais}
              onChange={setPais}
              keepLegacy
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Creado por (Usuario asignado)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Buscar usuario por nombre o correo..."
                value={authorSearch}
                onChange={(e) => setAuthorSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="">Sin asignar / Sistema</option>
                {eligibleUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol}) {u.correo ? `· ${u.correo}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-6">
            <div>
              {isAdmin && (
                hasRelatedRecords ? (
                  <div className="flex items-center gap-2" title="No se puede eliminar: el cliente tiene registros o movimientos asociados">
                    <button
                      type="button"
                      disabled
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground bg-muted/40 border border-border cursor-not-allowed flex items-center gap-1.5 opacity-60"
                    >
                      <i className="ri-lock-line" />
                      <span>Eliminar cliente</span>
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      (Tiene movimientos asociados)
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
                  >
                    <i className="ri-delete-bin-line" />
                    <span>Eliminar cliente</span>
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !nombre.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
              >
                {loading && <i className="ri-loader-4-line animate-spin" />}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
