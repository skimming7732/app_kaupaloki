import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useId, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ClientCountrySelect } from '../common/ClientCountrySelect';
import { formatAmountField, parseAmountInput } from '../../utils/amountInput';

interface AddClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddClienteModal: React.FC<AddClienteModalProps> = ({ isOpen, onClose }) => {
  const { createCliente } = useData();
  const { profile, user } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('COLOMBIA');
  const [hasSaldoInicial, setHasSaldoInicial] = useState(false);
  const [tipoSaldo, setTipoSaldo] = useState<'a_favor' | 'deuda'>('a_favor');
  const [montoSaldo, setMontoSaldo] = useState('');
  const [conceptoSaldo, setConceptoSaldo] = useState('Saldo inicial');

  const countryId = useId();
  const nameId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);
    setError(null);

    const finishSound = prepareSuccessSound();
    try {
      const currentUserId = profile?.id || user?.id;
      let saldoInicialPayload: { monto: number; concepto?: string } | undefined = undefined;
      if (isSuperAdmin && hasSaldoInicial) {
        const parsed = parseAmountInput(montoSaldo);
        if (Number.isFinite(parsed) && parsed > 0) {
          saldoInicialPayload = {
            monto: tipoSaldo === 'deuda' ? -Math.abs(parsed) : Math.abs(parsed),
            concepto: conceptoSaldo.trim() || 'Saldo inicial',
          };
        }
      }

      const result = await createCliente(nombre.trim(), pais, currentUserId, saldoInicialPayload);
      if (!result?.success) throw new Error('No se pudo guardar el cliente.');
      setNombre('');
      setHasSaldoInicial(false);
      setMontoSaldo('');
      finishSound(true);
      onClose();
    } catch (err: any) {
      finishSound(false);
      setError(err?.message || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <i className="ri-user-add-line text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Nuevo Cliente</h3>
              <p className="text-xs text-muted-foreground">Registrar un nuevo cliente en Kaupaloki</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-sm" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={nameId} className="block text-xs font-semibold text-muted-foreground mb-1">Nombre Completo o Empresa *</label>
            <input
              id={nameId}
              type="text"
              autoCapitalize="characters"
              required
              value={nombre}
              onChange={(e) => setNombre(e.currentTarget.value.toUpperCase())}
              placeholder="Ej: DANIEL RAMÍREZ o INVERSIONES SAS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label htmlFor={countryId} className="block text-xs font-semibold text-muted-foreground mb-1">País</label>
            <ClientCountrySelect
              id={countryId}
              value={pais}
              onChange={setPais}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {isSuperAdmin && (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="toggle-saldo-inicial" className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
                  <i className="ri-scales-3-line text-amber-500" />
                  <span>¿Asignar saldo inicial?</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Super Admin
                  </span>
                </label>
                <input
                  id="toggle-saldo-inicial"
                  type="checkbox"
                  checked={hasSaldoInicial}
                  onChange={(e) => setHasSaldoInicial(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {hasSaldoInicial && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoSaldo('a_favor')}
                      className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                        tipoSaldo === 'a_favor'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      Le debemos (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoSaldo('deuda')}
                      className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                        tipoSaldo === 'deuda'
                          ? 'border-destructive bg-destructive/10 text-destructive font-bold'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      Nos debe (-)
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Monto (COP) *</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={montoSaldo}
                      onChange={(e) => formatAmountField(e, setMontoSaldo)}
                      placeholder="0 COP"
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-mono font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">Concepto</label>
                    <input
                      type="text"
                      value={conceptoSaldo}
                      onChange={(e) => setConceptoSaldo(e.target.value)}
                      placeholder="Saldo inicial"
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}
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
              type="submit"
              disabled={loading || !nombre.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin" />}
              <span>Crear Cliente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
