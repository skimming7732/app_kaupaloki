import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicHeader } from '../components/common/PublicHeader';
import { prepareSuccessSound } from '../utils/confirmationSound';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(false);
    const finishSound = prepareSuccessSound();

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      setForgotSuccess(true);
      finishSound(true);
    } catch (err: any) {
      setForgotError(err?.message || 'Error al enviar el correo de recuperación');
    } finally {
      finishSound(false);
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError) throw authError;

      // Check if user has 2FA configured
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', data.user.id)
        .single();

      if (profile?.two_factor_enabled) {
        navigate('/2fa');
      } else {
        // If not enabled, force mandatory 2FA setup
        navigate('/2fa');
      }
    } catch (err: any) {
      setError(err?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-surface flex flex-col">
      <PublicHeader />

      {/* Main Login Card */}
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
            <h2 className="text-xl font-bold text-foreground">Iniciar Sesión</h2>
            <p className="text-xs text-muted-foreground mt-1">Plataforma Cambiaria Kaupaloki</p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
              <i className="ri-error-warning-line text-sm" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setIsForgotPasswordOpen(true);
                  setForgotSuccess(false);
                  setForgotError(null);
                }}
                className="text-xs text-primary hover:underline font-semibold transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Ingresar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  <i className="ri-lock-password-line" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Recuperar Contraseña</h3>
                  <p className="text-[11px] text-muted-foreground">Te enviaremos un enlace a tu correo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-start gap-2.5">
                  <i className="ri-checkbox-circle-line text-base shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">¡Correo enviado!</span>
                    <span className="text-muted-foreground mt-0.5 block text-[11px] leading-relaxed">
                      Si el correo coincide con una cuenta activa, recibirás un enlace de acceso para restablecer tu contraseña.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-all"
                >
                  Entendido, volver
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                {forgotError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                    <i className="ri-error-warning-line text-sm shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Correo Electrónico Registrado
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-arrow-left-line" />
                    <span>Atrás</span>
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading && <i className="ri-loader-4-line animate-spin" />}
                    <span>Enviar Enlace</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
