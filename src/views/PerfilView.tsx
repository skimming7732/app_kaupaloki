import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export const PerfilView: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(profile?.nombre || user?.nombre || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nombre: nombre.trim() })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ text: 'Perfil actualizado con éxito', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al actualizar perfil', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-4">
      {/* Brand Header Banner with Clean Contrast */}
      <div className="relative rounded-3xl overflow-hidden border border-border shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-700 via-primary to-indigo-800" />
        <div className="p-6 bg-card flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary text-3xl font-black">
              {profile?.nombre?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-foreground">{profile?.nombre || user?.email}</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold">
              {profile?.rol || 'Operador'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <i className="ri-user-line text-primary" />
            <span>Datos Personales</span>
          </h3>

          {message && (
            <div className={`p-3 mb-4 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
            }`}>
              <i className={message.type === 'success' ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo Electrónico</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-muted text-xs text-muted-foreground cursor-not-allowed outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25 hover:opacity-95 transition-opacity"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Security & 2FA Status */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <i className="ri-shield-keyhole-line text-primary" />
              <span>Seguridad de la Cuenta</span>
            </h3>

            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Autenticación de Dos Factores (2FA)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                  Requerido
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Protege tu cuenta con verificación por códigos temporales TOTP generados en Google Authenticator o Authy.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/2fa')}
            className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border transition-colors flex items-center justify-center gap-2"
          >
            <i className="ri-qr-code-line" />
            <span>Configurar o Re-vincular 2FA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
