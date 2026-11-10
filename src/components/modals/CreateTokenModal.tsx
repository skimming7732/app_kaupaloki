import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CashToken } from '../../utils/tokenVoucherGenerator';

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: CashToken) => void;
  availableCurrencies?: Array<{ codigo: string; nombre?: string }>;
}

export const CreateTokenModal: React.FC<CreateTokenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableCurrencies = [],
}) => {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [reference, setReference] = useState('');
  const [validityHours, setValidityHours] = useState('48');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Currencies list fallback if empty
  const defaultCurrencies = ['COP', 'USD', 'USDT', 'EUR'];
  const currencyOptions =
    availableCurrencies.length > 0
      ? availableCurrencies.map((c) => c.codigo)
      : defaultCurrencies;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate expiration date
      const hours = parseInt(validityHours, 10) || 48;
      const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

      // Generate random 8-character token code
      const tokenCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data, error: insertError } = await supabase
        .from('cash_tokens')
        .insert({
          token_code: tokenCode,
          monto: numAmount,
          divisa: currency,
          referencia: reference.trim() || null,
          estado: 'activo',
          status: 'activo',
          expires_at: expiresAt,
          created_by: user?.id || null,
          created_by_name: profile?.full_name || user?.email || 'Administrador',
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Reset form
      setAmount('');
      setReference('');
      setValidityHours('48');
      onSuccess(data as CashToken);
      onClose();
    } catch (err: any) {
      console.error('Error creando token:', err);
      setError(err.message || 'No se pudo crear el token de retiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <i className="ri-ticket-2-line text-sky-400 text-lg" />
            Crear Token de Retiro
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Informational Callout */}
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex gap-3 text-sky-200 text-xs">
            <i className="ri-information-line text-base text-sky-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-sky-300">Aviso Operativo:</strong> Crear tokens no afecta
              el saldo de tus activos líquidos ni balances contables. Es un vale de autorización física
              exclusivo para quien entrega el efectivo en caja.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <i className="ri-error-warning-line text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Divisa y Monto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Divisa
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 h-11 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
              >
                {currencyOptions.map((curr) => (
                  <option key={curr} value={curr} className="bg-slate-900 text-white">
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Monto a Autorizar
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-8 pr-4 h-11 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Referencia o Destinatario */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Referencia / Beneficiario (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Pago proveedor, Retiro cliente Carlos..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 h-11 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          {/* Vigencia / Expiración */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Vigencia del Token
            </label>
            <select
              value={validityHours}
              onChange={(e) => setValidityHours(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 h-11 text-white text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            >
              <option value="12" className="bg-slate-900 text-white">12 Horas</option>
              <option value="24" className="bg-slate-900 text-white">24 Horas (1 Día)</option>
              <option value="48" className="bg-slate-900 text-white">48 Horas (2 Días - Recomendado)</option>
              <option value="72" className="bg-slate-900 text-white">72 Horas (3 Días)</option>
              <option value="168" className="bg-slate-900 text-white">7 Días</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-base" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <i className="ri-check-line text-base" />
                  <span>Generar Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
