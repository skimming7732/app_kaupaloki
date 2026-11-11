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
        setNombre(resolvedNombre.toUpperCase());
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

  // Password Security Analysis
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(password);

  const criteriaMet = [hasMinLength, hasUpper, hasLower, hasNumberOrSymbol].filter(Boolean).length;
  const isPasswordSecure = hasMinLength && hasUpper && hasLower && hasNumberOrSymbol;
  const passwordsMatch = Boolean(confirmPassword && password === confirmPassword);

  const getStrengthInfo = () => {
    if (!password) return { label: '', color: 'bg-muted', textColor: 'text-muted-foreground' };
    if (criteriaMet <= 1) return { label: 'Muy débil', color: 'bg-rose-500', textColor: 'text-rose-500' };
    if (criteriaMet === 2) return { label: 'Regular', color: 'bg-amber-500', textColor: 'text-amber-500' };
    if (criteriaMet === 3) return { label: 'Buena', color: 'bg-blue-500', textColor: 'text-blue-500' };
    return { label: 'Fuerte y Segura', color: 'bg-emerald-500', textColor: 'text-emerald-500' };
  };

  const strength = getStrengthInfo();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!isPasswordSecure) {
      setError('Por seguridad, la contraseña debe incluir mayúsculas, minúsculas y al menos un número o símbolo');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas');
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
        data: { full_name: nombre.trim().toUpperCase() },
      });

      if (authError) {
        // Fallback: if session isn't already active, attempt signUp
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          options: {
            data: { full_name: nombre.trim().toUpperCase() },
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
            src="/logo-dark.png"
            alt="Kaupaloki"
            className="theme-logo-light"
            style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
        </div>

        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
        >
          {theme === 'dark' ? <i className="ri-sun-line text-lg" /> : <i className="ri-moon-line text-lg" />}
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

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nombre Completo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">Nombre Completo</label>
                {isNombreLocked && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]" />
                    <span>Asignado</span>
                  </span>
                )}
              </div>
              {isNombreLocked ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className="ri-user-line text-sm text-primary shrink-0" />
                    <span
                      className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-wide truncate select-text"
                      style={{ WebkitTextFillColor: 'currentColor' }}
                    >
                      {nombre || 'CARGANDO...'}
                    </span>
                  </div>
                  <i className="ri-lock-2-line text-xs text-muted-foreground shrink-0 ml-2" />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.toUpperCase())}
                  placeholder={fetchingInfo ? 'Cargando datos...' : 'Ej: DANIEL RAMÍREZ'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              )}
            </div>

            {/* Correo Asignado */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">Correo Asignado</label>
                {isEmailLocked && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <i className="ri-lock-line text-[10px]" />
                    <span>Asignado</span>
                  </span>
                )}
              </div>
              {isEmailLocked ? (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/90 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className="ri-mail-line text-sm text-primary shrink-0" />
                    <span
                      className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate select-text"
                      style={{ WebkitTextFillColor: 'currentColor' }}
                    >
                      {email || 'cargando correo...'}
                    </span>
                  </div>
                  <i className="ri-lock-2-line text-xs text-muted-foreground shrink-0 ml-2" />
                </div>
              ) : (
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={fetchingInfo ? 'Cargando correo...' : 'usuario@kaupaloki.co'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              )}
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

              {/* Password Strength Meter & Security Checklist */}
              {password.length > 0 && (
                <div className="space-y-2 pt-2 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Seguridad:</span>
                      <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      <div className={`rounded-full transition-all duration-300 ${criteriaMet >= 1 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full transition-all duration-300 ${criteriaMet >= 2 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full transition-all duration-300 ${criteriaMet >= 3 ? strength.color : 'bg-muted'}`} />
                      <div className={`rounded-full transition-all duration-300 ${criteriaMet >= 4 ? strength.color : 'bg-muted'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                      <i className={hasMinLength ? 'ri-checkbox-circle-fill text-xs' : 'ri-circle-line text-xs'} />
                      <span>8+ caracteres</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                      <i className={hasUpper ? 'ri-checkbox-circle-fill text-xs' : 'ri-circle-line text-xs'} />
                      <span>Mayúscula (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                      <i className={hasLower ? 'ri-checkbox-circle-fill text-xs' : 'ri-circle-line text-xs'} />
                      <span>Minúscula (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}`}>
                      <i className={hasNumberOrSymbol ? 'ri-checkbox-circle-fill text-xs' : 'ri-circle-line text-xs'} />
                      <span>Número o símbolo</span>
                    </div>
                  </div>
                </div>
              )}
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

              {confirmPassword.length > 0 && (
                <div className="text-[11px] font-medium pt-1.5">
                  {passwordsMatch ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <i className="ri-checkbox-circle-line" />
                      <span>Las contraseñas coinciden</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1">
                      <i className="ri-alert-line" />
                      <span>Las contraseñas no coinciden aún</span>
                    </span>
                  )}
                </div>
              )}
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
