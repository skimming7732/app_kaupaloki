import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import type { AppUser } from '../../context/DataContext';

interface SendInviteModalProps {
  isOpen: boolean;
  user: AppUser | null;
  onClose: () => void;
}

export const SendInviteModal: React.FC<SendInviteModalProps> = ({ isOpen, user, onClose }) => {
  const { sendUserInvite } = useData();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setActionLink(null);
    const finishSound = prepareSuccessSound();
    try {
      const res = await sendUserInvite(user.correo, user.nombre);
      if (res.success) {
        finishSound(true);
        setSuccess(true);
        if (res.actionLink) {
          setActionLink(res.actionLink);
        } else {
          setTimeout(() => {
            setSuccess(false);
            onClose();
          }, 1800);
        }
      } else {
        setError(res.error || 'No se pudo enviar la invitación');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      finishSound(false);
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!actionLink) return;
    navigator.clipboard.writeText(actionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setSuccess(false);
    setActionLink(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative max-sm:fixed max-sm:inset-0 max-sm:m-0 max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <i className="ri-mail-send-line text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Enviar Invitación</h3>
            <p className="text-xs text-muted-foreground">Notificación y enlace de acceso al sistema</p>
          </div>
        </div>

        {success ? (
          <div className="py-3 space-y-4">
            <div className="text-center text-emerald-500">
              <i className="ri-checkbox-circle-line text-4xl mb-1 block" />
              <p className="font-bold text-sm">¡Invitación procesada con éxito!</p>
            </div>

            {actionLink ? (
              <div className="p-3.5 rounded-2xl bg-muted/60 border border-border space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Enlace directo de acceso / invitación:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={actionLink}
                    className="flex-1 text-xs font-mono bg-card px-3 py-2 rounded-xl border border-border text-foreground select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shrink-0 transition-opacity"
                  >
                    <i className={copied ? "ri-check-line text-emerald-300" : "ri-file-copy-line"} />
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Puedes copiar este enlace y enviárselo directamente al usuario por WhatsApp o correo.
                </p>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                Se envió la notificación al correo del usuario.
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Se enviará una invitación a <strong className="text-foreground">{user.correo}</strong> con un enlace seguro para unirse a Kaupaloki y configurar su contraseña y 2FA.
            </p>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                <i className="ri-error-warning-line text-sm" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
              >
                {loading && <i className="ri-loader-4-line animate-spin" />}
                <span>Enviar Invitación</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
