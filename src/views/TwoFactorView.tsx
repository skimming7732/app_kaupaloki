import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { generateTotpSecret, generateTotpUri, verifyTotp, generateBackupCodes } from '../utils/totp';

export const TwoFactorView: React.FC = () => {
  const { user, profile, verify2FASession } = useAuth();
  const navigate = useNavigate();

  // Wizard state: 'verify' (if already has secret in profile), or setup: 1 | 2
  const [mode, setMode] = useState<'verify' | 'setup_step1' | 'setup_step2'>('verify');
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    if (profile?.two_factor_secret) {
      setMode('verify');
    } else {
      initSetup();
    }
  }, [profile]);

  const initSetup = () => {
    const newSecret = generateTotpSecret();
    setSecret(newSecret);
    const email = user?.email || 'operador@kaupaloki.co';
    const uri = generateTotpUri(newSecret, email);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uri)}`;
    setQrUrl(qr);
    setBackupCodes(generateBackupCodes());
    setMode('setup_step1');
  };

  const handleVerifyExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.two_factor_secret) return;
    setError(null);
    setLoading(true);

    const isValid = await verifyTotp(code.trim(), profile.two_factor_secret);
    if (isValid) {
      verify2FASession();
      navigate('/inicio');
    } else {
      setError('Código incorrecto o expirado. Intente con el código actual.');
      setLoading(false);
    }
  };

  const handleVerifyStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const isValid = await verifyTotp(code.trim(), secret);
    if (isValid) {
      // Advance to step 2 (Backup codes screen)
      setMode('setup_step2');
      setLoading(false);
    } else {
      setError('El código ingresado no coincide con el generador TOTP.');
      setLoading(false);
    }
  };

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
          two_factor_backup_codes: backupCodes
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      verify2FASession();
      navigate('/inicio');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la configuración 2FA');
      setLoading(false);
    }
  };

  const handleDownloadTxt = () => {
    const content = `KAUPALOKI - CÓDIGOS DE RESPALDO 2FA\nUsuario: ${user?.email}\nFecha: ${new Date().toLocaleString()}\n\nGuarde estos códigos en un lugar seguro. Cada código solo puede usarse una vez:\n\n${backupCodes.join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kaupaloki-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            <i className="ri-shield-keyhole-line" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {mode === 'verify' ? 'Verificación de Seguridad' : 'Configurar 2FA Obligatorio'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'verify'
              ? 'Ingresa el código de 6 dígitos de tu aplicación autenticadora'
              : mode === 'setup_step1'
              ? 'Paso 1 de 2: Escanea el código QR y valida la vinculación'
              : 'Paso 2 de 2: Guarda tus códigos de respaldo de emergencia'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE: VERIFY EXISTING */}
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
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={initSetup}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                ¿Perdiste acceso a tu autenticador? Re-vincular aquí
              </button>
            </div>
          </form>
        )}

        {/* MODE: SETUP STEP 1 */}
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
              <div className="mt-3 text-center">
                <span className="text-[11px] text-muted-foreground block">Clave secreta manual:</span>
                <span className="text-xs font-mono font-bold text-foreground select-all">{secret}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-center">
                Código de confirmación (6 dígitos)
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
          </form>
        )}

        {/* MODE: SETUP STEP 2 (BACKUP CODES & TXT DOWNLOAD) */}
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
                <i className={copiedCodes ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
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
  );
};
