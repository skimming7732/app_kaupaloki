import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateTotpSecret, generateTotpUri, verifyTotp, generateBackupCodes } from '../utils/totp';

export const TwoFactorView: React.FC = () => {
  const { user, profile, loading: authLoading, is2faVerified, verify2FASession, refreshProfile, theme, toggleTheme, logout } = useAuth();
  const navigate = useNavigate();

  // Mode:
  // - 'verify': Standard 6-digit TOTP code
  // - 'verify_backup': 8-character backup code from downloaded .txt
  // - 'recovery_password': Step 1 of Recovery - Confirm account password
  // - 'recovery_email': Step 2 of Recovery - Enter email OTP code
  // - 'setup_step1': Scan QR code & test 6-digit OTP
  // - 'setup_step2': Display & download backup codes .txt
  const [mode, setMode] = useState<
    'verify' | 'verify_backup' | 'recovery_password' | 'recovery_email' | 'setup_step1' | 'setup_step2'
  >('verify');

  // Standard TOTP Verification & Setup states
  const [secret, setSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Recovery states
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & Messaging states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already verified in this session, redirect to home
  useEffect(() => {
    if (is2faVerified) {
      navigate('/inicio', { replace: true });
    }
  }, [is2faVerified, navigate]);

  // Redirect to login if user is not authenticated (prevents incognito access)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Determine mode once profile is loaded
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (profile?.two_factor_secret || profile?.two_factor_enabled) {
      setMode('verify');
    } else {
      // User does not have 2FA configured yet
      initSetup();
    }
  }, [profile, authLoading, user, navigate]);

  const handleBackToLogin = async () => {
    sessionStorage.removeItem('kaupaloki_2fa_verified');
    sessionStorage.removeItem('kpl_pending_2fa_secret');
    await supabase.auth.signOut();
    if (logout) {
      await logout();
    } else {
      navigate('/login', { replace: true });
    }
  };

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const initSetup = (forceNew = false) => {
    // Persist pending secret in sessionStorage so switching tabs on mobile does NOT change the secret
    let activeSecret = !forceNew ? sessionStorage.getItem('kpl_pending_2fa_secret') : null;
    let activeCodesStr = !forceNew ? sessionStorage.getItem('kpl_pending_backup_codes') : null;
    let activeCodes: string[] | null = null;
    try {
      if (activeCodesStr) activeCodes = JSON.parse(activeCodesStr);
    } catch {}

    if (!activeSecret) {
      activeSecret = generateTotpSecret();
      sessionStorage.setItem('kpl_pending_2fa_secret', activeSecret);
    }
    if (!activeCodes || !Array.isArray(activeCodes) || activeCodes.length === 0) {
      activeCodes = generateBackupCodes();
      sessionStorage.setItem('kpl_pending_backup_codes', JSON.stringify(activeCodes));
    }

    setSecret(activeSecret);
    const email = user?.email || profile?.email || 'operador@kaupaloki.co';
    const uri = generateTotpUri(activeSecret, email);
    setTotpUri(uri);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`;
    setQrUrl(qr);
    setBackupCodes(activeCodes);
    setCode('');
    setMode('setup_step1');
  };

  // -------------------------------------------------------------
  // 1. VERIFICACIÓN NORMAL: CÓDIGO DE APP AUTENTICADORA (6 dígitos)
  // -------------------------------------------------------------
  const handleVerifyExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeSecret = profile?.two_factor_secret;
    if (!activeSecret) {
      setError('No se encontró el secreto 2FA en tu perfil.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const isValid = await verifyTotp(code.trim(), activeSecret);
      if (isValid) {
        if (verify2FASession) verify2FASession();
        navigate('/inicio');
      } else {
        setError('Código incorrecto o expirado. Ingresa el código actual de 6 dígitos.');
        setLoading(false);
      }
    } catch {
      setError('Error al validar el código 2FA');
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. VERIFICACIÓN CON CÓDIGO DE RESPALDO (8 caracteres)
  // -------------------------------------------------------------
  const handleVerifyBackupCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const inputCode = code.trim().toUpperCase();
    const savedBackupCodes: string[] = profile?.two_factor_backup_codes || [];

    const matched = savedBackupCodes.find((c) => c.toUpperCase() === inputCode);

    if (!matched) {
      setError('Código de respaldo no válido o ya utilizado. Revisa tu archivo .txt guardado.');
      setLoading(false);
      return;
    }

    try {
      // Consume the backup code (remove it from array in DB)
      const remainingCodes = savedBackupCodes.filter((c) => c.toUpperCase() !== inputCode);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ two_factor_backup_codes: remainingCodes })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Clean up pending storage once successfully saved
      sessionStorage.removeItem('kpl_pending_2fa_secret');
      sessionStorage.removeItem('kpl_pending_backup_codes');

      if (refreshProfile) {
        await refreshProfile();
      }

      if (verify2FASession) verify2FASession();
      navigate('/inicio');
    } catch (err: any) {
      setError(err?.message || 'Error al validar el código de respaldo');
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. RECUPERACIÓN SEGURA - PASO 1: VERIFICAR CONTRASEÑA Y ENVIAR OTP
  // -------------------------------------------------------------
  const handleRecoveryStep1Password = async (e: React.FormEvent) => {
    e.preventDefault();
    const userEmail = (user?.email || profile?.email || '').trim();
    if (!userEmail) {
      setError('No se encontró el correo del usuario.');
      return;
    }
    if (!recoveryPassword) {
      setError('Por favor ingresa tu contraseña actual.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Verify current password against Supabase Auth
      const { error: pwdError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: recoveryPassword.trim(),
      });

      if (pwdError) {
        setError('Contraseña incorrecta. Por favor verifica e intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Password verified! Now send a 6-digit security OTP to their email
      const { error: otpSendError } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });

      if (otpSendError) {
        setError(`Error al enviar el código al correo: ${otpSendError.message}`);
        setLoading(false);
        return;
      }

      setSuccessMsg(`Contraseña validada. Hemos enviado un código de 6 dígitos a ${userEmail}.`);
      setResendCooldown(60);
      setEmailOtpCode('');
      setMode('recovery_email');
    } catch (err: any) {
      setError(err?.message || 'Error en la verificación de seguridad');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código OTP de correo
  const handleResendEmailOtp = async () => {
    if (resendCooldown > 0) return;
    const userEmail = (user?.email || profile?.email || '').trim();
    if (!userEmail) return;

    setError(null);
    setLoading(true);

    try {
      const { error: otpSendError } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: { shouldCreateUser: false },
      });

      if (otpSendError) throw otpSendError;

      setSuccessMsg('Nuevo código enviado a tu correo electrónico.');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Error al reenviar el código.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. RECUPERACIÓN SEGURA - PASO 2: VALIDAR OTP DE CORREO Y AUTORIZAR RE-VINCULACIÓN
  // -------------------------------------------------------------
  const handleRecoveryStep2EmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const userEmail = (user?.email || profile?.email || '').trim();
    const token = emailOtpCode.trim();

    if (!token || token.length < 6) {
      setError('Por favor ingresa el código de 6 dígitos recibido en tu correo.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: userEmail,
        token,
        type: 'email',
      });

      if (verifyError) {
        setError('Código de correo incorrecto o expirado.');
        setLoading(false);
        return;
      }

      // Password + Email OTP are validated!
      // Authorized to configure a brand new 2FA authenticator
      setSuccessMsg('Identidad validada con éxito. Procede a escanear tu nuevo código QR.');
      initSetup();
    } catch (err: any) {
      setError(err?.message || 'Error al verificar el código de correo');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. CONFIGURACIÓN 2FA - PASO 1: VALIDAR NUEVO QR
  // -------------------------------------------------------------
  const handleVerifyStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const isValid = await verifyTotp(code.trim(), secret);
    if (isValid) {
      setMode('setup_step2');
      setLoading(false);
    } else {
      setError('El código ingresado no coincide con el generador TOTP.');
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 6. CONFIGURACIÓN 2FA - PASO 2: GUARDAR Y DESCARGAR CÓDIGOS
  // -------------------------------------------------------------
  const handleFinishSetup = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: secret,
          two_factor_enabled: true,
          two_factor_backup_codes: backupCodes,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Clean up pending storage once successfully saved
      sessionStorage.removeItem('kpl_pending_2fa_secret');
      sessionStorage.removeItem('kpl_pending_backup_codes');

      if (refreshProfile) {
        await refreshProfile();
      }

      if (verify2FASession) verify2FASession();
      navigate('/inicio');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la configuración 2FA');
      setLoading(false);
    }
  };

  const handleDownloadTxt = () => {
    const userEmail = (user?.email || profile?.email || 'user').trim();
    const content = `KAUPALOKI - CÓDIGOS DE RESPALDO 2FA\nUsuario: ${userEmail}\nFecha: ${new Date().toLocaleString()}\n\nGuarde estos códigos en un lugar seguro. Cada código solo puede usarse una vez:\n\n${backupCodes.join(
      '\n'
    )}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kaupaloki-backup-codes-${userEmail}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Cargando verificación 2FA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Standalone Header */}
      <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleBackToLogin}
            title="Volver a la pantalla de login"
            className="px-2.5 sm:px-3 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <i className="ri-arrow-left-line" />
            <span className="hidden sm:inline">Volver al login</span>
            <span className="sm:hidden">Atrás</span>
          </button>
          <div className="h-5 w-px bg-border mx-1" />
          <img
            src="/logo.png"
            alt="Kaupaloki"
            className="theme-logo-dark"
            style={{ height: '30px', maxHeight: '30px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
          />
          <img
            src="/logo-blue.png"
            alt="Kaupaloki"
            className="theme-logo-light"
            style={{ height: '30px', maxHeight: '30px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
          />
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={handleBackToLogin}
            title="Salir y volver al inicio de sesión"
            className="px-3 h-9 rounded-xl border border-border bg-card hover:bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <i className="ri-logout-box-r-line" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main 2FA Card Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            <i className="ri-shield-keyhole-line" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {mode === 'verify' && 'Verificación de Seguridad (2FA)'}
            {mode === 'verify_backup' && 'Código de Respaldo (Backup Code)'}
            {mode === 'recovery_password' && 'Recuperación 2FA: Contraseña'}
            {mode === 'recovery_email' && 'Recuperación 2FA: Código al Correo'}
            {mode === 'setup_step1' && 'Vincular Autenticador (Paso 1 de 2)'}
            {mode === 'setup_step2' && 'Códigos de Respaldo (Paso 2 de 2)'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'verify' && 'Ingresa el código de 6 dígitos de tu aplicación autenticadora'}
            {mode === 'verify_backup' && 'Ingresa uno de tus códigos de 8 caracteres descargados en tu archivo .txt'}
            {mode === 'recovery_password' && 'Confirma tu contraseña actual para autorizar el restablecimiento'}
            {mode === 'recovery_email' && 'Ingresa el código OTP enviado a tu correo electrónico'}
            {mode === 'setup_step1' && 'Escanea el código QR con Google Authenticator o Authy'}
            {mode === 'setup_step2' && 'Descarga y guarda tus códigos de emergencia en un lugar seguro'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs border border-emerald-500/20 flex items-center gap-2">
            <i className="ri-checkbox-circle-line text-sm shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. MODO: VERIFICACIÓN TOTP NORMAL (6 dígitos)                  */}
        {/* ============================================================== */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyExisting} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.3em] font-mono font-bold py-3 px-4 rounded-2xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Verificar y Continuar</span>
            </button>

            {/* Alternativas de Acceso */}
            <div className="pt-3 border-t border-border flex flex-col gap-2.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCode('');
                  setMode('verify_backup');
                }}
                className="text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1.5"
              >
                <i className="ri-key-2-line" />
                <span>¿No tienes tu teléfono? Usar código de respaldo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRecoveryPassword('');
                  setMode('recovery_password');
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
              >
                <i className="ri-lock-password-line" />
                <span>¿Perdiste tu autenticador y códigos? Recuperar cuenta</span>
              </button>

              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <i className="ri-arrow-left-line" />
                  <span>Volver e iniciar sesión con otra cuenta</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 2. MODO: VERIFICACIÓN CON CÓDIGO DE RESPALDO (8 caracteres)    */}
        {/* ============================================================== */}
        {mode === 'verify_backup' && (
          <form onSubmit={handleVerifyBackupCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center">
                Código de 8 caracteres alfanuméricos
              </label>
              <input
                type="text"
                maxLength={8}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                className="w-full text-center text-2xl tracking-[0.2em] font-mono font-bold py-3 px-4 rounded-2xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <span className="text-[11px] text-muted-foreground text-center block mt-1.5">
                Este código se eliminará de tu lista tras ser utilizado.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 8}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Validar Código de Respaldo</span>
            </button>

            <div className="pt-2 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCode('');
                  setMode('verify');
                }}
                className="text-xs text-primary hover:underline transition-colors flex items-center justify-center gap-1 font-medium"
              >
                <i className="ri-arrow-left-line" />
                <span>Volver a código de autenticador</span>
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-1"
              >
                <i className="ri-logout-box-r-line" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 3. MODO: RECUPERACIÓN PASO 1 - CONFIRMAR CONTRASEÑA           */}
        {/* ============================================================== */}
        {mode === 'recovery_password' && (
          <form onSubmit={handleRecoveryStep1Password} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <i className="ri-shield-alert-line text-sm shrink-0 mt-0.5" />
              <span>
                Por seguridad, debes validar tu contraseña actual y luego un código que enviaremos a tu correo registrado.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Contraseña actual de tu cuenta
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={recoveryPassword}
                  onChange={(e) => setRecoveryPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
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

            <button
              type="submit"
              disabled={loading || !recoveryPassword}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Validar Contraseña y Enviar Código al Correo</span>
            </button>

            <div className="pt-2 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('verify');
                }}
                className="text-xs text-primary hover:underline transition-colors flex items-center justify-center gap-1 font-medium"
              >
                <i className="ri-arrow-left-line" />
                <span>Cancelar y volver al código 2FA</span>
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-1"
              >
                <i className="ri-logout-box-r-line" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 4. MODO: RECUPERACIÓN PASO 2 - VALIDAR CÓDIGO DEL CORREO      */}
        {/* ============================================================== */}
        {mode === 'recovery_email' && (
          <form onSubmit={handleRecoveryStep2EmailOtp} className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 flex items-start gap-2">
              <i className="ri-mail-check-line text-sm shrink-0 mt-0.5" />
              <span>
                Revisa tu bandeja de entrada en <strong className="font-mono">{user?.email || profile?.email}</strong> e ingresa el código recibido.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center">
                Código de 6 dígitos del correo
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.3em] font-mono font-bold py-3 px-4 rounded-2xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || emailOtpCode.length !== 6}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Autorizar y Re-vincular 2FA</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('recovery_password');
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Cambiar contraseña
              </button>

              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={loading || resendCooldown > 0}
                className="text-primary hover:underline font-semibold disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 5. MODO: CONFIGURACIÓN PASO 1 - ESCANEAR QR / VINCULAR APP    */}
        {/* ============================================================== */}
        {mode === 'setup_step1' && (
          <form onSubmit={handleVerifyStep1} className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-2xl border border-border">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code 2FA" className="w-48 h-48 rounded-xl bg-white p-2 shadow-sm" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <i className="ri-loader-4-line animate-spin text-2xl text-primary" />
                </div>
              )}

              {/* Botón táctil para teléfonos: Abre Google Authenticator / Authy directamente */}
              {totpUri && (
                <div className="w-full mt-3">
                  <a
                    href={totpUri}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/25 hover:opacity-95 transition-all text-center"
                  >
                    <i className="ri-smartphone-line text-sm" />
                    <span>Vincular con 1 toque en tu App (Google Auth / Authy)</span>
                  </a>
                </div>
              )}

              {/* Clave Manual con Botón de Copiado */}
              <div className="mt-3.5 w-full">
                <div className="flex items-center justify-between mb-1 text-[11px] text-muted-foreground font-semibold">
                  <span>O copia la clave manual:</span>
                  <button
                    type="button"
                    onClick={() => initSetup(true)}
                    className="text-[10px] text-primary hover:underline font-bold"
                    title="Generar un nuevo código si tuviste problemas"
                  >
                    Regenerar QR
                  </button>
                </div>
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    readOnly
                    value={secret}
                    className="flex-1 font-mono text-xs font-bold bg-background text-foreground px-3 py-2 rounded-xl border border-border select-all outline-none text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(secret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 font-bold text-xs text-primary flex items-center gap-1 transition-all shrink-0"
                  >
                    <i className={copiedSecret ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
                    <span>{copiedSecret ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed text-center">
                  💡 En tu app: Toca <strong>(+)</strong> → <strong>Ingresar clave manual</strong> → Nombre: <strong>Kaupaloki</strong> y pega la clave.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center">
                Código de confirmación generado por la App (6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.25em] font-mono font-bold py-2.5 px-4 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Validar y Ver Códigos de Respaldo</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <i className="ri-arrow-left-line" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* 6. MODO: CONFIGURACIÓN PASO 2 - CÓDIGOS DE RESPALDO           */}
        {/* ============================================================== */}
        {mode === 'setup_step2' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-foreground font-semibold text-center py-2">
                {backupCodes.map((c, i) => (
                  <div key={i} className="p-2 rounded-lg bg-background border border-border">
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="py-2.5 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
              >
                <i className={copiedCodes ? 'ri-check-line text-emerald-500' : 'ri-file-copy-line'} />
                <span>{copiedCodes ? 'Copiados' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="py-2.5 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted flex items-center justify-center gap-1.5 transition-colors"
              >
                <i className="ri-download-2-line text-primary" />
                <span>Descargar .txt</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinishSetup}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>He guardado mis códigos y finalizar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};
