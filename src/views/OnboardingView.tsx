import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const OnboardingView: React.FC = () => {
  const { theme, toggleTheme } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Sign up or update password for invited user
      const { data, error: authError } = await supabase.auth.updateUser({
        password: password.trim(),
        data: { full_name: nombre.trim() }
      });

      if (authError) {
        // Fallback: if session isn't already active, attempt signUp
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: nombre.trim() }
          }
        });
        if (signUpError) throw signUpError;
      }

      // Route directly to mandatory 2FA setup
      navigate('/2fa');
    } catch (err: any) {
      setError(err?.message || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-surface flex flex-col">
      {/* Top Standalone Header */}
      <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Kaupaloki"
            className="theme-logo-dark"
            style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
          <img
            src="/logo-blue.png"
            alt="Kaupaloki"
            className="theme-logo-light"
            style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          title="Cambiar tema claro / oscuro"
          className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors"
        >
          {theme === 'dark' ? (
            <i className="ri-sun-line text-sm text-amber-400" />
          ) : (
            <i className="ri-moon-line text-sm text-blue-500" />
          )}
        </button>
      </header>

      {/* Main Onboarding Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
              <img
                src="/iso-type-white.png"
                alt="Kaupaloki"
                className="theme-logo-dark"
                style={{ height: '48px', width: '48px', objectFit: 'contain' }}
              />
              <img
                src="/iso-type-blue.png"
                alt="Kaupaloki"
                className="theme-logo-light"
                style={{ height: '48px', width: '48px', objectFit: 'contain' }}
              />
            </div>
            <h2 className="text-xl font-bold text-foreground">Bienvenido a Kaupaloki</h2>
            <p className="text-xs text-muted-foreground mt-1">Configura tus credenciales y seguridad</p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
              <i className="ri-error-warning-line text-sm" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Daniel Ramírez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo Asignado</label>
              <input
                type="email"
                required
                disabled={Boolean(searchParams.get('email'))}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-muted text-xs text-muted-foreground outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Continuar a Seguridad 2FA</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
