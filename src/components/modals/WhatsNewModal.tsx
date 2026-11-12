import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export interface AppVersionChange {
  category: 'Novedad' | 'Mejora' | 'Seguridad' | 'Corrección' | string;
  title: string;
  description: string;
}

export interface AppVersion {
  id: string;
  version: string;
  version_code: number;
  title: string;
  summary: string;
  changes: AppVersionChange[];
  is_published: boolean;
  released_at: string;
}

interface WhatsNewModalProps {
  /** Callback opcional cuando el modal se abre o cierra */
  onVisibilityChange?: (isOpen: boolean) => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onVisibilityChange }) => {
  const { user } = useAuth();
  const [pendingVersions, setPendingVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Mantener la referencia a onVisibilityChange sin re-disparar el fetch
  const onVisibilityChangeRef = useRef(onVisibilityChange);
  useEffect(() => {
    onVisibilityChangeRef.current = onVisibilityChange;
  }, [onVisibilityChange]);

  // Consulta novedades pendientes no confirmadas por la cuenta actual
  const fetchPendingVersions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_versions_for_current_user');
      if (error) {
        console.warn('[WhatsNewModal] Error consultando versiones pendientes:', error);
        return;
      }
      if (data && Array.isArray(data) && data.length > 0) {
        // Ordenar de más reciente a más antigua para lectura natural
        const sorted = [...data].sort((a, b) => b.version_code - a.version_code);
        setPendingVersions(sorted);
        setIsOpen(true);
        onVisibilityChangeRef.current?.(true);
      } else {
        setPendingVersions([]);
        setIsOpen(false);
        onVisibilityChangeRef.current?.(false);
      }
    } catch (err) {
      console.warn('[WhatsNewModal] Excepción consultando versiones:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Al montar o cambiar de usuario, buscar versiones pendientes
  useEffect(() => {
    fetchPendingVersions();
  }, [fetchPendingVersions]);

  // Escuchar en tiempo real inserciones o actualizaciones en app_versions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_app_versions_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_versions',
        },
        () => {
          // Nueva versión publicada o modificada: comprobar sin recargar la página
          fetchPendingVersions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPendingVersions]);

  // Bloqueo estricto del teclado (no permite cerrar con Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  // Confirmar todas las versiones pendientes en un único clic
  const handleConfirm = async () => {
    if (!user || pendingVersions.length === 0) return;
    setConfirming(true);
    try {
      const versionIds = pendingVersions.map((v) => v.id);
      const { error } = await supabase.rpc('confirm_versions', {
        p_version_ids: versionIds,
      });
      if (error) throw error;

      setPendingVersions([]);
      setIsOpen(false);
      onVisibilityChangeRef.current?.(false);
    } catch (err) {
      console.error('[WhatsNewModal] Error confirmando versiones:', err);
      // Cerrar localmente para no bloquear al usuario si hubo un micro-error de red
      setIsOpen(false);
      onVisibilityChangeRef.current?.(false);
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen || pendingVersions.length === 0) {
    return null;
  }

  const badgeCategoryClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'novedad':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'mejora':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'seguridad':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
      case 'corrección':
      case 'correccion':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const isAccumulated = pendingVersions.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header Bloqueante (Sin botón 'X') */}
        <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-r from-primary/10 via-card to-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-md shadow-primary/30 flex-shrink-0">
            <i className="ri-sparkling-fill" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-primary/20 text-primary border border-primary/30">
                {isAccumulated ? `${pendingVersions.length} Actualizaciones Acumuladas` : 'Nueva Actualización'}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {pendingVersions[0]?.version}
              </span>
            </div>
            <h2 id="whats-new-title" className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
              {isAccumulated
                ? 'Novedades y Mejoras del Sistema'
                : pendingVersions[0]?.title}
            </h2>
          </div>
        </div>

        {/* Cuerpo con Scroll para las Versiones Agrupadas */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {pendingVersions.map((ver, idx) => (
            <div
              key={ver.id}
              className={`space-y-3 ${idx > 0 ? 'pt-6 border-t border-border/80' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-muted text-foreground border border-border">
                    {ver.version}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{ver.title}</h3>
                </div>
                {ver.released_at && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {new Date(ver.released_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {ver.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/60">
                  {ver.summary}
                </p>
              )}

              {/* Lista de cambios */}
              {Array.isArray(ver.changes) && ver.changes.length > 0 && (
                <div className="space-y-2 pt-1">
                  {ver.changes.map((item, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors flex items-start gap-2.5"
                    >
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 mt-0.5 ${badgeCategoryClass(
                          item.category
                        )}`}
                      >
                        {item.category || 'Novedad'}
                      </span>
                      <div className="text-xs min-w-0">
                        <span className="font-semibold text-foreground mr-1.5">{item.title}:</span>
                        <span className="text-muted-foreground leading-relaxed">{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Bloqueante: Único Botón «Entendido» */}
        <div className="p-4 sm:p-5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 text-center sm:text-left">
            <i className="ri-information-line text-primary" />
            <span>Pulsa «Entendido» para confirmar la lectura en tu cuenta y continuar.</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <i className="ri-loader-4-line animate-spin text-sm" />
                <span>Confirmando...</span>
              </>
            ) : (
              <>
                <i className="ri-check-line text-base" />
                <span>Entendido</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
