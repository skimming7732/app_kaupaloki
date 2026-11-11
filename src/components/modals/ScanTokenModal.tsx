import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';
import { CashToken, formatCurrencyAmount, getTokenState } from '../../utils/tokenVoucherGenerator';

interface ScanTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenRedeemed: (token: CashToken) => void;
  onViewVoucher: (token: CashToken) => void;
}

export const ScanTokenModal: React.FC<ScanTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenRedeemed,
  onViewVoucher,
}) => {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundToken, setFoundToken] = useState<CashToken | null>(null);

  // Video scanning refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera on modal open + 'camera' tab
  useEffect(() => {
    if (!isOpen || tab !== 'camera' || foundToken) {
      stopCamera();
      return;
    }

    let isCancelled = false;

    const startCamera = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          scanFrame();
        }
      } catch (err: any) {
        console.error('Error accediendo a cámara:', err);
        setError('No se pudo acceder a la cámara. Puedes subir la imagen o digitar el código.');
      }
    };

    const scanFrame = () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (qrCode && qrCode.data) {
          stopCamera();
          lookupTokenCode(qrCode.data.trim());
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, tab, foundToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Lookup token in Supabase
  const lookupTokenCode = async (rawCode: string) => {
    const cleaned = rawCode.trim().toUpperCase();
    if (!cleaned) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('cash_tokens')
        .select('*')
        .or(`token_code.eq.${cleaned},codigo.eq.${cleaned}`)
        .single();

      if (fetchErr || !data) {
        setError(`No se encontró ningún token con el código "${cleaned}".`);
        setFoundToken(null);
      } else {
        setFoundToken(data as CashToken);
      }
    } catch (err: any) {
      console.error('Error buscando token:', err);
      setError(err.message || 'Error buscando el token.');
    } finally {
      setLoading(false);
    }
  };

  // Decode uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('No se pudo procesar la imagen.');
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        if (qrCode && qrCode.data) {
          lookupTokenCode(qrCode.data);
        } else {
          setError('No se detectó ningún código QR válido en la imagen seleccionada.');
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Redeem token
  const handleRedeem = async () => {
    if (!foundToken) return;

    setRedeeming(true);
    setError(null);

    try {
      const { data, error: updateErr } = await supabase
        .from('cash_tokens')
        .update({
          estado: 'entregado',
          status: 'entregado',
          redeemed_at: new Date().toISOString(),
          redeemed_by: user?.id || null,
          redeemed_by_name: profile?.full_name || user?.email || 'Cajero',
        })
        .eq('id', foundToken.id)
        .eq('estado', 'activo')
        .gt('expires_at', new Date().toISOString())
        .select()
        .single();

      if (updateErr) throw new Error(updateErr.message);

      const updated = data as CashToken;
      setFoundToken(updated);
      onTokenRedeemed(updated);
    } catch (err: any) {
      console.error('Error redimiendo token:', err);
      setError(err.message || 'No se pudo redimir el token');
    } finally {
      setRedeeming(false);
    }
  };

  if (!isOpen) return null;

  const state = foundToken ? getTokenState(foundToken) : null;
  const isExpired = state === 'expirado';
  const isRedeemed = state === 'entregado';
  const isCancelled = state === 'cancelado';
  const canRedeem = state === 'activo';

  return (
    <RecordDialog
      title="Validar token"
      description="Escanea el QR, sube una imagen o ingresa el código del vale."
      icon="ri-qr-scan-2-line"
      error={error}
      busy={redeeming}
      onClose={() => {
        stopCamera();
        onClose();
      }}
    >
        {/* Tabs (only if no token selected yet) */}
        {!foundToken && (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1">
            <button
              onClick={() => {
                setError(null);
                setTab('camera');
              }}
              className={`flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold transition-colors ${
                tab === 'camera'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <i className="ri-camera-line text-base" />
              Cámara
            </button>
            <button
              onClick={() => {
                stopCamera();
                setError(null);
                setTab('upload');
              }}
              className={`flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold transition-colors ${
                tab === 'upload'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <i className="ri-image-line text-base" />
              Imagen
            </button>
            <button
              onClick={() => {
                stopCamera();
                setError(null);
                setTab('manual');
              }}
              className={`flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold transition-colors ${
                tab === 'manual'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <i className="ri-keyboard-line text-base" />
              Manual
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="mt-4 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary" />
              <span className="text-sm">Buscando token en el sistema...</span>
            </div>
          )}

          {/* Token Details View when found */}
          {foundToken && !loading && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Status Header */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isRedeemed
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isCancelled
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : isExpired
                    ? 'bg-slate-500/10 border-slate-500/30'
                    : 'bg-primary/10 border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      isRedeemed
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : isCancelled
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : isExpired
                        ? 'bg-slate-500/20 text-muted-foreground'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    <i
                      className={
                        isRedeemed
                          ? 'ri-checkbox-circle-fill'
                          : isCancelled
                          ? 'ri-close-circle-fill'
                          : isExpired
                          ? 'ri-time-line'
                          : 'ri-check-line'
                      }
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">
                      {isRedeemed
                        ? 'Token Ya Entregado'
                        : isCancelled
                        ? 'Token Cancelado'
                        : isExpired
                        ? 'Token Expirado'
                        : 'Token Válido para Entrega'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {foundToken.codigo || 'TK'} • Código: {foundToken.token_code}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isRedeemed
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : isCancelled
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : isExpired
                      ? 'bg-muted text-foreground'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {isRedeemed ? 'Entregado' : isCancelled ? 'Cancelado' : isExpired ? 'Expirado' : 'Activo'}
                </span>
              </div>

              {/* Amount Display */}
              <div className="p-5 rounded-xl bg-muted/30 border border-border text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-widest block font-medium mb-1">
                  Monto a Entregar
                </span>
                <span className="text-3xl font-black text-foreground">
                  {foundToken.divisa} ${formatCurrencyAmount(foundToken.monto, foundToken.divisa)}
                </span>
                {foundToken.referencia && (
                  <p className="text-xs text-foreground mt-2 font-medium">
                    Beneficiario / Ref: {foundToken.referencia}
                  </p>
                )}
              </div>

              {/* Audit Details */}
              <div className="space-y-2 text-xs bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Creado por:</span>
                  <span className="text-foreground font-medium">
                    {foundToken.created_by_name || 'Administrador'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Fecha de Creación:</span>
                  <span className="text-foreground">
                    {new Date(foundToken.created_at).toLocaleString('es-CO')}
                  </span>
                </div>
                {foundToken.redeemed_at && (
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-emerald-600 dark:text-emerald-400">Entregado el:</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      {new Date(foundToken.redeemed_at).toLocaleString('es-CO')}{' '}
                      {foundToken.redeemed_by_name ? `por ${foundToken.redeemed_by_name}` : ''}
                    </span>
                  </div>
                )}
                {foundToken.expires_at && !foundToken.redeemed_at && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Válido hasta:</span>
                    <span className="text-foreground">
                      {new Date(foundToken.expires_at).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFoundToken(null);
                    setError(null);
                  }}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted"
                >
                  <i className="ri-arrow-left-line mr-1" />
                  Escanear Otro
                </button>

                <button
                  type="button"
                  onClick={() => onViewVoucher(foundToken)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-primary hover:bg-muted"
                >
                  <i className="ri-image-line" />
                  Ver Vale
                </button>

                {canRedeem && (
                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className={recordButtonClass + ' col-span-2'}
                  >
                    {redeeming ? (
                      <>
                        <i className="ri-loader-4-line animate-spin text-base" />
                        <span>Entregando...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-checkbox-circle-line text-base" />
                        <span>Entregar Efectivo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 1: Camera Scanner */}
          {!foundToken && !loading && tab === 'camera' && (
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square max-w-[280px] bg-black rounded-2xl overflow-hidden border border-border relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Target overlay guide */}
                <div className="absolute inset-8 border-2 border-primary/80 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                  <div className="w-12 h-0.5 bg-primary/60" />
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-3 text-center">
                Apunta tu cámara directamente al código QR del vale de retiro.
              </p>
            </div>
          )}

          {/* Tab 2: Upload Image */}
          {!foundToken && !loading && tab === 'upload' && (
            <div className="py-6 flex flex-col items-center justify-center">
              <label className="w-full max-w-sm aspect-[4/3] border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <i className="ri-upload-cloud-line text-2xl" />
                </div>
                <span className="text-foreground font-bold text-sm mb-1">Subir Imagen del Vale</span>
                <span className="text-muted-foreground text-xs">PNG, JPG o captura de pantalla</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Tab 3: Manual Input */}
          {!foundToken && !loading && tab === 'manual' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupTokenCode(manualCode);
              }}
              className="py-4 space-y-4"
            >
              <div>
                <label htmlFor="token-validation-code" className={recordLabelClass}>
                  Código del token o número de vale
                </label>
                <input
                  id="token-validation-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ej. TK8H3K9A ó TK0001"
                  className={recordFieldClass + ' text-center font-mono font-bold uppercase tracking-widest'}
                />
              </div>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className={recordButtonClass + ' w-full'}
              >
                <i className="ri-search-line text-base" />
                Verificar Token
              </button>
            </form>
          )}
        </div>
    </RecordDialog>
  );
};
