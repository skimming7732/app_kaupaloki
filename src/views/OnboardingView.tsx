import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { roleLabels, type StaffRole } from '../utils/roles';

export const OnboardingView: React.FC = () => {
  const { theme, toggleTheme } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [pais, setPais] = useState<string | null>(null);

  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [isNombreLocked, setIsNombreLocked] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fetchingInfo, setFetchingInfo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-resolve user identity from searchParams, hash tokens, Supabase session or RPC
  useEffect(() => {
    let isCancelled = false;

    const resolveIdentity = async () => {
      setFetchingInfo(true);

      // 1. Check URL search params
      const qEmail = searchParams.get('email')?.trim() || '';
      const qNombre = (
        searchParams.get('nombre') ||
        searchParams.get('name') ||
        searchParams.get('fullName')
      )?.trim() || '';

      // 2. Check hash params (e.g. from Supabase auth redirects #access_token=...&...)
      let hashEmail = '';
      if (window.location.hash) {
        try {
          const rawHash = window.location.hash.replace(/^#/, '');
          const hashParams = new URLSearchParams(rawHash);
          hashEmail = hashParams.get('email')?.trim() || '';
        } catch {
          // ignore
        }
      }

      // 3. Check active Supabase Auth session
      let sessionEmail = '';
      let sessionNombre = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          sessionEmail = session.user.email?.trim() || '';
          sessionNombre = (
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.user_metadata?.fullName
          )?.trim() || '';
        }
      } catch {
        // ignore
      }

      const resolvedEmail = qEmail || hashEmail || sessionEmail;
      let resolvedNombre = qNombre || sessionNombre;
      let resolvedRole: string | null = null;
      let resolvedPais: string | null = null;

      // 4. Query public.get_invited_user_info RPC if email is known
      if (resolvedEmail) {
        try {
          const { data: info, error: rpcError } = await supabase.rpc('get_invited_user_info', {
            p_email: resolvedEmail,
          });
          if (!rpcError && info) {
            if (info.fullName && !resolvedNombre) {
              resolvedNombre = info.fullName;
            }
            if (info.role) resolvedRole = info.role;
            if (info.pais) resolvedPais = info.pais;
          }
        } catch (e) {
          console.warn('Could not fetch invited user info:', e);
        }
      }

      if (isCancelled) return;

      if (resolvedEmail) {
        setEmail(resolvedEmail);
        setIsEmailLocked(true);
      }
      if (resolvedNombre) {
        setNombre(resolvedNombre);
        setIsNombreLocked(true);
      }
      if (resolvedRole) setRole(resolvedRole);
      if (resolvedPais) setPais(resolvedPais);

      setFetchingInfo(false);
    };

    resolveIdentity();

    return () => {
      isCancelled = true;
    };
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
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio');
      return;
    }
    if (!nombre.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Attempt to update the user with the active invite session
      const { error: authError } = await supabase.auth.updateUser({
        password: password.trim(),
        data: { full_name: nombre.trim() },
      });

      if (authError) {
        // Fallback: if session isn't already active, attempt signUp
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: nombre.trim() },
          },
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
    <div className="auth-surface flex flex-col min-h-screen">
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
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative">
          <div className="text-center mb-5">
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
            <p className="text-xs text-muted-foreground mt-1">Configura tu contraseña de acceso y seguridad</p>
          </div>

          {/* Role dossier banner if assigned */}
          {role && (
            <div className="mb-4 p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <i className="ri-shield-user-line text-primary text-base" />
                <span className="font-semibold text-foreground">
                  Rol: <strong className="text-primary">{roleLabels[role as StaffRole] || role}</strong>
                </span>
              </div>
              {pais && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {pais}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2 animate-fade-in">
              <i className="ri-error-warning-line text-sm shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Nombre Completo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">Nombre Completo</label>
                {isNombreLocked && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]" />
                    <span>Asignado</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isNombreLocked}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={fetchingInfo ? 'Cargando datos...' : 'Ej: Daniel Ramírez'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-foreground outline-none transition-colors ${
                    isNombreLocked
                      ? 'border-border/80 bg-muted/50 font-semibold cursor-not-allowed select-none pr-8 text-foreground/90'
                      : 'border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary'
                  }`}
                />
                {isNombreLocked && (
                  <i
                    className="ri-lock-line text-xs text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
                    title="Nombre asignado por el administrador"
                  />
                )}
              </div>
            </div>

            {/* Correo Asignado */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">Correo Asignado</label>
                {isEmailLocked && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]" />
                    <span>Asignado</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  readOnly={isEmailLocked}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={fetchingInfo ? 'Cargando correo...' : 'usuario@kaupaloki.co'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-foreground outline-none transition-colors ${
                    isEmailLocked
                      ? 'border-border/80 bg-muted/50 font-semibold cursor-not-allowed select-none pr-8 text-foreground/90'
                      : 'border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary'
                  }`}
                />
                {isEmailLocked && (
                  <i
                    className="ri-lock-line text-xs text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
                    title="Correo oficial asignado por el administrador"
                  />
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                  tabIndex={-1}
                >
                  <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                  tabIndex={-1}
                >
                  <i className={showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || fetchingInfo}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Crear Contraseña y Continuar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
