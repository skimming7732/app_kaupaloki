import { requiresCurrencies } from '../../utils/roles';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import type { AppUser } from '../../context/DataContext';

interface EditUserModalProps {
  isOpen: boolean;
  user: AppUser | null;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, user, onClose }) => {
  const { data, updateRecord, deleteUser } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('operador');
  const [pais, setPais] = useState('Colombia');
  const [divisas, setDivisas] = useState<string[]>([]);
  const [estado, setEstado] = useState('Activo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setCorreo(user.correo || '');
      setRol(user.rol || 'operador');
      setPais(user.pais || 'Colombia');
      setDivisas(user.divisasAutorizadas || []);
      setEstado(user.estado || 'Activo');
    }
  }, [user]);

  if (!isOpen || !user || !isAdmin) return null;

  const handleToggleDivisa = (divisaCode: string) => {
    if (divisas.includes(divisaCode)) {
      setDivisas(divisas.filter(d => d !== divisaCode));
    } else {
      setDivisas([...divisas, divisaCode]);
    }
  };

    const handleDelete = async () => {
    if (!user) return;
    if (user.id === profile?.id) {
      setError('No puedes eliminar tu propia cuenta.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.nombre}" (${user.correo})?`)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await deleteUser(user.id);
      if (res.success) onClose();
      else setError(res.error || 'Error al eliminar usuario.');
    } catch (err: any) {
      setError(err?.message || 'Error al eliminar usuario.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finishSound = prepareSuccessSound();
    try {
      await updateRecord('Usuarios', user.id, {
        'Nombre': nombre.trim().toUpperCase(),
        'Correo': correo.trim().toLowerCase(),
        'Rol': rol,
        'País': pais,
        'Divisas Autorizadas': rol === 'dispersor' ? ['COP'] : !requiresCurrencies(rol) ? [] : divisas,
        'Estado': estado
      });
      finishSound(true);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar usuario');
    } finally {
      finishSound(false);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center max-sm:p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:flex max-sm:flex-col sm:max-w-lg overflow-y-auto sm:rounded-2xl border border-border shadow-2xl p-5 sm:p-6 relative">
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
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Correo Electrónico {isAdmin ? '' : '(Solo administradores)'}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={correo}
                disabled={!isAdmin}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="correo@ejemplo.com"
              />
              {!isAdmin && (
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground flex items-center gap-1">
                  <i className="ri-lock-line" />
                </span>
              )}
            </div>
            {isAdmin && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Como administrador puedes actualizar el correo de acceso de este usuario en Supabase Auth y perfiles.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Rol</label>
              <select
                value={rol}
                onChange={(e) => { setRol(e.target.value); if (e.target.value === 'dispersor') setDivisas(['COP']); }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {(profile?.role === 'super_admin' || user.rol === 'super_admin') && <option value="super_admin">Super Admin</option>}
                <option value="administrador">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="auditor">Auditor</option>
                <option value="comercial">Comercial</option>
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
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Divisas autorizadas</p>
            {rol === 'dispersor' ? <p className="text-sm">COP · Las dispersiones se realizan únicamente en pesos colombianos.</p> : !requiresCurrencies(rol) ? <p className="text-sm">Todas las divisas</p> : <>
            <button type="button" onClick={() => setDivisas([])} className="mb-2 rounded-lg border border-border px-3 py-1.5 text-xs" aria-pressed={divisas.length === 0}>Todas</button>
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
            </>}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-6">
            <div>
              {isAdmin && user.id !== profile?.id && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <i className="ri-delete-bin-line" />
                  <span>Eliminar usuario</span>
                </button>
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
                disabled={loading}
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
