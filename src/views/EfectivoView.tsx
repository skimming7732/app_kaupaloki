import { useWriteAccess } from '../utils/useWriteAccess';
import { readAllRows } from '../utils/supabasePagination';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTokenState, type CashToken } from '../utils/tokenVoucherGenerator';
import { TokenVoucherModal } from '../components/modals/TokenVoucherModal';
import { ClientSearchSelect } from '../components/common/ClientSearchSelect';
import { recordButtonClass } from '../components/modals/RecordDialog';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData, type NormalizedData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatCOP, formatDate, compareChronologicalDesc } from '../utils/formatters';
import { AddEfectivoModal, type EfectivoMode } from '../components/modals/AddEfectivoModal';
import { AddGastoModal } from '../components/modals/AddGastoModal';

interface EfectivoViewProps {
  onOpenAddGasto?: () => void;
}

export const EfectivoView: React.FC<EfectivoViewProps> = ({
  onOpenAddGasto,
}) => {
  const canWrite = useWriteAccess('admin');
  const { data, marcarVentaRecibida } = useData();
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';
  const [movementMode, setMovementMode] = useState<EfectivoMode | null>(null);
  const [isAddGastoOpen, setIsAddGastoOpen] = useState(false);
  const [editingMovimiento, setEditingMovimiento] = useState<NormalizedData['efectivo'][number] | null>(null);

  const [params, setParams] = useSearchParams();
  const paymentId = params.get('pago');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [linkedTokens, setLinkedTokens] = useState<CashToken[]>([]);
  const [voucher, setVoucher] = useState<CashToken | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState('');

  const refreshTokens = useCallback(async () => {
    const { data: tokens, error } = await readAllRows(() => supabase.from('cash_tokens').select('*')
      .not('efectivo_id', 'is', null).order('created_at', { ascending: false }).order('id'));
    if (error) {
      setTokenError('No se pudieron consultar los tokens de pago.');
      return;
    }
    setLinkedTokens(tokens as CashToken[]);
    setTokenError((message) => message === 'No se pudieron consultar los tokens de pago.' ? '' : message);
  }, []);

  useEffect(() => {
    void refreshTokens();
    const refresh = () => { void refreshTokens(); };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [refreshTokens]);

  const tokenByPayment = new Map<string, CashToken>();
  for (const token of linkedTokens) {
    if (token.efectivo_id && !tokenByPayment.has(token.efectivo_id)) tokenByPayment.set(token.efectivo_id, token);
  }

  const openNewToken = (token: CashToken) => {
    setLinkedTokens((current) => [token, ...current.filter((item) => item.id !== token.id)]);
    setVoucher(token);
  };

  const replaceToken = async (payment: string) => {
    if (issuingId) return;
    setIssuingId(payment);
    setTokenError('');
    try {
      const { data: token, error } = await supabase.rpc('emitir_token_pago_efectivo', { p_pago_id: payment });
      if (error) throw error;
      openNewToken(token as CashToken);
    } catch (error) {
      setTokenError('No se pudo emitir el reemplazo. Inténtalo de nuevo.');
      console.error(error);
    } finally {
      setIssuingId(null);
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Start with the Caja extract so its imported and linked movements appear
  // here too. Prefer the original cash row when both share the same code.
  const movimientos = useMemo(() => {
    type CashRow = NormalizedData['efectivo'][number];
    const originals = new Map(data.efectivo.map((row) => [row.codigo, row]));
    const included = new Set<string>();
    const rows: CashRow[] = [];

    for (const account of data.activosLiquidos) {
      const isCash = String(account.institucion || '').toUpperCase() === 'EFECTIVO'
        || String(account.activo || '').toUpperCase().includes('EFECTIVO');
      if (!isCash) continue;

      for (const [index, entry] of (account.movimientos || []).entries()) {
        const code = entry.origen || account.id + ':' + index;
        if (included.has(code)) continue;
        const original = originals.get(code);
        if (original) {
          rows.push(original);
        } else {
          const amount = Number(entry.monto);
          if (!Number.isFinite(amount) || amount === 0) continue;
          rows.push({
            id: 'caja:' + code,
            codigo: entry.origen || '—',
            fecha: entry.fecha || '',
            tipo: amount > 0 ? 'Ingreso' : 'Pago',
            clienteNombre: entry.tercero || '',
            monto: Math.abs(amount),
            origenFondos: account.activo || account.institucion,
            referencia: entry.concepto,
            createdByName: entry.createdByName,
            createdAtAudit: entry.createdAtAudit,
            raw: entry,
          });
        }
        included.add(code);
      }
    }

    rows.push(...data.efectivo.filter((row) => !included.has(row.codigo)));
    return rows.sort(compareChronologicalDesc);
  }, [data.activosLiquidos, data.efectivo]);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      const matchSearch =
        m.codigo.toLowerCase().includes(search.toLowerCase()) ||
        m.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        m.origenFondos?.toLowerCase().includes(search.toLowerCase()) ||
        m.referencia?.toLowerCase().includes(search.toLowerCase());
      const matchTipo = !filterTipo || m.tipo === filterTipo;
      const matchCliente =
        !selectedCliente ||
        m.clienteId === selectedCliente;

      const matchFecha = matchesDateRange(m.fecha, fechaDesde, fechaHasta);

      const matchCreador = !filterCreador || formatAuthorName(m.createdByName, m.createdBy, data.usuarios).toLowerCase() === filterCreador.toLowerCase();

      return matchSearch && matchTipo && matchCliente && matchFecha && matchCreador && (!paymentId || m.id === paymentId);
    });
  }, [movimientos, data.usuarios, search, filterTipo, selectedCliente, fechaDesde, fechaHasta, filterCreador, paymentId]);

  const totalEnTransitoCaja = visibleMovements
    .filter((m) => m.raw?.esPendiente)
    .reduce((sum, m) => sum + (Number(m.monto) || 0), 0);
  const transitoCount = visibleMovements.filter((m) => m.raw?.esPendiente).length;

  const isPending = (id: string) => {
    const token = tokenByPayment.get(id);
    return Boolean(token && getTokenState(token) === 'activo');
  };
  const pendingCount = filteredMovimientos.filter((row) => isPending(row.id)).length;
  const visibleMovements = pendingOnly ? filteredMovimientos.filter((row) => isPending(row.id)) : filteredMovimientos;
  const tokenLabels = { activo: 'Pendiente', entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Vencido' };

  const handleRecibirEnCaja = async (movimiento: any) => {
    const idOriginal = movimiento.raw?.idOriginal;
    if (!idOriginal) return;
    if (!window.confirm(`¿Confirmas que los ${formatCOP(movimiento.monto)} correspondientes a la venta ${movimiento.codigo} ya ingresaron físicamente a la caja de efectivo?`)) {
      return;
    }
    setReceivingId(idOriginal);
    try {
      await marcarVentaRecibida(idOriginal);
    } catch (err: any) {
      alert(err?.message || 'No se pudo confirmar el ingreso a caja.');
    } finally {
      setReceivingId(null);
    }
  };

  const secondaryAction = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-muted';
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <h2 className="text-base font-bold">Efectivo</h2>
          <p className="text-xs text-muted-foreground">Entradas y salidas de caja</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (<button type="button" onClick={() => setMovementMode('pago')} className={recordButtonClass}>
            <i className="ri-arrow-up-circle-line" aria-hidden="true" /> Pago en efectivo
          </button>)}
          {canWrite && (<button type="button" onClick={() => setMovementMode('ingreso')} className={secondaryAction}>
            <i className="ri-arrow-down-circle-line" aria-hidden="true" /> Ingreso a caja
          </button>)}
          {canWrite && (<button type="button" onClick={onOpenAddGasto ?? (() => setIsAddGastoOpen(true))} className={secondaryAction}>
            <i className="ri-receipt-line" aria-hidden="true" /> Registrar gasto
          </button>)}
        </div>
      </div>

      {/* Filter Bar: Desktop (Search + Fecha + Filtros) | Mobile (Search + Filtros) */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Search */}
          <div className="relative flex-1 min-w-[160px] max-w-2xl">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, persona o referencia..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Right: Fecha + Filter Trigger Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Fecha (Desktop only) */}
            <div className="hidden md:block shrink-0">
              <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} compact />
            </div>

            {/* Popup Filter Trigger Button */}
            <FilterTriggerButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={(filterTipo ? 1 : 0) + (selectedCliente ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(visibleMovements.length)} de {formatNumber(movimientos.length)} registros</span>
          {(search || filterTipo || selectedCliente || fechaDesde || fechaHasta || filterCreador || paymentId || pendingOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterTipo('');
                setSelectedCliente('');
                setFechaDesde('');
                setFechaHasta('');
                setFilterCreador('');
                setPendingOnly(false);
                setParams((current) => { const next = new URLSearchParams(current); next.delete('pago'); return next; });
              }}
              type="button"
              className="font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <i className="ri-filter-off-line" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros de Efectivo"
        activeCount={(filterTipo ? 1 : 0) + (selectedCliente ? 1 : 0) + (filterCreador ? 1 : 0) + (fechaDesde || fechaHasta ? 1 : 0)}
        onClear={() => {
          setFilterTipo('');
          setSelectedCliente('');
          setFechaDesde('');
          setFechaHasta('');
          setFilterCreador('');
        }}
      >
        {/* Mobile-only visible filters */}
        <div className="md:hidden space-y-3 pb-3 border-b border-border">
          <div>
            <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
          </div>
        </div>

        {/* Tipo Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Movimiento</label>
          <TableSelectFilter label="Tipo" value={filterTipo} onChange={setFilterTipo} className="w-full">
            <option value="">Todos los tipos</option>
            <option value="Ingreso">Ingreso a Caja</option>
            <option value="Pago">Salida de Caja</option>
          </TableSelectFilter>
        </div>

        {/* Cliente Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Cliente</label>
          <ClientSearchSelect value={selectedCliente} onChange={setSelectedCliente} placeholder="Todos los clientes" compact />
        </div>

        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={filterCreador}
            onChange={setFilterCreador}
            records={movimientos}
            className="w-full"
          />
        </div>
      </FilterModal>

      <KpiStrip metrics={([
        ['Movimientos', visibleMovements.length],
        ['Entradas COP', formatCOP(sumRows(visibleMovements, (m) => m.tipo === 'Ingreso' ? m.monto : 0))],
        ['Salidas COP', formatCOP(sumRows(visibleMovements, (m) => m.tipo === 'Pago' ? m.monto - (m.comisionCop ?? 0) : 0))],
        ['Comisiones COP', formatCOP(sumRows(visibleMovements, (m) => m.comisionCop ?? 0))],
        ['Neto COP', formatCOP(sumRows(visibleMovements, (m) => m.tipo === 'Ingreso' ? (m.raw?.esPendiente ? 0 : m.monto) : -(m.monto - (m.comisionCop ?? 0))))],
        ['Por recibir en caja', (
          <div className="flex items-center gap-1.5">
            <span className={totalEnTransitoCaja > 0 ? "text-amber-400 font-bold" : ""}>
              {formatCOP(totalEnTransitoCaja)}
            </span>
            {transitoCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                {transitoCount} pend.
              </span>
            )}
          </div>
        )],
        ['Pendientes', (
          <button type="button" aria-pressed={pendingOnly} aria-label={`Filtrar ${pendingCount} pendientes`}
            onClick={() => setPendingOnly(!pendingOnly)} className="text-destructive hover:underline">
            {formatNumber(pendingCount)} <i className="ri-filter-3-line text-sm" aria-hidden="true" />
          </button>
        )],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {tokenError && <p role="alert" className="text-sm text-destructive">{tokenError}</p>}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Cliente / tercero</th>
                <th className="py-3 px-4 text-right">Efectivo (COP)</th>
                <th className="py-3 px-4 text-right">Comisión (COP)</th>
                <th className="py-3 px-4 text-right">Total cliente (COP)</th>
                <th className="py-3 px-4">Referencia / Detalle</th>
                <CreatedByHeader />
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleMovements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    No hay movimientos de efectivo que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={11} rows={visibleMovements}>{(m) => {
                  const token = tokenByPayment.get(m.id);
                  const tokenState = token && getTokenState(token);
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">{m.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(m.fecha)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.tipo === 'Ingreso'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {m.tipo === 'Ingreso' ? 'Ingreso' : 'Salida'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {m.raw?.esPendiente ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/15 border border-amber-500/30 animate-pulse">
                          <i className="ri-time-line text-xs" /> Por recibir
                        </span>
                      ) : token && tokenState ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVoucher(token)}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all shadow-xs ${
                                tokenState === 'activo'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                  : tokenState === 'entregado'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : tokenState === 'cancelado'
                                  ? 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25'
                                  : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                              }`}
                              title={`Ver vale de retiro (${tokenLabels[tokenState]})`}
                            >
                              <i className={
                                tokenState === 'activo'
                                  ? 'ri-time-line text-xs'
                                  : tokenState === 'entregado'
                                  ? 'ri-checkbox-circle-fill text-xs'
                                  : tokenState === 'cancelado'
                                  ? 'ri-close-circle-line text-xs'
                                  : 'ri-alert-line text-xs'
                              } />
                              <span>{tokenLabels[tokenState]}</span>
                            </button>
                            {isAdmin && (tokenState === 'expirado' || tokenState === 'cancelado') && canWrite && (
                              <button
                                type="button"
                                disabled={Boolean(issuingId)}
                                onClick={() => void replaceToken(m.id)}
                                className="text-[10px] font-bold text-primary hover:underline disabled:opacity-50 ml-0.5"
                                title="Reemitir token"
                              >
                                {issuingId === m.id ? '…' : 'Reemitir'}
                              </button>
                            )}
                          </div>
                        ) : m.raw?.esPendiente ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/15 border border-amber-500/30 animate-pulse">
                            <i className="ri-time-line text-xs" /> Por recibir
                          </span>
                        ) : m.tipo === 'Ingreso' ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            <i className="ri-check-line text-xs" /> Liquidado
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      {/* Exact Client Name from {CLIENTE} column */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {m.clienteNombre && m.clienteNombre !== 'Ingreso de Caja' && m.clienteNombre !== 'Movimiento Interno' ? (
                          <span className="font-mono text-xs">{m.clienteNombre}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">{m.clienteNombre || '—'}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 px-4 text-right font-bold tabular-nums">{formatCOP(m.monto - (m.comisionCop ?? 0))}</td>
                      <td className="whitespace-nowrap py-3 px-4 text-right tabular-nums">{m.comisionCop ? formatCOP(m.comisionCop) : '—'}</td>
                      <td className="whitespace-nowrap py-3 px-4 text-right tabular-nums">{m.tipo === 'Pago' && (m.clienteId || m.clienteCodigo) ? formatCOP(m.monto) : '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        <span>{m.referencia || '—'}</span>
                      </td>
                      <CreatedByCell name={m.createdByName} />
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">

                        {m.raw?.tipoOperacion === 'VENTA_USDT' && m.raw?.esPendiente && canWrite && (
                          <button
                            type="button"
                            disabled={receivingId === m.raw.idOriginal}
                            onClick={() => handleRecibirEnCaja(m)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition-colors mr-1.5"
                            title="Confirmar ingreso de efectivo en caja"
                          >
                            <i className={receivingId === m.raw.idOriginal ? "ri-loader-4-line animate-spin text-xs" : "ri-check-line text-xs"} />
                            <span>Recibir</span>
                          </button>
                        )}
                        {canWrite && (<button
                          type="button"
                          onClick={() => setEditingMovimiento(m)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors text-foreground"
                          title={isAdmin ? 'Editar o eliminar movimiento' : 'Editar movimiento'}
                        >
                          <i className="ri-edit-line text-xs" />
                          <span>Editar</span>
                        </button>)}
                      </td>
                    </tr>
                  );
                }}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-border">
          {visibleMovements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No hay movimientos de efectivo que coincidan con los filtros
            </div>
          ) : (
            visibleMovements.map((m) => {
              const token = tokenByPayment.get(m.id);
              const tokenState = token && getTokenState(token);
              return (
                <div key={m.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-foreground">{m.codigo}</span>
                      <div className="text-[11px] text-muted-foreground">{formatDate(m.fecha)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.tipo === 'Ingreso'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {m.tipo === 'Ingreso' ? 'Ingreso a caja' : 'Salida de caja'}
                      </span>
                      {token && tokenState ? (
                        <button
                          type="button"
                          onClick={() => setVoucher(token)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all shadow-xs ${
                            tokenState === 'activo'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : tokenState === 'entregado'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : tokenState === 'cancelado'
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          <i className={
                            tokenState === 'activo'
                              ? 'ri-time-line text-xs'
                              : tokenState === 'entregado'
                              ? 'ri-checkbox-circle-fill text-xs'
                              : tokenState === 'cancelado'
                              ? 'ri-close-circle-line text-xs'
                              : 'ri-alert-line text-xs'
                          } />
                          <span>{tokenLabels[tokenState]}</span>
                        </button>
                      ) : m.tipo === 'Ingreso' ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          <i className="ri-check-line text-xs" /> Liquidado
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Cliente / Tercero */}
                  <div className="text-xs">
                    <span className="text-muted-foreground">Cliente / Tercero: </span>
                    {m.clienteNombre && m.clienteNombre !== 'Ingreso de Caja' && m.clienteNombre !== 'Movimiento Interno' ? (
                      <span className="font-semibold text-foreground">{m.clienteNombre}</span>
                    ) : (
                      <span className="text-muted-foreground italic">{m.clienteNombre || '—'}</span>
                    )}
                  </div>

                  {/* Amounts Grid */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-2.5 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Efectivo COP</div>
                      <div className="font-bold text-foreground tabular-nums">{formatCOP(m.monto - (m.comisionCop ?? 0))}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Comisión COP</div>
                      <div className="font-semibold text-foreground tabular-nums">{m.comisionCop ? formatCOP(m.comisionCop) : '—'}</div>
                    </div>
                    <div className="col-span-2 border-t border-border/50 pt-1.5">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">Total Cliente COP</div>
                      <div className="font-bold text-primary tabular-nums">
                        {m.tipo === 'Pago' && (m.clienteId || m.clienteCodigo) ? formatCOP(m.monto) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Ref & Voucher Token */}
                  {(m.referencia || (token && tokenState)) && (
                    <div className="text-xs space-y-1.5">
                      {m.referencia && (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Ref:</span> {m.referencia}
                        </div>
                      )}
                      {token && tokenState && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVoucher(token)}
                            className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold hover:underline ' + (tokenState === 'activo' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground')}
                          >
                            <i className="ri-ticket-2-line" aria-hidden="true" /> {tokenLabels[tokenState]}
                          </button>
                          {isAdmin && (tokenState === 'expirado' || tokenState === 'cancelado') && (
                            canWrite && (
                              <button
                                type="button"
                                disabled={Boolean(issuingId)}
                                onClick={() => void replaceToken(m.id)}
                                className="font-semibold text-primary hover:underline disabled:opacity-50"
                              >
                                {issuingId === m.id ? 'Emitiendo…' : 'Reemitir'}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      Por: <span className="font-medium text-foreground">{m.createdByName || '—'}</span>
                    </span>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => setEditingMovimiento(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors text-foreground"
                      >
                        <i className="ri-edit-line text-xs" />
                        <span>Editar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      <AddEfectivoModal
        isOpen={Boolean(movementMode || editingMovimiento)}
        mode={movementMode ?? (editingMovimiento?.tipo === 'Pago' ? 'pago' : 'ingreso')}
        commissionEnabled
        onTokenCreated={openNewToken}
        record={editingMovimiento}
        onClose={() => {
          setMovementMode(null);
          setEditingMovimiento(null);
        }}
      />
      <TokenVoucherModal isOpen={Boolean(voucher)} token={voucher} onClose={() => setVoucher(null)} />
      <AddGastoModal
        isOpen={isAddGastoOpen}
        onClose={() => setIsAddGastoOpen(false)}
        isCashContext={true}
      />
    </div>
  );
};
