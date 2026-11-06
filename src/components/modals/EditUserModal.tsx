import React, { useState, useEffect } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import type { AirtableUser } from '../../context/AirtableContext';

interface EditUserModalProps {
  isOpen: boolean;
  user: AirtableUser | null;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, user, onClose }) => {
  const { data, updateRecord } = useAirtable();
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('operador');
  const [pais, setPais] = useState('Colombia');
  const [divisas, setDivisas] = useState<string[]>([]);
  const [estado, setEstado] = useState('Activo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setRol(user.rol || 'operador');
      setPais(user.pais || 'Colombia');
      setDivisas(user.divisasAutorizadas || []);
      setEstado(user.estado || 'Activo');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleToggleDivisa = (divisaCode: string) => {
    if (divisas.includes(divisaCode)) {
      setDivisas(divisas.filter(d => d !== divisaCode));
    } else {
      setDivisas([...divisas, divisaCode]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await updateRecord('Usuarios', user.id, {
        'Nombre': nombre.trim(),
        'Rol': rol,
        'País': pais,
        'Divisas Autorizadas': divisas,
        'Estado': estado
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-user-settings-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Editar Usuario</h3>
              <p className="text-xs text-muted-foreground">{user.correo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="super_admin">Super Admin</option>
                <option value="administrador">Admin</option>
                <option value="operador">Operador</option>
                <option value="dispersor">Dispersor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">País</label>
              <select
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="Colombia">Colombia (COL)</option>
                <option value="Venezuela">Venezuela (VEN)</option>
                <option value="Panamá">Panamá (PAN)</option>
                <option value="Estados Unidos">Estados Unidos (USA)</option>
                <option value="Chile">Chile (CHL)</option>
                <option value="Perú">Perú (PER)</option>
                <option value="España">España (ESP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="Invitado">Invitado</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Divisas Autorizadas</label>
            <div className="flex flex-wrap gap-2">
              {data.divisas.map((d) => {
                const selected = divisas.includes(d.codigo);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleToggleDivisa(d.codigo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {d.codigo}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
