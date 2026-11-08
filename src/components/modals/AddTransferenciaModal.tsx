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
  const [tipoOrigen, setTipoOrigen] = useState<'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL'>(edit?.tipoOrigen || 'ACTIVO_LIQUIDO');
  const [origenId, setOrigenId] = useState(edit?.origenId || '');
  const [tipoDestino, setTipoDestino] = useState<'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL'>(edit?.tipoDestino || 'ACTIVO_DIGITAL');
  const [destinoId, setDestinoId] = useState(edit?.destinoId || '');
  
  const [monto, setMonto] = useState(edit ? formatAmountInput(String(edit.monto)) : '');
  const [montoDestino, setMontoDestino] = useState(edit ? formatAmountInput(String(edit.montoDestino)) : '');
  const [costo, setCosto] = useState(edit?.costo ? formatAmountInput(String(edit.costo)) : '0');
  const [concepto, setConcepto] = useState(edit?.concepto || '');
  const [notas, setNotas] = useState(edit?.notas || '');

  // Accounts list
  const liquidAccounts = data.activosLiquidos || [];
  const digitalAccounts = data.activosDigitales || [];

  const sourceAccounts = tipoOrigen === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;
  const destAccounts = tipoDestino === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;

  const selectedSource = sourceAccounts.find((a: any) => a.id === origenId) || sourceAccounts[0];
  const selectedDest = destAccounts.find((a: any) => a.id === destinoId) || destAccounts[0];

  const sourceCurrency = tipoOrigen === 'ACTIVO_DIGITAL' ? 'USDT' : (selectedSource?.divisa || 'COP');
  const destCurrency = tipoDestino === 'ACTIVO_DIGITAL' ? 'USDT' : (selectedDest?.divisa || 'COP');
  const isDifferentCurrency = sourceCurrency !== destCurrency;

  const currentSourceBalance = tipoOrigen === 'ACTIVO_DIGITAL'
    ? Number(selectedSource?.saldoUsdt || 0)
    : Number(selectedSource?.saldoCop || 0);

  const numericMonto = parseAmountInput(monto);
  const numericCosto = parseAmountInput(costo);
  const totalDebit = numericMonto + (numericCosto > 0 ? numericCosto : 0);
  const exceedsBalance = numericMonto > 0 && totalDebit > currentSourceBalance + (edit && edit.origenId === origenId ? Number(edit.monto) + Number(edit.costo || 0) : 0);
  const isSameAccount = tipoOrigen === tipoDestino && origenId === destinoId;

  const openModal = () => {
    setError('');
    const initTipoOrigen = edit?.tipoOrigen || 'ACTIVO_LIQUIDO';
    const initTipoDestino = edit?.tipoDestino || 'ACTIVO_DIGITAL';
    setTipoOrigen(initTipoOrigen);
    setTipoDestino(initTipoDestino);

    const initSourceAccs = initTipoOrigen === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;
    const initDestAccs = initTipoDestino === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;

    setOrigenId(edit?.origenId || initSourceAccs[0]?.id || '');
    setDestinoId(edit?.destinoId || initDestAccs[0]?.id || '');
    setMonto(edit ? formatAmountInput(String(edit.monto)) : '');
    setMontoDestino(edit ? formatAmountInput(String(edit.montoDestino)) : '');
    setCosto(edit?.costo ? formatAmountInput(String(edit.costo)) : '0');
    setConcepto(edit?.concepto || '');
    setNotas(edit?.notas || '');
    setFecha(edit?.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setOpen(true);
  };

  const handleSourceTypeChange = (type: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL') => {
    setTipoOrigen(type);
    const accounts = type === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;
    setOrigenId(accounts[0]?.id || '');
  };

  const handleDestTypeChange = (type: 'ACTIVO_LIQUIDO' | 'ACTIVO_DIGITAL') => {
    setTipoDestino(type);
    const accounts = type === 'ACTIVO_LIQUIDO' ? liquidAccounts : digitalAccounts;
    setDestinoId(accounts[0]?.id || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (!origenId) {
      setError('Selecciona la cuenta o billetera de origen.');
      return;
    }
    if (!destinoId) {
      setError('Selecciona la cuenta o billetera de destino.');
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
      setError('El monto a transferir (incluyendo costo) supera el saldo disponible del origen.');
      return;
    }

    const finalMontoDestino = isDifferentCurrency
      ? parseAmountInput(montoDestino)
      : numericMonto;

    if (isDifferentCurrency && (!finalMontoDestino || finalMontoDestino <= 0)) {
      setError('Ingresa el monto a recibir en la divisa de destino.');
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
        tipoOrigen,
        origenId,
        origenNombre: sourceName,
        tipoDestino,
        destinoId,
        destinoNombre: destName,
        monto: numericMonto,
        divisaOrigen: sourceCurrency,
        montoDestino: finalMontoDestino,
        divisaDestino: destCurrency,
        tasa: isDifferentCurrency && numericMonto > 0 ? Number((finalMontoDestino / numericMonto).toFixed(6)) : 1,
        costo: numericCosto >= 0 ? numericCosto : 0,
        divisaCosto: sourceCurrency,
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
    if (!edit || !window.confirm('¿Estás seguro de que deseas eliminar esta transferencia interna? Los saldos se revertirán.')) {
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
          description="Movimiento entre cuentas bancarias, caja o billeteras digitales."
          icon="ri-arrow-left-right-line"
          wide
          busy={busy}
          error={error}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={busy} className="min-w-0 space-y-6">
              {/* SECCIÓN ORIGEN */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <i className="ri-upload-2-line text-rose-500" />
                    <span>Origen de Fondos (Salida)</span>
                  </h4>
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => handleSourceTypeChange('ACTIVO_LIQUIDO')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        tipoOrigen === 'ACTIVO_LIQUIDO'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activo Líquido (Banco/Caja)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSourceTypeChange('ACTIVO_DIGITAL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        tipoOrigen === 'ACTIVO_DIGITAL'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activo Digital (Wallet USDT)
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 items-center">
                  <div>
                    <label className={recordLabelClass}>
                      <span>Seleccionar Cuenta / Billetera de Origen</span>
                      <select
                        value={origenId}
                        onChange={(e) => setOrigenId(e.target.value)}
                        className={recordFieldClass}
                        required
                      >
                        {sourceAccounts.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.activo} {a.institucion ? `(${a.institucion})` : ''} · Saldo: {tipoOrigen === 'ACTIVO_DIGITAL' ? `${formatNumber(a.saldoUsdt || 0, 2, 2)} USDT` : formatCOP(a.saldoCop || 0)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                    <span className="text-muted-foreground block text-[11px]">Saldo disponible actual:</span>
                    <span className="text-base font-extrabold font-mono text-foreground">
                      {tipoOrigen === 'ACTIVO_DIGITAL'
                        ? `${formatNumber(currentSourceBalance, 2, 6)} USDT`
                        : formatCOP(currentSourceBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN DESTINO */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <i className="ri-download-2-line text-emerald-500" />
                    <span>Destino de Fondos (Entrada)</span>
                  </h4>
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => handleDestTypeChange('ACTIVO_LIQUIDO')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        tipoDestino === 'ACTIVO_LIQUIDO'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activo Líquido (Banco/Caja)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDestTypeChange('ACTIVO_DIGITAL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        tipoDestino === 'ACTIVO_DIGITAL'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activo Digital (Wallet USDT)
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 items-center">
                  <div>
                    <label className={recordLabelClass}>
                      <span>Seleccionar Cuenta / Billetera de Destino</span>
                      <select
                        value={destinoId}
                        onChange={(e) => setDestinoId(e.target.value)}
                        className={recordFieldClass}
                        required
                      >
                        {destAccounts.map((a: any) => (
                          <option key={a.id} value={a.id} disabled={tipoOrigen === tipoDestino && a.id === origenId}>
                            {a.activo} {a.institucion ? `(${a.institucion})` : ''} {tipoOrigen === tipoDestino && a.id === origenId ? '(Misma que origen)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
                    <span className="text-muted-foreground block text-[11px]">Saldo actual en destino:</span>
                    <span className="text-base font-extrabold font-mono text-foreground">
                      {tipoDestino === 'ACTIVO_DIGITAL'
                        ? `${formatNumber(selectedDest?.saldoUsdt || 0, 2, 6)} USDT`
                        : formatCOP(selectedDest?.saldoCop || 0)}
                    </span>
                  </div>
                </div>
                {isSameAccount && (
                  <p role="alert" className="text-xs text-destructive font-semibold">
                    Selecciona una cuenta de destino diferente al origen.
                  </p>
                )}
              </div>

              {/* SECCIÓN MONTOS Y COSTO */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className={recordLabelClass}>
                    <span>Monto a transferir <small className="text-muted-foreground">({sourceCurrency})</small></span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monto}
                      onChange={(e) => {
                        const val = formatAmountField(e.currentTarget);
                        if (val !== undefined) setMonto(val);
                      }}
                      placeholder="0.00"
                      required
                      className={recordFieldClass}
                    />
                  </label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Disponible: {tipoOrigen === 'ACTIVO_DIGITAL' ? `${formatNumber(currentSourceBalance, 2, 2)} USDT` : formatCOP(currentSourceBalance)}</span>
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
                      El monto (incluyendo costo) supera el saldo disponible.
                    </p>
                  )}
                </div>

                {isDifferentCurrency ? (
                  <div className="space-y-1.5">
                    <label className={recordLabelClass}>
                      <span>Monto a recibir en destino <small className="text-muted-foreground">({destCurrency})</small></span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={montoDestino}
                        onChange={(e) => {
                          const val = formatAmountField(e.currentTarget);
                          if (val !== undefined) setMontoDestino(val);
                        }}
                        placeholder="0.00"
                        required
                        className={recordFieldClass}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Tasa implícita: {numericMonto > 0 && parseAmountInput(montoDestino) > 0
                        ? `${formatNumber(parseAmountInput(montoDestino) / numericMonto, 2, 4)} ${destCurrency}/${sourceCurrency}`
                        : '—'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className={recordLabelClass}>
                      <span>Costo / Comisión de la transferencia <small className="text-muted-foreground">({sourceCurrency})</small></span>
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
                    <span className="text-xs text-muted-foreground">Fee bancario o costo de red (0 si exento)</span>
                  </div>
                )}
              </div>

              {isDifferentCurrency && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className={recordLabelClass}>
                      <span>Costo / Comisión de la transferencia <small className="text-muted-foreground">({sourceCurrency})</small></span>
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
                    <span className="text-xs text-muted-foreground">Fee bancario o costo de red (0 si exento)</span>
                  </div>
                </div>
              )}

              {/* SECCIÓN DETALLES */}
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
                      placeholder="Ej: Fondeo cuenta, Retiro a banco, Rebalanceo..."
                      required
                      className={recordFieldClass}
                    />
                  </label>
                </div>
              </div>
            </fieldset>

            <RecordActions
              submitDisabled={isSameAccount || exceedsBalance || numericMonto <= 0}
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
