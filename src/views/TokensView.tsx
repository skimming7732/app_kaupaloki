import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
    let totalCount = tokens.length;
    let activeCount = 0;
    let activeCOP = 0;
    let redeemedCount = 0;
    let cancelledCount = 0;

    const now = new Date();

    tokens.forEach((t) => {
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
  }, [tokens]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <i className="ri-ticket-2-line text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Tokens de Retiro</h1>
              <p className="text-xs text-slate-400">
                Autorizaciones operativas de caja y vales de efectivo físicos
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScanOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-sky-500/30 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-2 transition-all"
          >
            <i className="ri-qr-scan-2-line text-sky-400 text-sm" />
            Escanear / Validar
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className={`${recordButtonClass} shadow-lg shadow-sky-600/20`}
          >
            <i className="ri-add-line text-sm" />
            Crear Token Manual
          </button>
        </div>
      </div>

      {/* Control Notice Callout */}
      <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/20 flex items-start gap-3 text-xs text-sky-200">
        <i className="ri-shield-check-line text-base text-sky-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-sky-300 font-bold">Control Exclusivo de Caja Física:</strong>{' '}
          Estos tokens no influyen en ningún saldo contable ni alteran los saldos de tus activos
          líquidos ni activos digitales. Son vales internos de seguridad y autorización física para
          quien realiza entregas en efectivo.
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Tokens
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{metrics.totalCount}</span>
            <span className="text-xs text-slate-500">generados</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-1">
          <span className="text-[11px] font-semibold text-sky-300 uppercase tracking-wider block">
            Activos / Pendientes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400">{metrics.activeCount}</span>
            {metrics.activeCOP > 0 && (
              <span className="text-xs text-sky-300/80 truncate">
                COP ${formatCurrencyAmount(metrics.activeCOP, 'COP')}
              </span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider block">
            Entregados / Redimidos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.redeemedCount}</span>
            <span className="text-xs text-emerald-400/60">en caja</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-1">
          <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider block">
            Cancelados / Expirados
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{metrics.cancelledCount}</span>
            <span className="text-xs text-rose-400/60">invalidados</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            placeholder="Buscar por código, token, beneficiario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 h-10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="all">Todos los Estados</option>
            <option value="activo">Activos</option>
            <option value="entregado">Entregados</option>
            <option value="cancelado">Cancelados</option>
            <option value="expirado">Expirados</option>
          </select>

          {/* Currency Select */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="all">Todas las Divisas</option>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
            <option value="USDT">USDT</option>
            <option value="EUR">EUR</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-950/60 border border-white/10 rounded-xl px-3 h-10 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="all">Cualquier Fecha</option>
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchTokens}
            title="Recargar tokens"
            className="w-10 h-10 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <i className={`ri-refresh-line text-sm ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tokens Table Card */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {loading && tokens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <i className="ri-loader-4-line animate-spin text-2xl text-sky-400 block mb-2" />
                    Cargando tokens de retiro...
                  </td>
                </tr>
              ) : filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <i className="ri-ticket-2-line text-3xl text-slate-600 block mb-2" />
                    No se encontraron tokens con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filteredTokens.map((token) => {
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
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedVoucherToken(token)}
                    >
                      {/* Código Interno */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {token.codigo || 'TK'}
                      </td>

                      {/* Código Token Monospace con Eye Toggle & Copy */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`font-bold tracking-wider ${
                              isVisible ? 'text-white' : 'text-slate-500 select-none'
                            }`}
                          >
                            {isVisible
                              ? token.token_code.toUpperCase()
                              : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleCodeVisibility(token.id)}
                            title={isVisible ? 'Ocultar código' : 'Mostrar código'}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <i
                              className={isVisible ? 'ri-eye-off-line text-xs' : 'ri-eye-line text-xs'}
                            />
                          </button>
                          <button
                            onClick={() => handleCopyCode(token.id, token.token_code)}
                            title="Copiar código"
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors"
                          >
                            <i
                              className={
                                isCopied
                                  ? 'ri-check-line text-emerald-400 text-xs'
                                  : 'ri-file-copy-line text-xs'
                              }
                            />
                          </button>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(token.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Monto & Divisa */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <span className="text-slate-400 text-[11px] mr-1">{token.divisa}</span>
                        ${formatCurrencyAmount(token.monto, token.divisa)}
                      </td>

                      {/* Referencia */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-300">
                        {token.referencia || <span className="text-slate-600">—</span>}
                      </td>

                      {/* Autor */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {token.created_by_name || 'Sistema'}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCancelled
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isRedeemed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isExpired
                              ? 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                              : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
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
                                : 'bg-sky-400'
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
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <i className="ri-image-line text-xs" />
                          </button>

                          {/* Redimir si activo */}
                          {!isRedeemed && !isCancelled && !isExpired && (
                            <button
                              onClick={() => handleRedeem(token)}
                              title="Marcar como entregado en caja"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            >
                              <i className="ri-checkbox-circle-line text-xs" />
                            </button>
                          )}

                          {/* Cancelar si activo */}
                          {!isRedeemed && !isCancelled && !isExpired && isAdmin && (
                            <button
                              onClick={() => handleCancel(token)}
                              title="Cancelar token"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            >
                              <i className="ri-close-circle-line text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
