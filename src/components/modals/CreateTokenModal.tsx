import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatAmountField, parseAmountInput } from '../../utils/amountInput';
import { RecordActions, RecordDialog, recordFieldClass, recordLabelClass } from './RecordDialog';
import type { CashToken } from '../../utils/tokenVoucherGenerator';

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
    const numAmount = parseAmountInput(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
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
          referencia: reference.trim().toUpperCase() || null,
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
    <RecordDialog
      title="Crear token de retiro"
      description="Genera un vale para autorizar una entrega de efectivo en caja."
      icon="ri-ticket-2-line"
      busy={loading}
      error={error}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[minmax(5rem,1fr)_minmax(0,2fr)] items-end gap-3">
          <label className={recordLabelClass}>
            <span>Divisa</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={recordFieldClass}>
              {currencyOptions.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
          </label>
          <label className={recordLabelClass}>
            <span>Monto a autorizar</span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                const formatted = formatAmountField(event.currentTarget);
                if (formatted !== undefined) setAmount(formatted);
              }}
              className={recordFieldClass + ' tabular-nums'}
            />
          </label>
        </div>

        <label className={recordLabelClass}>
          <span>Referencia o beneficiario <span className="text-muted-foreground">(opcional)</span></span>
          <input
            type="text"
            placeholder="Ej. Retiro de Carlos"
            value={reference}
            onChange={(event) => setReference(event.target.value.toUpperCase())}
            className={recordFieldClass}
          />
        </label>

        <label className={recordLabelClass}>
          <span>Vigencia del token</span>
          <select value={validityHours} onChange={(event) => setValidityHours(event.target.value)} className={recordFieldClass}>
            <option value="12">12 horas</option>
            <option value="24">1 día</option>
            <option value="48">2 días</option>
            <option value="72">3 días</option>
            <option value="168">7 días</option>
          </select>
        </label>

        <RecordActions busy={loading} label="Generar token" onClose={onClose} submitDisabled={!amount} />
      </form>
    </RecordDialog>
  );
};
