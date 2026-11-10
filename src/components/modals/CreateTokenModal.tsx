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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <i className="ri-ticket-2-line text-primary text-lg" />
            Crear Token de Retiro
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Informational Callout */}
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex gap-3 text-primary text-xs">
            <i className="ri-information-line text-base text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-primary">Aviso Operativo:</strong> Crear tokens no afecta
              el saldo de tus activos líquidos ni balances contables. Es un vale de autorización física
              exclusivo para quien entrega el efectivo en caja.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <i className="ri-error-warning-line text-base shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Divisa y Monto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Divisa
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 h-11 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                {currencyOptions.map((curr) => (
                  <option key={curr} value={curr} className="bg-background text-foreground">
                    {curr}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Monto a Autorizar
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
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
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-4 h-11 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Referencia o Destinatario */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Referencia / Beneficiario (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Pago proveedor, Retiro cliente Carlos..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 h-11 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Vigencia / Expiración */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Vigencia del Token
            </label>
            <select
              value={validityHours}
              onChange={(e) => setValidityHours(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 h-11 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="12" className="bg-background text-foreground">12 Horas</option>
              <option value="24" className="bg-background text-foreground">24 Horas (1 Día)</option>
              <option value="48" className="bg-background text-foreground">48 Horas (2 Días - Recomendado)</option>
              <option value="72" className="bg-background text-foreground">72 Horas (3 Días)</option>
              <option value="168" className="bg-background text-foreground">7 Días</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
