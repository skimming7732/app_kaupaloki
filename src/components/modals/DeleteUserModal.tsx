import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import type { AirtableUser } from '../../context/AirtableContext';

interface DeleteUserModalProps {
  isOpen: boolean;
  user: AirtableUser | null;
  onClose: () => void;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({ isOpen, user, onClose }) => {
  const { deleteUser } = useAirtable();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await deleteUser(user.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'No se pudo eliminar el usuario');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-destructive/30 shadow-2xl p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
            <i className="ri-delete-bin-line text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Eliminar Usuario</h3>
            <p className="text-xs text-muted-foreground">Esta acción es irreversible</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          ¿Estás seguro de que deseas eliminar permanentemente a <strong className="text-foreground">{user.nombre || user.correo}</strong>? 
          Se revocarán sus accesos y se eliminará tanto de Supabase como de Airtable.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

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
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-destructive/25 flex items-center gap-2"
          >
            {loading && <i className="ri-loader-4-line animate-spin" />}
            <span>Eliminar Definitivamente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
