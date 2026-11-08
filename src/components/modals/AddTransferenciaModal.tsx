import React, { useState } from 'react';
import { useData, type TransferenciaInterna } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatNumber, formatCOP } from '../../utils/formatters';
import { formatAmountField, formatAmountInput, parseAmountInput } from '../../utils/amountInput';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import { RecordActions, RecordDialog, recordButtonClass, recordFieldClass, recordLabelClass } from './RecordDialog';

interface AddTransferenciaModalProps {
  edit?: TransferenciaInterna;
  trigger?: React.ReactNode;
}

export const AddTransferenciaModal: React.FC<AddTransferenciaModalProps> = ({ edit, trigger }) => {
  const { data, createTransferenciaInterna, updateTransferenciaInterna, deleteTransferenciaInterna } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [fecha, setFecha] = useState(edit?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [tipoActivo, setTipoActivo] = useState<'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL'>(
    edit?.tipoOrigen || 'ACTIVO_LIQUIDO'
  );
  const [origenId, setOrigenId] = useState(edit?.origenId || '');
  const [destinoId, setDestinoId] = useState(edit?.destinoId || '');
  
  const [monto, setMonto] = useState(edit ? formatAmountInput(String(edit.monto)) : '');
  const [costo, setCosto] = useState(edit?.costo ? formatAmountInput(String(edit.costo)) : '0');
  const [concepto, setConcepto] = useState(edit?.concepto || '');
  const [notas, setNotas] = useState(edit?.notas || '');

  // Accounts list based on selected asset type
  const isDigital = tipoActivo === 'ACTIVO_DIGITAL';
  const accounts = isDigital ? (data.activosDigitales || []) : (data.activosLiquidos || []);
  const currency = isDigital ? 'USDT' : 'COP';

  const selectedSource = accounts.find((a: any) => a.id === origenId) || accounts[0];
  const selectedDest = accounts.find((a: any) => a.id === destinoId) || (accounts.length > 1 ? accounts[1] : accounts[0]);

  const currentSourceBalance = isDigital
    ? Number(selectedSource?.saldoUsdt || 0)
    : Number(selectedSource?.saldoCop || 0);

  const currentDestBalance = isDigital
    ? Number(selectedDest?.saldoUsdt || 0)
    : Number(selectedDest?.saldoCop || 0);

  const numericMonto = parseAmountInput(monto);
  const numericCosto = parseAmountInput(costo);
  const totalDebit = numericMonto + (numericCosto > 0 ? numericCosto : 0);
  const availableCredit = currentSourceBalance + (edit && edit.origenId === origenId ? Number(edit.monto) + Number(edit.costo || 0) : 0);
  const exceedsBalance = numericMonto > 0 && totalDebit > availableCredit;
  const isSameAccount = origenId && destinoId && origenId === destinoId;

  const openModal = () => {
    setError('');
    const initTipo = edit?.tipoOrigen || 'ACTIVO_LIQUIDO';
    setTipoActivo(initTipo);

    const targetAccounts = initTipo === 'ACTIVO_DIGITAL' ? (data.activosDigitales || []) : (data.activosLiquidos || []);
    const defaultSrc = edit?.origenId || targetAccounts[0]?.id || '';
    const defaultDst = edit?.destinoId || (targetAccounts.length > 1 ? targetAccounts[1]?.id : targetAccounts[0]?.id) || '';

    setOrigenId(defaultSrc);
    setDestinoId(defaultDst);
    setMonto(edit ? formatAmountInput(String(edit.monto)) : '');
    setCosto(edit?.costo ? formatAmountInput(String(edit.costo)) : '0');
    setConcepto(edit?.concepto || '');
    setNotas(edit?.notas || '');
    setFecha(edit?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setOpen(true);
  };

  const handleTipoChange = (type: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL') => {
    setTipoActivo(type);
    const targetAccounts = type === 'ACTIVO_DIGITAL' ? (data.activosDigitales || []) : (data.activosLiquidos || []);
    setOrigenId(targetAccounts[0]?.id || '');
    setDestinoId(targetAccounts.length > 1 ? targetAccounts[1]?.id || '' : targetAccounts[0]?.id || '');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!origenId) {
      setError(isDigital ? 'Selecciona la billetera de origen.' : 'Selecciona la cuenta de origen.');
      return;
    }
    if (!destinoId) {
      setError(isDigital ? 'Selecciona la billetera de destino.' : 'Selecciona la cuenta de destino.');
      return;
    }
    if (isSameAccount) {
      setError('El origen y el destino deben ser diferentes.');
      return;
    }
    if (numericMonto <= 0) {
      setError('Ingresa un monto válido a transferir.');
      return;
    }
    if (exceedsBalance) {
      setError(`El monto a transferir (${formatNumber(totalDebit, 2, 2)} ${currency} con costo) supera el saldo disponible (${formatNumber(availableCredit, 2, 2)} ${currency}).`);
      return;
    }

    const sourceName = selectedSource?.activo || selectedSource?.institucion || 'Origen';
    const destName = selectedDest?.activo || selectedDest?.institucion || 'Destino';

    setBusy(true);
    setError('');
    const finishSound = prepareSuccessSound();

    try {
      const payload = {
        fecha,
        tipoOrigen: tipoActivo,
        origenId,
        origenNombre: sourceName,
        tipoDestino: tipoActivo, // STRICTLY SAME TYPE
        destinoId,
        destinoNombre: destName,
        monto: numericMonto,
        divisaOrigen: currency,
        montoDestino: numericMonto, // 1:1 same asset type
        divisaDestino: currency,
        tasa: 1,
        costo: numericCosto >= 0 ? numericCosto : 0,
        divisaCosto: currency,
        concepto: concepto.trim() || `Transferencia de ${sourceName} a ${destName}`,
        notas: notas.trim() || undefined,
      };

      if (edit) {
        await updateTransferenciaInterna(edit.id, payload);
      } else {
        await createTransferenciaInterna(payload);
      }

      finishSound(true);
      setOpen(false);
    } catch (err: any) {
      finishSound(false);
      setError(err instanceof Error ? err.message : 'No se pudo guardar la transferencia.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!edit || !window.confirm('¿Estás seguro de que deseas eliminar esta transferencia interna? Los saldos se revertirán automáticamente.')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await deleteTransferenciaInterna(edit.id);
      setOpen(false);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la transferencia.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={openModal}>{trigger}</span>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className={edit ? 'inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted' : recordButtonClass}
        >
          <i className={edit ? 'ri-edit-line' : 'ri-arrow-left-right-line'} aria-hidden="true" />
          <span>{edit ? 'Editar' : 'Nueva Transferencia'}</span>
        </button>
      )}

      {open && (
        <RecordDialog
          title={edit ? 'Editar Transferencia Interna' : 'Registrar Transferencia Interna'}
          description="Movimiento entre cuentas bancarias de la misma empresa o entre billeteras USDT."
          icon="ri-arrow-left-right-line"
          wide
          busy={busy}
          error={error}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={busy} className="min-w-0 space-y-6">
              
              {/* TIPO DE TRANSFERENCIA: LÍQUIDO O DIGITAL */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Tipo de Activo a Transferir
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('ACTIVO_LIQUIDO')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      tipoActivo === 'ACTIVO_LIQUIDO'
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${tipoActivo === 'ACTIVO_LIQUIDO' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <i className="ri-bank-line text-lg" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-foreground block">Entre Activos Líquidos</span>
                      <span className="text-[11px] text-muted-foreground">Cuentas bancarias y caja (COP)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('ACTIVO_DIGITAL')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      tipoActivo === 'ACTIVO_DIGITAL'
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${tipoActivo === 'ACTIVO_DIGITAL' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <i className="ri-wallet-3-line text-lg" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-foreground block">Entre Activos Digitales</span>
                      <span className="text-[11px] text-muted-foreground">Billeteras y exchanges (USDT)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* CUENTA ORIGEN Y CUENTA DESTINO */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* ORIGEN */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <i className="ri-upload-2-line text-rose-500" />
                      <span>{isDigital ? 'Billetera Origen (Salida)' : 'Cuenta Origen (Salida)'}</span>
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {currency}
                    </span>
                  </div>

                  <label className={recordLabelClass}>
                    <span>Seleccionar {isDigital ? 'Billetera' : 'Cuenta'}</span>
                    <select
                      value={origenId}
                      onChange={(e) => setOrigenId(e.target.value)}
                      className={recordFieldClass}
                      required
                    >
                      {accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.activo} {a.institucion ? `(${a.institucion})` : ''} · Saldo: {isDigital ? `${formatNumber(a.saldoUsdt || 0, 2, 2)} USDT` : formatCOP(a.saldoCop || 0)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground block text-[11px]">Saldo disponible actual:</span>
                    <span className="text-sm sm:text-base font-extrabold font-mono text-foreground">
                      {isDigital ? `${formatNumber(currentSourceBalance, 2, 6)} USDT` : formatCOP(currentSourceBalance)}
                    </span>
                  </div>
                </div>

                {/* DESTINO */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <i className="ri-download-2-line text-emerald-500" />
                      <span>{isDigital ? 'Billetera Destino (Entrada)' : 'Cuenta Destino (Entrada)'}</span>
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {currency}
                    </span>
                  </div>

                  <label className={recordLabelClass}>
                    <span>Seleccionar {isDigital ? 'Billetera' : 'Cuenta'}</span>
                    <select
                      value={destinoId}
                      onChange={(e) => setDestinoId(e.target.value)}
                      className={recordFieldClass}
                      required
                    >
                      {accounts.map((a: any) => (
                        <option key={a.id} value={a.id} disabled={a.id === origenId}>
                          {a.activo} {a.institucion ? `(${a.institucion})` : ''} {a.id === origenId ? '(Misma que origen)' : `· Saldo: ${isDigital ? `${formatNumber(a.saldoUsdt || 0, 2, 2)} USDT` : formatCOP(a.saldoCop || 0)}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs">
                    <span className="text-muted-foreground block text-[11px]">Saldo actual en destino:</span>
                    <span className="text-sm sm:text-base font-extrabold font-mono text-foreground">
                      {isDigital ? `${formatNumber(currentDestBalance, 2, 6)} USDT` : formatCOP(currentDestBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {isSameAccount && (
                <p role="alert" className="text-xs text-destructive font-semibold">
                  El origen y el destino no pueden ser la misma cuenta.
                </p>
              )}

              {/* MONTOS Y COSTO */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={recordLabelClass}>
                    <span>Monto a transferir <small className="text-muted-foreground">({currency})</small></span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monto}
                      onChange={(e) => {
                        const val = formatAmountField(e.currentTarget);
                        if (val !== undefined) setMonto(val);
                      }}
                      placeholder={isDigital ? '0.00' : '0'}
                      required
                      className={recordFieldClass}
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Disponible: {isDigital ? `${formatNumber(currentSourceBalance, 2, 2)} USDT` : formatCOP(currentSourceBalance)}</span>
                    {currentSourceBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setMonto(formatNumber(currentSourceBalance, 0, 20))}
                        className="rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary hover:bg-primary/20"
                      >
                        Máx.
                      </button>
                    )}
                  </div>
                  {exceedsBalance && (
                    <p role="alert" className="text-xs text-destructive">
                      El monto a transferir (incluyendo costo) supera el saldo disponible.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className={recordLabelClass}>
                    <span>Costo / Comisión de la operación <small className="text-muted-foreground">({currency})</small></span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costo}
                      onChange={(e) => {
                        const val = formatAmountField(e.currentTarget);
                        if (val !== undefined) setCosto(val);
                      }}
                      placeholder="0.00"
                      className={recordFieldClass}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {isDigital ? 'Fee de red (ej: 1 USDT). Se debita del origen.' : 'Fee bancario (0 si exento). Se debita del origen.'}
                  </span>
                </div>
              </div>

              {/* FECHA Y CONCEPTO */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={recordLabelClass}>
                    <span>Fecha de la operación</span>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      className={recordFieldClass}
                    />
                  </label>
                </div>

                <div>
                  <label className={recordLabelClass}>
                    <span>Concepto de la operación</span>
                    <input
                      type="text"
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      placeholder={isDigital ? 'Ej: Rebalanceo Binance a Kraken' : 'Ej: Transferencia Bancolombia a Nequi'}
                      required
                      className={recordFieldClass}
                    />
                  </label>
                </div>
              </div>
            </fieldset>

            <RecordActions
              submitDisabled={Boolean(isSameAccount) || Boolean(exceedsBalance) || numericMonto <= 0}
              busy={busy}
              label={edit ? 'Guardar cambios' : 'Registrar transferencia'}
              onClose={() => setOpen(false)}
              onDelete={edit && isAdmin ? handleDelete : undefined}
              deleteLabel="Eliminar transferencia"
            />
          </form>
        </RecordDialog>
      )}
    </>
  );
};
