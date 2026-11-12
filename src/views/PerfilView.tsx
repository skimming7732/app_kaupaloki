import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotp,
  generateBackupCodes,
} from '../utils/totp';
import {
  isMobileBiometricSupported,
  isCurrentDeviceEnrolled,
  normalizeBiometricCredentials,
  registerMobileBiometric,
  setLocalBiometricCredentialId,
} from '../utils/biometricAuth';
import {
  canOfferPushOnCurrentDevice,
  getDeviceFriendlyName,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  checkIsSubscribedLocally,
  sendLocalTestNotification,
  isMobileDevice,
  isStandaloneApp,
} from '../utils/pushNotificationService';
import type { AppVersion } from '../components/modals/WhatsNewModal';

export const PerfilView: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const currentPath = location.pathname.replace(/\/$/, '');
  const activeTab: 'resumen' | 'datos' | 'seguridad' | 'notificaciones' =
    currentPath === '/perfil/datos'
      ? 'datos'
      : currentPath === '/perfil/seguridad'
      ? 'seguridad'
      : currentPath === '/perfil/notificaciones'
      ? 'notificaciones'
      : 'resumen';

  // --- TAB 2: DATOS PERSONALES STATE ---
  const [nombre, setNombre] = useState(profile?.nombre || profile?.full_name || '');
  const [pais, setPais] = useState(profile?.pais || 'Colombia');
  const [currentPasswordForData, setCurrentPasswordForData] = useState('');
  const [showDataPassword, setShowDataPassword] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- TAB 3: CAMBIO DE CONTRASEÑA STATE ---
  const [currentPasswordForPwd, setCurrentPasswordForPwd] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- TAB 3: GESTIÓN DE 2FA STATE ---
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [new2faSecret, setNew2faSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [saving2fa, setSaving2fa] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaMessage, setMfaMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- TAB 3: FACE ID / BIOMETRÍA MÓVIL STATE ---
  const [mobileBiometricSupported, setMobileBiometricSupported] = useState(false);
  const [savingBiometric, setSavingBiometric] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const biometricCredentials = normalizeBiometricCredentials(profile?.biometric_credentials);
  const isThisDeviceEnrolled = isCurrentDeviceEnrolled(user?.id, biometricCredentials);

  // --- TAB 4: NOVEDADES & NOTIFICACIONES STATE ---
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [versionsList, setVersionsList] = useState<AppVersion[]>([]);
  const [confirmedVersionIds, setConfirmedVersionIds] = useState<Set<string>>(new Set());
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    let active = true;
    void isMobileBiometricSupported().then((supported) => {
      if (active) setMobileBiometricSupported(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRegisterBiometricProfile = async () => {
    if (!user) return;
    setBiometricMessage(null);
    setSavingBiometric(true);
    try {
      const cred = await registerMobileBiometric({
        id: user.id,
        email: user.email || profile?.email || 'operador@kaupaloki.co',
        name: profile?.full_name || profile?.nombre || user.email,
      });
      // Replace with the new phone credential so the active phone is cleanly linked
      const updatedList = [cred];
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ biometric_credentials: updatedList })
        .eq('id', user.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      setBiometricMessage({
        text: '¡Face ID / Biometría configurado con éxito en este teléfono! Tus próximos inicios de sesión desde el móvil usarán Face ID.',
        type: 'success',
      });
    } catch (err: any) {
      setBiometricMessage({
        text: err?.message || 'No se pudo configurar Face ID en este teléfono.',
        type: 'error',
      });
    } finally {
      setSavingBiometric(false);
    }
  };

  const handleRemoveBiometricProfile = async () => {
    if (!user) return;
    setBiometricMessage(null);
    setSavingBiometric(true);
    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ biometric_credentials: [] })
        .eq('id', user.id);
      if (dbErr) throw dbErr;
      setLocalBiometricCredentialId(user.id, null);
      await refreshProfile();
      setBiometricMessage({
        text: 'Face ID desvinculado. En tus inicios de sesión móviles se solicitará el código 2FA o podrás vincular un teléfono nuevo.',
        type: 'success',
      });
    } catch (err: any) {
      setBiometricMessage({
        text: err?.message || 'No se pudo desvincular Face ID.',
        type: 'error',
      });
    } finally {
      setSavingBiometric(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || profile.full_name || '');
      setPais(profile.pais || 'Colombia');
    }
  }, [profile]);

  // Handle Tab Click
  const handleTabClick = (tab: 'resumen' | 'datos' | 'seguridad' | 'notificaciones') => {
    setDataMessage(null);
    setPwdMessage(null);
    setMfaMessage(null);
    setPushMessage(null);
    if (tab === 'resumen') navigate('/perfil');
    else if (tab === 'datos') navigate('/perfil/datos');
    else if (tab === 'seguridad') navigate('/perfil/seguridad');
    else if (tab === 'notificaciones') navigate('/perfil/notificaciones');
  };

  // Carga de estado para la pestaña de Novedades & Notificaciones
  useEffect(() => {
    if (activeTab !== 'notificaciones') return;

    setPushPermission(getPushPermission());
    void checkIsSubscribedLocally().then((sub) => setIsPushSubscribed(sub));

    const loadHistory = async () => {
      setLoadingVersions(true);
      try {
        const { data: vData } = await supabase
          .from('app_versions')
          .select('*')
          .eq('is_published', true)
          .order('version_code', { ascending: false });

        if (vData) setVersionsList(vData as AppVersion[]);

        if (user) {
          const { data: cData } = await supabase
            .from('user_version_confirmations')
            .select('version_id')
            .eq('user_id', user.id);

          if (cData) {
            setConfirmedVersionIds(new Set(cData.map((c: any) => c.version_id)));
          }
        }
      } catch (err) {
        console.error('Error cargando historial de versiones:', err);
      } finally {
        setLoadingVersions(false);
      }
    };

    void loadHistory();
  }, [activeTab, user]);

  const handleEnablePush = async () => {
    if (!user) return;
    setSavingPush(true);
    setPushMessage(null);
    try {
      const res = await subscribeToPush(user.id);
      if (res.success) {
        setIsPushSubscribed(true);
        setPushPermission('granted');
        await sendLocalTestNotification();
        setPushMessage({
          text: '¡Notificaciones push activadas exitosamente en este dispositivo!',
          type: 'success',
        });
      } else {
        setPushMessage({
          text: res.error || 'No se pudieron activar las notificaciones.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setPushMessage({
        text: err?.message || 'Error al solicitar permisos de notificación.',
        type: 'error',
      });
    } finally {
      setSavingPush(false);
    }
  };

  const handleDisablePush = async () => {
    if (!user) return;
    setSavingPush(true);
    setPushMessage(null);
    try {
      await unsubscribeFromPush(user.id);
      setIsPushSubscribed(false);
      setPushMessage({
        text: 'Notificaciones desactivadas para este dispositivo.',
        type: 'success',
      });
    } catch (err: any) {
      setPushMessage({
        text: err?.message || 'Error al desactivar notificaciones.',
        type: 'error',
      });
    } finally {
      setSavingPush(false);
    }
  };

  const handleTestNotification = async () => {
    setPushMessage(null);
    const ok = await sendLocalTestNotification();
    if (ok) {
      setPushMessage({
        text: 'Notificación de prueba emitida en este dispositivo.',
        type: 'success',
      });
    } else {
      setPushMessage({
        text: 'No se pudo emitir la notificación de prueba. Verifica los permisos del navegador.',
        type: 'error',
      });
    }
  };

  // --- GUARDAR DATOS PERSONALES (Requiere Contraseña Actual) ---
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setDataMessage(null);

    if (!nombre.trim()) {
      setDataMessage({ text: 'El nombre completo es requerido.', type: 'error' });
      return;
    }

    if (!currentPasswordForData) {
      setDataMessage({
        text: 'Por seguridad, debes ingresar tu contraseña actual para autorizar los cambios.',
        type: 'error',
      });
      return;
    }

    setSavingData(true);
    try {
      // 1. Validar la contraseña actual con Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPasswordForData,
      });

      if (authError) {
        throw new Error(
          'La contraseña ingresada es incorrecta. No se realizaron cambios por protección de tu cuenta.'
        );
      }

      // 2. Guardar en tabla `profiles`
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: nombre.trim(),
          pais: pais.trim(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Actualizar metadata de Supabase Auth
      await supabase.auth.updateUser({
        data: { full_name: nombre.trim() },
      });

      await refreshProfile();
      setCurrentPasswordForData('');
      setDataMessage({
        text: '¡Tus datos personales han sido actualizados con éxito!',
        type: 'success',
      });
    } catch (err: any) {
      setDataMessage({
        text: err?.message || 'Error al actualizar los datos.',
        type: 'error',
      });
    } finally {
      setSavingData(false);
    }
  };

  // --- CAMBIAR CONTRASEÑA ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPwdMessage(null);

    if (!currentPasswordForPwd) {
      setPwdMessage({ text: 'Por favor ingresa tu contraseña actual.', type: 'error' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPwdMessage({
        text: 'La nueva contraseña debe tener como mínimo 6 caracteres.',
        type: 'error',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ text: 'Las nuevas contraseñas no coinciden.', type: 'error' });
      return;
    }

    setSavingPassword(true);
    try {
      // 1. Validar la contraseña actual
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPasswordForPwd,
      });

      if (verifyError) {
        throw new Error('Tu contraseña actual es incorrecta.');
      }

      // 2. Actualizar a la nueva contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setCurrentPasswordForPwd('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMessage({
        text: '¡Contraseña actualizada correctamente! Se ha despachado una notificación de seguridad a tu correo.',
        type: 'success',
      });
    } catch (err: any) {
      setPwdMessage({
        text: err?.message || 'Error al modificar la contraseña.',
        type: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // --- INICIAR CONFIGURACIÓN DE 2FA ---
  const [profileTotpUri, setProfileTotpUri] = useState('');

  const handleStart2faSetup = (forceNew = false) => {
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

    setNew2faSecret(activeSecret);
    const email = user?.email || profile?.email || 'operador@kaupaloki.co';
    const uri = generateTotpUri(activeSecret, email);
    setProfileTotpUri(uri);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`;
    setQrUrl(qr);
    setBackupCodes(activeCodes);
    setOtpCode('');
    setMfaMessage(null);
    setShow2faSetup(true);
  };

  // --- CONFIRMAR Y ACTIVAR 2FA ---
  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !new2faSecret) return;
    setMfaMessage(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setMfaMessage({
        text: 'Ingresa el código numérico de 6 dígitos emitido por tu app autenticadora.',
        type: 'error',
      });
      return;
    }

    setSaving2fa(true);
    try {
      const isValid = await verifyTotp(otpCode.trim(), new2faSecret);
      if (!isValid) {
        throw new Error('Código TOTP inválido o expirado. Asegúrate de que la hora de tu teléfono esté sincronizada.');
      }

      const { error: saveError } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: new2faSecret,
          two_factor_enabled: true,
          two_factor_backup_codes: backupCodes,
        })
        .eq('id', user.id);

      if (saveError) throw saveError;

      sessionStorage.removeItem('kpl_pending_2fa_secret');
      sessionStorage.removeItem('kpl_pending_backup_codes');

      await refreshProfile();
      setShow2faSetup(false);
      setOtpCode('');
      setMfaMessage({
        text: '¡Autenticación en Dos Pasos (2FA) vinculada y verificada exitosamente!',
        type: 'success',
      });
    } catch (err: any) {
      setMfaMessage({
        text: err?.message || 'Error al validar el código 2FA.',
        type: 'error',
      });
    } finally {
      setSaving2fa(false);
    }
  };

  const fullName = profile?.nombre || profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const email = user?.email || profile?.email || '';
  const initial = fullName.charAt(0).toUpperCase();
  const rolDisplay = profile?.rol || 'OPERADOR';
  const operatorCode = profile?.operator_code || profile?.codigo || 'KPL-001';

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-2">
      {/* Top Profile Summary Header Card */}
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* Sleek brand gradient */}
        <div className="h-16 bg-gradient-to-r from-[#0B1426] via-[#172554] to-[#4318FF] flex items-center justify-end px-6">
          <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/15">
            Kaupaloki ID
          </span>
        </div>

        {/* User identification info */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-black shadow-sm flex-shrink-0">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-black text-foreground tracking-tight">{fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase border border-primary/20">
                  {rolDisplay}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                  ✓ Cuenta Activa
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span>{email}</span>
                <span>•</span>
                <span className="font-mono text-muted-foreground">{operatorCode}</span>
              </p>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex border-t border-border bg-muted/20 px-2 sm:px-4 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => handleTabClick('resumen')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'resumen'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className="ri-user-3-line text-sm" />
            <span>Resumen del Perfil</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('datos')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'datos'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className="ri-edit-box-line text-sm" />
            <span>Datos Personales</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('seguridad')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'seguridad'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className="ri-shield-keyhole-line text-sm" />
            <span>Seguridad & 2FA</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('notificaciones')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'notificaciones'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className="ri-notification-3-line text-sm" />
            <span>Novedades & Notificaciones</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: RESUMEN DEL PERFIL (/perfil) */}
      {/* ============================================================ */}
      {activeTab === 'resumen' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card: Información Operativa */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                  <i className="ri-file-user-line text-primary text-sm" />
                  <span>Información Operativa</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleTabClick('datos')}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <i className="ri-pencil-line" />
                  <span>Editar</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Nombre Oficial</span>
                  <span className="font-bold text-foreground block truncate">{fullName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Rol Asignado</span>
                  <span className="font-bold text-foreground block">{rolDisplay}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Código Operador</span>
                  <span className="font-mono font-bold text-foreground block">{operatorCode}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">País de Operación</span>
                  <span className="font-bold text-foreground block">{profile?.pais || 'Colombia'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Correo Operativo</span>
                  <span className="font-bold text-foreground block truncate">{email}</span>
                </div>
              </div>
            </div>

            {/* Card: Estado de Protección y Seguridad */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                  <i className="ri-shield-check-line text-emerald-500 text-sm" />
                  <span>Estado de Seguridad</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleTabClick('seguridad')}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <i className="ri-settings-4-line" />
                  <span>Configurar</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Doble Factor (2FA)</span>
                    <span className="text-[11px] text-muted-foreground block">Protección criptográfica TOTP</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Activo y Enlazado
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Contraseña de Acceso</span>
                    <span className="text-[11px] text-muted-foreground block">Cifrado estándar PBKDF2/Argon2</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Segura
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Face ID / Biometría Móvil</span>
                    <span className="text-[11px] text-muted-foreground block">Inicio rápido exclusivo en teléfonos</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    biometricCredentials.length > 0
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {biometricCredentials.length > 0 ? 'Vinculado' : 'Disponible en Móvil'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Alertas por Correo</span>
                    <span className="text-[11px] text-muted-foreground block">Notificaciones activas a {email}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Habilitadas
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleTabClick('datos')}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all flex items-center justify-between group shadow-sm text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                  <i className="ri-user-settings-line" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Actualizar Datos Personales</h3>
                  <p className="text-[11px] text-muted-foreground">Modifica tu nombre, teléfono y país con contraseña</p>
                </div>
              </div>
              <i className="ri-arrow-right-s-line text-muted-foreground text-lg group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('seguridad')}
              className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all flex items-center justify-between group shadow-sm text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-base group-hover:scale-105 transition-transform">
                  <i className="ri-lock-password-line" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Gestionar Contraseña & 2FA</h3>
                  <p className="text-[11px] text-muted-foreground">Cambia tu clave o vincula un nuevo autenticador</p>
                </div>
              </div>
              <i className="ri-arrow-right-s-line text-muted-foreground text-lg group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: DATOS PERSONALES (/perfil/datos) */}
      {/* (Se requiere ingresar contraseña obligatoria para confirmar) */}
      {/* ============================================================ */}
      {activeTab === 'datos' && (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-6 animate-fade-in">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <i className="ri-user-shared-line text-primary" />
              <span>Modificación de Datos Personales</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Actualiza tu información de contacto. Por políticas de seguridad financiera, debes confirmar tu contraseña de acceso para autorizar cualquier cambio.
            </p>
          </div>

          {dataMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                dataMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              <i
                className={`text-base ${
                  dataMessage.type === 'success'
                    ? 'ri-checkbox-circle-fill'
                    : 'ri-error-warning-fill'
                }`}
              />
              <span className="font-semibold">{dataMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveData} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  País o Jurisdicción
                </label>
                <input
                  type="text"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="Ej. Colombia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>


              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                  Correo Electrónico (Solo Lectura)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/60 text-xs text-muted-foreground cursor-not-allowed outline-none"
                  />
                  <i className="ri-lock-2-line text-muted-foreground text-xs absolute right-3 top-3" />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  El correo principal solo se modifica mediante verificación formal en Supabase.
                </span>
              </div>
            </div>

            {/* MANDATORY PASSWORD VERIFICATION SECTION */}
            <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <i className="ri-shield-flash-line text-base font-bold" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Autorización de Seguridad Requerida
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ingresa tu contraseña actual para confirmar tu identidad antes de registrar cualquier modificación en tus datos.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1">
                  Tu Contraseña Actual *
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showDataPassword ? 'text' : 'password'}
                    required
                    value={currentPasswordForData}
                    onChange={(e) => setCurrentPasswordForData(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    className="w-full px-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDataPassword(!showDataPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <i className={showDataPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingData}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2"
              >
                {savingData ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Verificando y Guardando...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-save-line" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SEGURIDAD, CONTRASEÑA Y 2FA (/perfil/seguridad) */}
      {/* ============================================================ */}
      {activeTab === 'seguridad' && (
        <div className="space-y-6 animate-fade-in">
          {/* Card 1: Cambio de Contraseña */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="ri-key-2-line text-primary" />
                <span>Cambiar Contraseña</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Actualiza tu clave de acceso. Te enviaremos una notificación automática a tu correo al completarse el cambio.
              </p>
            </div>

            {pwdMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  pwdMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                <i
                  className={`text-base ${
                    pwdMessage.type === 'success'
                      ? 'ri-checkbox-circle-fill'
                      : 'ri-error-warning-fill'
                  }`}
                />
                <span className="font-semibold">{pwdMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      type={showPwdFields ? 'text' : 'password'}
                      required
                      value={currentPasswordForPwd}
                      onChange={(e) => setCurrentPasswordForPwd(e.target.value)}
                      placeholder="Contraseña actual"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <input
                    type={showPwdFields ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    Confirmar Nueva
                  </label>
                  <input
                    type={showPwdFields ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPwdFields(!showPwdFields)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <i className={showPwdFields ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  <span>{showPwdFields ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2"
                >
                  {savingPassword ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Autenticación de Dos Factores (2FA / TOTP) */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="ri-shield-keyhole-line text-emerald-500 text-base" />
                  <span>Autenticación de Dos Factores (2FA - TOTP)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Protege tu cuenta con códigos temporales generados por Google Authenticator, Authy o 1Password.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                ✓ Activo en tu Cuenta
              </span>
            </div>

            {mfaMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  mfaMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                <i
                  className={`text-base ${
                    mfaMessage.type === 'success'
                      ? 'ri-checkbox-circle-fill'
                      : 'ri-error-warning-fill'
                  }`}
                />
                <span className="font-semibold">{mfaMessage.text}</span>
              </div>
            )}

            {!show2faSetup ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground">¿Cambiaste de teléfono o perdiste tu app?</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Puedes generar una nueva clave secreta QR para sincronizar tu autenticador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStart2faSetup()}
                  className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-bold text-foreground flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <i className="ri-qr-code-line text-primary" />
                  <span>Re-vincular Autenticador 2FA</span>
                </button>
              </div>
            ) : (
              /* INTERACTIVE 2FA CONFIGURATION WIZARD */
              <div className="p-5 rounded-2xl bg-muted/30 border border-primary/20 space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">
                    Configuración de Nuevo Factor 2FA
                  </span>
                  <button
                    type="button"
                    onClick={() => setShow2faSetup(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Left: QR Code */}
                  <div className="flex flex-col items-center p-4 bg-card rounded-xl border border-border">
                    <span className="text-[11px] font-bold text-muted-foreground mb-2">
                      1. Escanea este código con tu app
                    </span>
                    <img
                      src={qrUrl}
                      alt="Código QR 2FA"
                      className="w-44 h-44 rounded-lg border border-border p-1 bg-white"
                    />

                    {/* Botón táctil para teléfonos: Abre Google Authenticator / Authy con 1 toque */}
                    {profileTotpUri && (
                      <div className="w-full mt-3">
                        <a
                          href={profileTotpUri}
                          className="w-full py-2 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-95 transition-all text-center"
                        >
                          <i className="ri-smartphone-line text-sm" />
                          <span>Vincular con 1 toque en tu App</span>
                        </a>
                      </div>
                    )}

                    <div className="mt-3 text-center w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Clave manual:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStart2faSetup(true)}
                          className="text-[10px] text-primary hover:underline font-bold"
                          title="Generar un nuevo código si tuviste problemas"
                        >
                          Regenerar QR
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center w-full">
                        <code className="text-[11px] font-mono font-bold bg-muted px-2.5 py-1.5 rounded-lg border border-border flex-1 truncate">
                          {new2faSecret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(new2faSecret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-primary flex items-center gap-1"
                        >
                          <i className={copiedSecret ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
                          <span>{copiedSecret ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: OTP Verification Form */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                        2. Ingresa el código de 6 dígitos emitido
                      </span>
                      <form onSubmit={handleConfirm2fa} className="space-y-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full text-center font-mono text-2xl font-black tracking-[8px] py-2.5 rounded-xl border border-input bg-card text-primary focus:ring-2 focus:ring-primary/30 outline-none"
                        />
                        <button
                          type="submit"
                          disabled={saving2fa || otpCode.length !== 6}
                          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-50"
                        >
                          {saving2fa ? 'Validando...' : 'Confirmar y Guardar 2FA'}
                        </button>
                      </form>
                    </div>

                    {/* Backup Codes */}
                    {backupCodes.length > 0 && (
                      <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">
                            Códigos de Recuperación
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(backupCodes.join('\n'));
                              setCopiedCodes(true);
                              setTimeout(() => setCopiedCodes(false), 2000);
                            }}
                            className="text-[10px] font-bold text-primary hover:underline"
                          >
                            {copiedCodes ? '¡Copiados!' : 'Copiar Códigos'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-muted-foreground">
                          {backupCodes.slice(0, 4).map((c, i) => (
                            <div key={i} className="bg-muted/40 px-2 py-0.5 rounded text-center">
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Face ID / Biometría en Teléfono (Solo Móvil) */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="ri-fingerprint-line text-primary text-base" />
                  <span>Face ID / Biometría en Teléfono (Solo Móvil)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Usa Face ID o tu huella en tu celular en lugar del código 2FA. Si cambias de teléfono, siempre podrás entrar con tu código 2FA y volver a configurar Face ID aquí.
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                  biometricCredentials.length > 0
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {biometricCredentials.length > 0 ? '✓ Teléfono Vinculado' : 'No vinculado'}
              </span>
            </div>

            {biometricMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  biometricMessage.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                    : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
              >
                <i
                  className={`text-base ${
                    biometricMessage.type === 'success'
                      ? 'ri-checkbox-circle-fill'
                      : 'ri-error-warning-fill'
                  }`}
                />
                <span className="font-semibold">{biometricMessage.text}</span>
              </div>
            )}

            {biometricCredentials.length > 0 && (
              <div className="space-y-2">
                {biometricCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-base">
                        <i className="ri-smartphone-line" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{cred.deviceLabel}</span>
                          {isThisDeviceEnrolled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              Este teléfono
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          Vinculado el {new Date(cred.createdAt).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingBiometric}
                      onClick={() => void handleRemoveBiometricProfile()}
                      className="px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <i className="ri-delete-bin-line" />
                      <span>Desvincular</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {mobileBiometricSupported ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    {biometricCredentials.length > 0
                      ? '¿Cambiaste de teléfono o deseas actualizar tu Face ID?'
                      : 'Activar Face ID en este teléfono'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {biometricCredentials.length > 0
                      ? 'Reemplaza la vinculación anterior y autoriza este teléfono para iniciar sesión con Face ID.'
                      : 'Vincula este teléfono para desbloquear tu sesión con tu rostro o huella sin abrir la app de códigos.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingBiometric}
                  onClick={() => void handleRegisterBiometricProfile()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:opacity-95 transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <i className={savingBiometric ? 'ri-loader-4-line animate-spin' : 'ri-fingerprint-line text-sm'} />
                  <span>
                    {savingBiometric
                      ? 'Vinculando...'
                      : biometricCredentials.length > 0
                      ? 'Volver a configurar Face ID'
                      : 'Configurar Face ID en este teléfono'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                <i className="ri-smartphone-line text-primary text-base mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground block mb-0.5">Configuración exclusiva desde tu teléfono móvil</strong>
                  Para vincular o volver a configurar Face ID en un teléfono nuevo, abre <strong>app.kaupaloki.co</strong> desde el navegador de tu celular, inicia sesión con tu código 2FA y entra a esta sección de <strong>Seguridad &amp; 2FA</strong>. En computador siempre se solicitará tu código 2FA de 6 dígitos.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: NOVEDADES & NOTIFICACIONES (/perfil/notificaciones)  */}
      {/* ============================================================ */}
      {activeTab === 'notificaciones' && (
        <div className="space-y-6 animate-fade-in">
          {/* Card 1: Estado de Notificaciones Push de este Dispositivo */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
                  <i className="ri-notification-3-fill" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Notificaciones Push en este Dispositivo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getDeviceFriendlyName()}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isMobileDevice() && !isStandaloneApp() ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <i className="ri-information-line" />
                    Requiere App Instalada
                  </span>
                ) : pushPermission === 'granted' && isPushSubscribed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <i className="ri-checkbox-circle-fill" />
                    Activas en este Dispositivo
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                    <i className="ri-close-circle-fill" />
                    Bloqueadas en el Navegador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                    <i className="ri-time-line" />
                    No Configuradas
                  </span>
                )}
              </div>
            </div>

            {/* Mensajes de feedback */}
            {pushMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  pushMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                }`}
              >
                <i className={pushMessage.type === 'success' ? 'ri-checkbox-circle-line text-sm' : 'ri-error-warning-line text-sm'} />
                <span>{pushMessage.text}</span>
              </div>
            )}

            {/* Explicación / Condiciones de activación */}
            {isMobileDevice() && !isStandaloneApp() ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <i className="ri-alert-line text-sm" />
                  <span>Uso exclusivo en App instalada</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  En iPhone y Android, las notificaciones push únicamente se habilitan cuando la aplicación se ejecuta como app instalada (añadida a la pantalla de inicio). Desde navegadores móviles convencionales esta opción no está disponible.
                </p>
              </div>
            ) : pushPermission === 'denied' ? (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                  <i className="ri-error-warning-line text-sm" />
                  <span>Permiso bloqueado en este navegador</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Has bloqueado los permisos de notificación en este navegador. Para activarlas, pulsa el ícono de candado o configuración del sitio en la barra de direcciones de tu navegador y cambia el permiso de «Notificaciones» a «Permitir».
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                  {isPushSubscribed
                    ? 'Tu navegador está suscrito al canal de notificaciones. Puedes emitir una prueba para comprobar que se reciban correctamente en tu pantalla.'
                    : 'Activa las notificaciones en este dispositivo para recibir resúmenes breves de nuevas versiones y avisos contables importantes.'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {isPushSubscribed ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="px-3.5 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-semibold border border-border transition-colors flex items-center gap-1.5"
                      >
                        <i className="ri-notification-badge-line" />
                        <span>Probar Notificación</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDisablePush}
                        disabled={savingPush}
                        className="px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold border border-destructive/20 transition-colors flex items-center gap-1.5"
                      >
                        <i className="ri-notification-off-line" />
                        <span>Desactivar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={savingPush}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:opacity-95 transition-all whitespace-nowrap disabled:opacity-50"
                    >
                      {savingPush ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-sm" />
                          <span>Activando...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-notification-3-line text-sm" />
                          <span>Activar Notificaciones Push</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Historial de Versiones y Novedades del Sistema */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="ri-history-line text-primary" />
                  <span>Historial de Versiones y Novedades</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Registro cronológico de actualizaciones del sistema Kaupaloki
                </p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                Mostrando las últimas {Math.min(3, versionsList.length)} notificaciones
              </span>
            </div>

            {/* Aviso explicativo */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-start gap-2.5">
              <i className="ri-shield-check-line text-primary text-sm mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Confirmación por cuenta: </strong>
                Las novedades no confirmadas se presentan en un pop-up obligatorio en tiempo real al iniciar sesión. Recibir o abrir una notificación push no marca las novedades como leídas; la confirmación queda registrada únicamente tras pulsar «Entendido».
              </p>
            </div>

            {loadingVersions ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin text-base" />
                <span>Cargando historial de versiones...</span>
              </div>
            ) : versionsList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">
                No hay versiones registradas.
              </div>
            ) : (
              <div className="space-y-4">
                {versionsList.slice(0, 3).map((ver) => {
                  const isConfirmed = confirmedVersionIds.has(ver.id);
                  return (
                    <div
                      key={ver.id}
                      className="rounded-2xl border border-border bg-background p-4 sm:p-5 space-y-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                            {ver.version}
                          </span>
                          <h4 className="text-sm font-bold text-foreground">{ver.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <i className="ri-checkbox-circle-fill text-[11px]" />
                              Confirmada en tu cuenta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <i className="ri-time-fill text-[11px]" />
                              Pendiente de confirmación
                            </span>
                          )}
                          {ver.released_at && (
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {new Date(ver.released_at).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {ver.summary && (
                        <p className="text-xs text-muted-foreground leading-relaxed bg-card p-3 rounded-xl border border-border/60">
                          {ver.summary}
                        </p>
                      )}

                      {/* Lista de cambios */}
                      {Array.isArray(ver.changes) && ver.changes.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {ver.changes.map((item, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2.5 rounded-xl bg-card border border-border/80 flex items-start gap-2 text-xs"
                            >
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 bg-primary/10 text-primary border border-primary/20">
                                {item.category || 'Novedad'}
                              </span>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground mr-1">
                                  {item.title}:
                                </span>
                                <span className="text-muted-foreground leading-relaxed">
                                  {item.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
