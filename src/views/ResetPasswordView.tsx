import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicHeader } from '../components/common/PublicHeader';
import { prepareSuccessSound } from '../utils/confirmationSound';

export const ResetPasswordView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if URL has recovery tokens or if an active session exists
    const checkRecoveryStatus = async () => {
      const hash = window.location.hash || '';
      const query = window.location.search || '';
      const isRecoveryInUrl = hash.includes('type=recovery') || query.includes('type=recovery') || hash.includes('access_token=');

      // Check current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session || isRecoveryInUrl) {
        setIsRecoveryValid(true);
      } else {
        setIsRecoveryValid(false);
      }
      setCheckingSession(false);
    };

    checkRecoveryStatus();

    // Listen for auth state change: Supabase emits PASSWORD_RECOVERY when processing recovery link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setIsRecoveryValid(true);
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);
    setError(null);
    const finishSound = prepareSuccessSound();

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (updateErr) throw updateErr;

      finishSound(true);
      setSuccess(true);

      // Sign out from recovery session after successful password change
      await supabase.auth.signOut();
      sessionStorage.removeItem('kaupaloki_2fa_verified');
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al actualizar la contraseña. El enlace puede haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('kaupaloki_2fa_verified');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

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
            <h2 className="text-xl font-bold text-foreground">Restablecer Contraseña</h2>
            <p className="text-xs text-muted-foreground mt-1">Crea una nueva contraseña segura para tu cuenta</p>
          </div>

          {checkingSession ? (
            <div className="py-8 text-center space-y-3">
              <i className="ri-loader-4-line text-2xl text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-semibold">Validando enlace de recuperación...</p>
            </div>
          ) : success ? (
            <div className="space-y-4 py-2 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-start gap-3">
                <i className="ri-checkbox-circle-fill text-xl shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">¡Contraseña actualizada!</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <span>Ir al Inicio de Sesión</span>
                <i className="ri-arrow-right-line" />
              </button>
            </div>
          ) : !isRecoveryValid ? (
            <div className="space-y-4 py-2 animate-fade-in">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start gap-3">
                <i className="ri-error-warning-fill text-xl shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">Enlace no válido o expirado</span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                    El enlace para restablecer tu contraseña no es válido, ya fue utilizado o ha expirado. Por favor solicita uno nuevo.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="ri-arrow-left-line" />
                <span>Volver a Iniciar Sesión</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                  <i className="ri-error-warning-line text-sm shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                  >
                    <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading && <i className="ri-loader-4-line animate-spin" />}
                  <span>Guardar Nueva Contraseña</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
                >
                  <i className="ri-arrow-left-line" />
                  <span>Cancelar y volver al login</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
