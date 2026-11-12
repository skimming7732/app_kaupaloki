import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  canOfferPushOnCurrentDevice,
  hasDismissedPushPrompt,
  dismissPushPrompt,
  getPushPermission,
  subscribeToPush,
  getDeviceFriendlyName,
  sendLocalTestNotification,
} from '../../utils/pushNotificationService';

interface PushPermissionPromptProps {
  isWhatsNewOpen?: boolean;
}

export const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({ isWhatsNewOpen = false }) => {
  const { user, is2faVerified } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Solo evaluar si el usuario ya verificó 2FA y no está el modal bloqueante de novedades abierto
    if (!user || !is2faVerified || isWhatsNewOpen) {
      setShouldShow(false);
      return;
    }

    // Regla estricta de dispositivo:
    // En móviles (Android e iPhone) ÚNICAMENTE si es app instalada (standalone), NUNCA navegador móvil.
    // En PC / escritorio: permitido si el navegador soporta notificaciones.
    if (!canOfferPushOnCurrentDevice()) {
      setShouldShow(false);
      return;
    }

    // Evitar solicitudes duplicadas y respetar los rechazos en este dispositivo
    if (hasDismissedPushPrompt()) {
      setShouldShow(false);
      return;
    }

    const permission = getPushPermission();
    if (permission === 'granted' || permission === 'denied') {
      setShouldShow(false);
      return;
    }

    // Si cumple todas las condiciones, mostrar tras un breve retardo de cortesía (1.2s)
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, is2faVerified, isWhatsNewOpen]);

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await subscribeToPush(user.id);
      if (res.success) {
        // Enviar notificación de confirmación
        await sendLocalTestNotification();
        setShouldShow(false);
      } else {
        setErrorMsg(res.error || 'No se pudo activar el permiso de notificaciones.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error activando notificaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Guarda el rechazo en localStorage de este dispositivo específico
    // La autorización o rechazo en este dispositivo NO impide ofrecerla en otro dispositivo
    dismissPushPrompt();
    setShouldShow(false);
  };

  if (!shouldShow) return null;

  const deviceLabel = getDeviceFriendlyName();

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full animate-slide-up">
      <div className="bg-card border border-primary/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md bg-card/95">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
            <i className="ri-notification-3-fill" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-md bg-primary/10">
                {deviceLabel}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              ¿Activar notificaciones push?
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Recibe avisos de nuevas versiones del sistema, novedades acumuladas y alertas operativas directamente en este dispositivo.
            </p>

            {errorMsg && (
              <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg mt-2">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3.5">
              <button
                type="button"
                onClick={handleAccept}
                disabled={loading}
                className="flex-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin" />
                    <span>Activando...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-check-line" />
                    <span>Activar</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
