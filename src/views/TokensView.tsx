import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { formatNumber } from '../utils/formatters';
import { recordButtonClass } from '../components/modals/RecordDialog';
import { CashToken, formatCurrencyAmount } from '../utils/tokenVoucherGenerator';
import { CreateTokenModal } from '../components/modals/CreateTokenModal';
import { ScanTokenModal } from '../components/modals/ScanTokenModal';
import { TokenVoucherModal } from '../components/modals/TokenVoucherModal';

export const TokensView: React.FC = () => {
  const { profile, user } = useAuth();
  const { data: globalData } = useData();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';

  // Tokens data state
  const [tokens, setTokens] = useState<CashToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [selectedVoucherToken, setSelectedVoucherToken] = useState<CashToken | null>(null);

  // Visible codes state (revealed codes map)
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Fetch tokens from Supabase
  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cash_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens((data as CashToken[]) || []);
    } catch (err) {
      console.error('Error cargando tokens:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Toggle reveal code
  const toggleCodeVisibility = (id: string) => {
    setVisibleCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy code to clipboard
  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code.toUpperCase());
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Redeem token
  const handleRedeem = async (token: CashToken) => {
    if (token.estado === 'entregado' || token.status === 'redeemed') return;

    const confirmed = window.confirm(
      `¿Confirmas la entrega en caja de ${token.divisa} $${formatCurrencyAmount(
        token.monto,
        token.divisa
      )} para el token ${token.codigo || token.token_code}?`
    );
    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from('cash_tokens')
        .update({
          estado: 'entregado',
          status: 'entregado',
          redeemed_at: new Date().toISOString(),
          redeemed_by: user?.id || null,
          redeemed_by_name: profile?.full_name || user?.email || 'Cajero',
        })
        .eq('id', token.id)
        .select()
        .single();

      if (error) throw error;

      // Update state locally
      setTokens((prev) =>
        prev.map((t) => (t.id === token.id ? (data as CashToken) : t))
      );
      if (selectedVoucherToken?.id === token.id) {
        setSelectedVoucherToken(data as CashToken);
      }
    } catch (err: any) {
      console.error('Error al redimir token:', err);
      alert('Error al marcar como entregado: ' + (err.message || 'Error desconocido'));
    }
  };

  // Cancel token
  const handleCancel = async (token: CashToken) => {
    if (token.estado === 'cancelado' || token.status === 'cancelled') return;

    const reason = window.prompt(
      `Motivo de cancelación para el token ${token.codigo || token.token_code} (opcional):`
    );
    if (reason === null) return; // User cancelled prompt

    try {
      const { data, error } = await supabase
        .from('cash_tokens')
        .update({
          estado: 'cancelado',
          status: 'cancelado',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason.trim() || null,
        })
        .eq('id', token.id)
        .select()
        .single();

      if (error) throw error;

      // Update state locally
      setTokens((prev) =>
        prev.map((t) => (t.id === token.id ? (data as CashToken) : t))
      );
      if (selectedVoucherToken?.id === token.id) {
        setSelectedVoucherToken(data as CashToken);
      }
    } catch (err: any) {
      console.error('Error al cancelar token:', err);
      alert('Error al cancelar token: ' + (err.message || 'Error desconocido'));
    }
  };

  // Filtered tokens calculation
  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesCode = t.codigo?.toLowerCase().includes(q);
        const matchesTokenCode = t.token_code?.toLowerCase().includes(q);
        const matchesRef = t.referencia?.toLowerCase().includes(q);
        const matchesAuthor = t.created_by_name?.toLowerCase().includes(q);
        if (!matchesCode && !matchesTokenCode && !matchesRef && !matchesAuthor) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isExp =
          t.estado === 'expirado' ||
          (t.expires_at && new Date(t.expires_at) < new Date() && t.estado === 'activo');
        if (statusFilter === 'activo' && (t.estado !== 'activo' || isExp)) return false;
        if (statusFilter === 'entregado' && t.estado !== 'entregado' && t.status !== 'redeemed')
          return false;
        if (statusFilter === 'cancelado' && t.estado !== 'cancelado' && t.status !== 'cancelled')
          return false;
        if (statusFilter === 'expirado' && !isExp) return false;
      }

      // Currency filter
      if (currencyFilter !== 'all' && t.divisa !== currencyFilter) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const tokenDate = new Date(t.created_at).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          if (tokenDate < startOfToday) return false;
        } else if (dateFilter === '7d') {
          if (now - tokenDate > 7 * 86400 * 1000) return false;
        } else if (dateFilter === '30d') {
          if (now - tokenDate > 30 * 86400 * 1000) return false;
        }
      }

      return true;
    });
  }, [tokens, search, statusFilter, currencyFilter, dateFilter]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const totalCount = filteredTokens.length;
    let activeCount = 0;
    let activeCOP = 0;
    let redeemedCount = 0;
    let cancelledCount = 0;

    const now = new Date();

    filteredTokens.forEach((t) => {
      const isRed = t.estado === 'entregado' || t.status === 'redeemed';
      const isCanc = t.estado === 'cancelado' || t.status === 'cancelled';
      const isExp =
        t.estado === 'expirado' ||
        (t.expires_at && new Date(t.expires_at) < now && t.estado === 'activo');

      if (isRed) {
        redeemedCount++;
      } else if (isCanc || isExp) {
        cancelledCount++;
      } else {
        activeCount++;
        if (t.divisa === 'COP') {
          activeCOP += Number(t.monto) || 0;
        }
      }
    });

    return { totalCount, activeCount, activeCOP, redeemedCount, cancelledCount };
  }, [filteredTokens]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <i className="ri-ticket-2-line text-xl" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">Tokens de retiro</h1>
              <p className="text-xs text-muted-foreground">
                Autorizaciones operativas de caja y vales de efectivo físicos
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            onClick={() => setIsScanOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-border hover:border-primary/30 bg-muted/40 hover:bg-muted text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <i className="ri-qr-scan-2-line text-primary text-sm" />
            Validar token
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className={`${recordButtonClass} justify-center`}
          >
            <i className="ri-add-line text-sm" />
            Crear token
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-2xl bg-card border border-border grid grid-cols-2 items-center gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Search Input */}
        <div className="relative col-span-2 min-w-0 lg:col-span-1">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            aria-label="Buscar tokens"
            placeholder="Buscar por código, referencia o autor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-1 lg:flex lg:flex-wrap lg:items-center">
          {/* Status Select */}
          <select
            aria-label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border min-w-0 rounded-lg px-2 h-9 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
            <option value="expirado">Expirados</option>
          </select>

          {/* Currency Select */}
          <select
            aria-label="Divisa"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-background border border-border min-w-0 rounded-lg px-2 h-9 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Todas las divisas</option>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
            <option value="USDT">USDT</option>
            <option value="EUR">EUR</option>
          </select>

          {/* Date Filter */}
          <select
            aria-label="Fecha de creación"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-background border border-border min-w-0 rounded-lg px-2 h-9 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchTokens}
            disabled={loading}
            aria-label="Actualizar tokens"
            title="Recargar tokens"
            className="w-full lg:w-9 h-9 rounded-lg bg-background border border-border hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <i className={`ri-refresh-line text-sm ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>{formatNumber(filteredTokens.length)} de {formatNumber(tokens.length)} registros</span>
        {(search || statusFilter !== 'all' || currencyFilter !== 'all' || dateFilter !== 'all') && (
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => {
            setSearch(''); setStatusFilter('all'); setCurrencyFilter('all'); setDateFilter('all');
          }}>Limpiar filtros</button>
        )}
      </div>

      <KpiStrip metrics={[
        { label: 'Tokens', value: metrics.totalCount, icon: 'ri-ticket-2-line' },
        { label: 'Pendientes', value: metrics.activeCount, icon: 'ri-time-line' },
        { label: 'Pendiente COP', value: `$${formatNumber(metrics.activeCOP, 0, 2)}`, icon: 'ri-money-dollar-circle-line', featured: true },
        { label: 'Entregados', value: metrics.redeemedCount, icon: 'ri-checkbox-circle-line' },
        { label: 'Cancelados / expirados', value: metrics.cancelledCount, icon: 'ri-close-circle-line' },
      ]} />

      <div className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
        <i className="ri-shield-check-line mt-0.5 text-primary" aria-hidden="true" />
        <p>Vales de autorización para entregas en caja. Su emisión y validación no modifican los saldos de los activos.</p>
      </div>

      {/* Tokens Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Tokens de retiro y autorizaciones de caja</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Código Token</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Monto & Divisa</th>
                <th className="py-3.5 px-4">Beneficiario / Ref</th>
                <th className="py-3.5 px-4">Autor</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-foreground">
              {loading && tokens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary block mb-2" />
                    Cargando tokens de retiro...
                  </td>
                </tr>
              ) : filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <i className="ri-ticket-2-line text-3xl text-muted-foreground block mb-2" />
                    No se encontraron tokens con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                <PaginatedRows rows={filteredTokens} columns={8}>
                {(token) => {
                  const isVisible = visibleCodes[token.id];
                  const isCancelled = token.estado === 'cancelado' || token.status === 'cancelled';
                  const isRedeemed = token.estado === 'entregado' || token.status === 'redeemed';
                  const isExpired =
                    token.estado === 'expirado' ||
                    (token.expires_at && new Date(token.expires_at) < new Date() && !isRedeemed);
                  const isCopied = copiedCodeId === token.id;

                  return (
                    <tr
                      key={token.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedVoucherToken(token)}
                    >
                      {/* Código Interno */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        {token.codigo || 'TK'}
                      </td>

                      {/* Código Token Monospace con Eye Toggle & Copy */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`font-bold tracking-wider ${
                              isVisible ? 'text-foreground' : 'text-muted-foreground select-none'
                            }`}
                          >
                            {isVisible
                              ? token.token_code.toUpperCase()
                              : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleCodeVisibility(token.id)}
                            title={isVisible ? 'Ocultar código' : 'Mostrar código'}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <i
                              className={isVisible ? 'ri-eye-off-line text-xs' : 'ri-eye-line text-xs'}
                            />
                          </button>
                          <button
                            onClick={() => handleCopyCode(token.id, token.token_code)}
                            title="Copiar código"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          >
                            <i
                              className={
                                isCopied
                                  ? 'ri-check-line text-emerald-600 dark:text-emerald-400 text-xs'
                                  : 'ri-file-copy-line text-xs'
                              }
                            />
                          </button>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        {new Date(token.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Monto & Divisa */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold tabular-nums text-foreground">
                        <span className="text-muted-foreground text-[11px] mr-1">{token.divisa}</span>
                        ${formatNumber(token.monto, token.divisa === 'USDT' ? 2 : 0, 2)}
                      </td>

                      {/* Referencia */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-foreground">
                        {token.referencia || <span className="text-muted-foreground">—</span>}
                      </td>

                      {/* Autor */}
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {token.created_by_name || 'Sistema'}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCancelled
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : isRedeemed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isExpired
                              ? 'bg-muted text-muted-foreground border border-border'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCancelled
                                ? 'bg-rose-400'
                                : isRedeemed
                                ? 'bg-emerald-400'
                                : isExpired
                                ? 'bg-slate-400'
                                : 'bg-primary'
                            }`}
                          />
                          {isCancelled
                            ? 'Cancelado'
                            : isRedeemed
                            ? 'Entregado'
                            : isExpired
                            ? 'Expirado'
                            : 'Activo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver Vale */}
                          <button
                            onClick={() => setSelectedVoucherToken(token)}
                            title="Ver vale de caja"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <i className="ri-image-line text-xs" />
                          </button>

                          {/* Redimir si activo */}
                          {!isRedeemed && !isCancelled && !isExpired && (
                            <button
                              onClick={() => handleRedeem(token)}
                              title="Marcar como entregado en caja"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                            >
                              <i className="ri-checkbox-circle-line text-xs" />
                            </button>
                          )}

                          {/* Cancelar si activo */}
                          {!isRedeemed && !isCancelled && !isExpired && isAdmin && (
                            <button
                              onClick={() => handleCancel(token)}
                              title="Cancelar token"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                            >
                              <i className="ri-close-circle-line text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }}
                </PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Token Modal */}
      <CreateTokenModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        availableCurrencies={globalData.divisas}
        onSuccess={(newToken) => {
          setTokens((prev) => [newToken, ...prev]);
          setSelectedVoucherToken(newToken);
        }}
      />

      {/* Scan Token Modal */}
      <ScanTokenModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onTokenRedeemed={(updated) => {
          setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onViewVoucher={(token) => {
          setIsScanOpen(false);
          setSelectedVoucherToken(token);
        }}
      />

      {/* Token Voucher Modal */}
      <TokenVoucherModal
        isOpen={Boolean(selectedVoucherToken)}
        onClose={() => setSelectedVoucherToken(null)}
        token={selectedVoucherToken}
        onRedeem={(token) => handleRedeem(token)}
        onCancel={(token) => handleCancel(token)}
      />
    </div>
  );
};
