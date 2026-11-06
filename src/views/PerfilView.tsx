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
    <div className="space-y-5 animate-fade-in max-w-4xl mx-auto py-2">
      {/* Brand Header: Slim decorative top banner + Clean profile info below */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Subtle, slim top gradient accent */}
        <div className="h-14 bg-gradient-to-r from-blue-700 via-primary to-indigo-800" />
        
        {/* User avatar and info completely below the banner */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shadow-sm flex-shrink-0">
              {profile?.nombre?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-foreground">
                  {profile?.nombre || user?.nombre || user?.email?.split('@')[0]}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                  {profile?.rol || 'Operador'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/2fa')}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
          >
            <i className="ri-shield-keyhole-line text-primary" />
            <span>Seguridad y 2FA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Details Form */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
            <i className="ri-user-line text-primary" />
            <span>Datos Personales</span>
          </h3>

          {message && (
            <div className={`p-2.5 mb-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
            }`}>
              <i className={message.type === 'success' ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Correo Electrónico</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl border border-input bg-muted text-xs text-muted-foreground cursor-not-allowed outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-opacity"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Security & 2FA Status */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
              <i className="ri-shield-check-line text-emerald-500" />
              <span>Autenticación de Dos Factores (2FA)</span>
            </h3>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Estado de Protección</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                  Activo y Obligatorio
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tu cuenta está protegida mediante verificación TOTP compatible con Google Authenticator y Authy.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/2fa')}
            className="w-full py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border transition-colors flex items-center justify-center gap-2"
          >
            <i className="ri-qr-code-line text-sm" />
            <span>Gestionar o Re-vincular 2FA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
