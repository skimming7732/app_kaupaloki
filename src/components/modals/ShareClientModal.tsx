import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import { prepareSuccessSound } from '../../utils/confirmationSound';

interface ShareClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: {
    id: string;
    codigo: string;
    nombre: string;
    pais?: string;
  } | null;
}

export const ShareClientModal: React.FC<ShareClientModalProps> = ({ isOpen, onClose, cliente }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [generated, setGenerated] = useState<{ clientId: string; token: string; pin: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [checking, setChecking] = useState(true);
  const clientId = cliente?.id;
  useEffect(() => {
    if (!isOpen || !clientId) return;
    let active = true;
    setChecking(true);
    setCopyError('');
    void supabase.rpc('obtener_enlace_cliente', { p_client_id: clientId }).then(({ data, error }) => {
      if (!active) return;
      if (error) setCopyError('No se pudo consultar el enlace vigente.');
      else setGenerated(data?.token && data?.pin ? { ...data, clientId } : null);
      setChecking(false);
    });
    return () => { active = false; };
  }, [isOpen, clientId]);

  if (!isOpen || !cliente) return null;

  const link = generated?.clientId === cliente.id ? generated : null;
  const publicUrl = link ? `${window.location.origin}/cliente/${link.token}` : '';
  const defaultMessage = `Hola *${cliente.nombre}*, consulta tu estado de cuenta en Kaupaloki:
${publicUrl}

Tu PIN de 4 dígitos es *${link?.pin || ''}*. Vence el ${formatDate(link?.expiresAt)}.`;

  const generateLink = async () => {
    setGenerating(true);
    setCopyError('');
    const finishSound = prepareSuccessSound();
    try {
      const { data, error } = await supabase.rpc('crear_enlace_cliente', { p_client_id: cliente.id });
      if (error || !data?.token || !data?.pin) throw error;
      setGenerated({ clientId: cliente.id, token: data.token, pin: data.pin, expiresAt: data.expiresAt });
      finishSound(true);
    } catch {
      setCopyError('No se pudo generar el enlace seguro.');
    } finally {
      finishSound(false);
      setGenerating(false);
    }
  };

  const copy = async (text: string, setCopied: (value: boolean) => void) => {
    setCopyError('');
    const finishSound = prepareSuccessSound();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      finishSound(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('No se pudo copiar al portapapeles.');
    } finally {
      finishSound(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMessage)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 relative max-sm:fixed max-sm:inset-0 max-sm:m-0 max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-bold">
              <i className="ri-share-forward-line" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Compartir Portal Privado</h3>
              <p className="text-xs text-muted-foreground">{cliente.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>

        <div className="space-y-4">
          {copyError && <p role="alert" className="text-sm text-destructive">{copyError}</p>}
          {!link ? (
            <button type="button" disabled={checking || generating} onClick={generateLink} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {checking ? 'Buscando enlace vigente…' : generating ? 'Generando…' : 'Generar enlace y PIN'}
            </button>
          ) : <>
            {/* Client Code Highlight */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Código de Acceso (PIN)
                </span>
                <span className="text-base font-black font-mono text-foreground mt-0.5 block">
                  {link.pin}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                {cliente.pais || 'COL'}
              </span>
            </div>

            {/* Enlace Público */}
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Enlace de Consulta
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background font-mono text-xs text-muted-foreground outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => void copy(publicUrl, setCopiedLink)}
                  className="px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <i className={copiedLink ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Mensaje Predeterminado para WhatsApp */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Mensaje Predeterminado (WhatsApp)
                </label>
                <button
                  type="button"
              onClick={() => void copy(defaultMessage, setCopiedMessage)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <i className={copiedMessage ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
                  <span>{copiedMessage ? 'Copiado' : 'Copiar texto'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={defaultMessage}
                className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground leading-relaxed outline-none select-all resize-none"
              />
            </div>

            {/* WhatsApp Direct Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <i className="ri-whatsapp-line text-base" />
                <span>Enviar por WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-border hover:bg-muted text-muted-foreground text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
};
