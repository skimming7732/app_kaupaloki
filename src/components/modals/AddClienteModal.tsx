import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
import { useAuth } from '../../context/AuthContext';

interface AddClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddClienteModal: React.FC<AddClienteModalProps> = ({ isOpen, onClose }) => {
  const { createCliente } = useAirtable();
  const { profile, user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('COLOMBIA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    setError(null);

    const finishSound = prepareSuccessSound();
    try {
      const currentUserId = profile?.id || user?.id;
      const result = await createCliente(nombre.trim(), pais, currentUserId);
      if (!result?.success) throw new Error('No se pudo guardar el cliente.');
      setNombre('');
      finishSound(true);
      onClose();
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-user-add-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Nuevo Cliente</h3>
              <p className="text-xs text-muted-foreground">Registrar un nuevo cliente en Kaupaloki</p>
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
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre Completo o Empresa *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Daniel Ramírez o Inversiones SAS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">País</label>
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="COLOMBIA">Colombia (COL)</option>
              <option value="VENEZUELA">Venezuela (VEN)</option>
              <option value="PANAMA">Panamá (PAN)</option>
              <option value="ESTADOS UNIDOS">Estados Unidos (USA)</option>
              <option value="CHILE">Chile (CHL)</option>
              <option value="PERU">Perú (PER)</option>
              <option value="ESPANA">España (ESP)</option>
              <option value="MEXICO">México (MEX)</option>
            </select>
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
              disabled={loading || !nombre.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Crear Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
