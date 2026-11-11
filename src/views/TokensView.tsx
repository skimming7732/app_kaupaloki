import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { formatNumber } from '../utils/formatters';
import { recordButtonClass } from '../components/modals/RecordDialog';
import { CashToken, formatCurrencyAmount, generateTokenVoucherDataUrl, getTokenState } from '../utils/tokenVoucherGenerator';
import { CreateTokenModal } from '../components/modals/CreateTokenModal';
import { ScanTokenModal } from '../components/modals/ScanTokenModal';
import { TokenVoucherModal } from '../components/modals/TokenVoucherModal';

const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted';
const iconButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-base hover:bg-muted sm:h-9 sm:w-9';

const tokenBadges = {
  activo: { label: 'Activo', style: 'bg-primary/10 text-primary' },
  entregado: { label: 'Entregado', style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  cancelado: { label: 'Cancelado', style: 'bg-destructive/10 text-destructive' },
  expirado: { label: 'Expirado', style: 'bg-muted text-muted-foreground' },
};

function VoucherThumbnail({ token, onOpen }: { token: CashToken; onOpen: () => void }) {
  const [image, setImage] = useState<{ token: CashToken; url: string } | null>(null);
  useEffect(() => {
    let current = true;
    generateTokenVoucherDataUrl(token, true).then((url) => {
      if (current) setImage({ token, url });
    }).catch(() => {});
    return () => { current = false; };
  }, [token]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir vale ${token.codigo || 'de retiro'}`}
      className="flex h-20 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-primary hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary"
    >
      {image?.token === token
        ? <img src={image.url} alt="" className="h-full w-full object-cover" />
        : <i className="ri-ticket-2-line text-lg" aria-hidden="true" />}
    </button>
  );
}

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
    if (getTokenState(token) !== 'activo') return;

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
        .eq('estado', 'activo')
        .gt('expires_at', new Date().toISOString())
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
    if (!isAdmin || getTokenState(token) !== 'activo') return;

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
        .eq('estado', 'activo')
        .gt('expires_at', new Date().toISOString())
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

      if (statusFilter !== 'all' && getTokenState(t) !== statusFilter) return false;

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

    filteredTokens.forEach((t) => {
      const state = getTokenState(t);
      if (state === 'entregado') {
        redeemedCount++;
      } else if (state !== 'activo') {
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
            className={secondaryButton}
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
        <p>Los tokens creados en esta vista son independientes de caja. Los tokens vinculados toman el importe del pago registrado en Efectivo.</p>
      </div>

      {/* Tokens Table Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="block w-full border-collapse text-left lg:table">
            <caption className="sr-only">Tokens de retiro y autorizaciones de caja</caption>
            <thead className="hidden lg:table-header-group">
              <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4">Vale</th>
                <th className="py-3.5 px-4">Código Token</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Monto & Divisa</th>
                <th className="py-3.5 px-4">Beneficiario / Ref</th>
                <th className="py-3.5 px-4">Pago vinculado</th>
                <th className="py-3.5 px-4">Autor</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-border text-xs text-foreground lg:table-row-group">
              {loading && tokens.length === 0 ? (
                <tr className="block lg:table-row">
                  <td colSpan={9} className="block py-12 text-center lg:table-cell text-muted-foreground">
                    <i className="ri-loader-4-line animate-spin text-2xl text-primary block mb-2" />
                    Cargando tokens de retiro...
                  </td>
                </tr>
              ) : filteredTokens.length === 0 ? (
                <tr className="block lg:table-row">
                  <td colSpan={9} className="block py-12 text-center lg:table-cell text-muted-foreground">
                    <i className="ri-ticket-2-line text-3xl text-muted-foreground block mb-2" />
                    No se encontraron tokens con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                <PaginatedRows rows={filteredTokens} columns={9}>
                  {(token) => {
                    const state = getTokenState(token);
                    const badge = tokenBadges[state];
                    const isVisible = visibleCodes[token.id];
                    const isCopied = copiedCodeId === token.id;
                    const openVoucher = () => setSelectedVoucherToken(token);
                    const amount = `${token.divisa} $${formatCurrencyAmount(token.monto, token.divisa)}`;
                    const date = new Date(token.created_at).toLocaleString('es-CO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    });
                    const status = <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${badge.style}`}>{badge.label}</span>;

                    const paymentLink = token.efectivo_id ? (
                      <Link className="font-semibold text-primary hover:underline" to={'/efectivo?pago=' + token.efectivo_id}>
                        {token.pago_codigo || 'Ver pago'}
                      </Link>
                    ) : token.pago_codigo ? token.pago_codigo + ' · Anulado' : 'Independiente';

                    return (
                      <tr key={token.id} className="block p-3 lg:table-row lg:p-0 lg:hover:bg-muted/30">
                        <td className="block lg:table-cell lg:px-4 lg:py-3">
                          <div className="flex items-center gap-3">
                            <VoucherThumbnail token={token} onOpen={openVoucher} />
                            <div className="min-w-0 flex-1 space-y-1">
                              <button type="button" onClick={openVoucher} className="font-mono font-bold text-primary hover:underline">
                                {token.codigo || 'Ver vale'}
                              </button>
                              <div className="space-y-1 lg:hidden">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-bold tabular-nums">{amount}</span>
                                  {status}
                                </div>
                                <p className="text-muted-foreground">{paymentLink}</p>
                                {token.referencia && <p className="break-words text-muted-foreground">{token.referencia}</p>}
                                <p className="text-muted-foreground">{date} · {token.created_by_name || 'Sistema'}</p>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="block pt-2 lg:table-cell lg:px-3 lg:py-3">
                          <div className="flex flex-wrap items-center gap-1.5 font-mono">
                            <span className="mr-1 font-semibold tracking-wider">
                              {isVisible ? token.token_code.toUpperCase() : '••••••••'}
                            </span>
                            <button type="button" onClick={() => toggleCodeVisibility(token.id)}
                              title={isVisible ? 'Ocultar código' : 'Mostrar código'}
                              aria-label={isVisible ? 'Ocultar código' : 'Mostrar código'}
                              className={iconButton + ' text-muted-foreground'}>
                              <i className={isVisible ? 'ri-eye-off-line' : 'ri-eye-line'} aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => handleCopyCode(token.id, token.token_code)}
                              title="Copiar código" aria-label="Copiar código" className={iconButton + ' text-primary'}>
                              <i className={isCopied ? 'ri-check-line' : 'ri-file-copy-line'} aria-hidden="true" />
                            </button>
                          </div>
                        </td>

                        <td className="hidden whitespace-nowrap px-3 py-3 text-muted-foreground lg:table-cell">{date}</td>
                        <td className="hidden whitespace-nowrap px-3 py-3 font-semibold tabular-nums lg:table-cell">{amount}</td>
                        <td className="hidden max-w-40 break-words px-3 py-3 lg:table-cell">{token.referencia || '—'}</td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">{paymentLink}</td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">{token.created_by_name || 'Sistema'}</td>
                        <td className="hidden px-3 py-3 lg:table-cell">{status}</td>
                        <td className="block pt-2 lg:table-cell lg:px-3 lg:py-3">
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:gap-1">
                            <button type="button" onClick={openVoucher} className={secondaryButton + ' lg:min-h-9 lg:whitespace-nowrap lg:text-xs'}>
                              <i className="ri-ticket-2-line text-primary" aria-hidden="true" />
                              Ver vale
                            </button>
                            {state === 'activo' && (
                              <button type="button" onClick={() => handleRedeem(token)}
                                title="Marcar como entregado" aria-label="Marcar como entregado"
                                className={iconButton + ' text-primary'}>
                                <i className="ri-checkbox-circle-line" aria-hidden="true" />
                              </button>
                            )}
                            {state === 'activo' && isAdmin && (
                              <button type="button" onClick={() => handleCancel(token)}
                                title="Cancelar token" aria-label="Cancelar token"
                                className={iconButton + ' text-destructive'}>
                                <i className="ri-close-circle-line" aria-hidden="true" />
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
        onCancel={isAdmin ? handleCancel : undefined}
      />
    </div>
  );
};
