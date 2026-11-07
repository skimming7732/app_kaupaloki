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
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    const finishSound = prepareSuccessSound();
    try {
      const res = await sendUserInvite(user.correo, user.nombre);
      if (res.success) {
        finishSound(true);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <i className="ri-mail-send-line text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Enviar Invitación</h3>
            <p className="text-xs text-muted-foreground">Notificación de acceso al sistema</p>
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center text-emerald-500">
            <i className="ri-checkbox-circle-line text-4xl mb-2 block" />
            <p className="font-semibold text-sm">¡Correo de invitación enviado con éxito!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Se enviará un correo a <strong className="text-foreground">{user.correo}</strong> con un enlace seguro para unirse a Kaupaloki y configurar su contraseña y 2FA.
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
                onClick={onClose}
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
                <span>Enviar Correo</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
