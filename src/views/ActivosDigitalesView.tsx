import { useNavigate, useParams } from 'react-router-dom';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatRate, formatUSD, formatDate } from '../utils/formatters';

export const ActivosDigitalesView: React.FC = () => {
  const { metrics, data } = useAirtable();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { assetId: selectedWalletId } = useParams();
  const setSelectedWalletId = (id: string | null) => navigate(id ? '/activos-digitales/' + encodeURIComponent(id) : '/activos-digitales');

  const wallets = data.activosDigitales || [];

  const selectedWallet = useMemo(() => {
    if (!selectedWalletId) return null;
    return wallets.find((w: any) => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  const totalSaldoRealUsdt = useMemo(() => {
    return wallets.reduce((acc: number, w: any) => acc + (w.saldoReal ?? w.saldoUsdt ?? 0), 0);
  }, [wallets]);

  const handleExportCSV = (wallet: any) => {
    const movements = wallet.movimientos || [];
    const headers = ['Fecha', 'Origen / Hash', 'Concepto', 'Monto USDT', 'Balance USDT', 'Creado por'];
    const rows = movements.map((m: any) => [
      formatDate(m.fecha),
      m.origen || '',
      m.concepto || '',
      m.monto || 0,
      m.balance || 0,
      m.createdByName || 'Sin registro',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r: any) => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `extracto-crypto-${wallet.activo.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTronscanUrl = (address: string) => {
    if (!address) return '#';
    // Clean whitespace
    const clean = address.trim();
    return `https://tronscan.org/balanceView/${clean}/token-balances`;
  };

  const formatShortWallet = (address: string) => {
    if (!address) return '—';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Card background gradients for crypto wallets (vibrant in light theme, deep in dark theme)
  const getCardGradient = (index: number) => {
    const lightGradients = [
      'linear-gradient(135deg, #059669 0%, #047857 100%)', // TRON Emerald Vibrant
      'linear-gradient(135deg, #4318FF 0%, #2563EB 100%)', // Crypto Royal Blue
      'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)', // Cyan / Ocean Blue
      'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', // Radiant Violet
    ];
    const darkGradients = [
      'linear-gradient(135deg, #047857 0%, #064e3b 100%)', // TRON Emerald Green
      'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)', // Crypto Indigo
      'linear-gradient(135deg, #0284c7 0%, #082f49 100%)', // Cyan / Ocean Blue
      'linear-gradient(135deg, #6b21a8 0%, #3b0764 100%)', // Deep Violet
    ];
    return isDark ? darkGradients[index % darkGradients.length] : lightGradients[index % lightGradients.length];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {!selectedWalletId && <div className="flex justify-end"><AddCatalogButton table="activos_digitales" /></div>}
      {/* ============================================================== */}
      {/* VISTA DETALLE: EXTRACTO DE LA BILLETERA CRIPTO SELECCIONADA    */}
      {/* ============================================================== */}
      {selectedWallet ? (
        <div className="space-y-6">
          {/* Top Bar with Back Button and Export Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWalletId(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span>Volver a Billeteras</span>
              </button>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Extracto: {selectedWallet.activo}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {selectedWallet.red || 'TRON (TRC20)'}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">Movimientos en cadena, saldo contable y saldo real auditado</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getTronscanUrl(selectedWallet.wallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-600 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <i className="ri-external-link-line text-sm" />
                <span>Ver en Tronscan</span>
              </a>
              <button
                type="button"
                onClick={() => handleExportCSV(selectedWallet)}
                className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs text-foreground flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <i className="ri-download-2-line text-sm text-primary" />
                <span>Exportar (CSV)</span>
              </button>
            </div>
          </div>

          {/* Master Horizon Crypto Card */}
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(5, 150, 105, 0.25)',
            }}
            className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute right-[-40px] top-[-40px] w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

            {/* Balances Row: Saldo Contable, Saldo Real, Saldo Total */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/10 relative z-10">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                  <i className="ri-coin-line text-emerald-400" />
                  <span>Saldo Contable</span>
                </div>
                <div className="text-3xl font-extrabold font-mono tracking-tight text-white">
                  {formatUSD(selectedWallet.saldoUsdt || 0)}
                </div>
                <span className="text-xs text-emerald-200/70 block mt-1">Registrado en contabilidad interna</span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1 flex items-center gap-1.5">
                  <i className="ri-shield-check-line text-cyan-400" />
                  <span>Saldo Real (En Cadena)</span>
                </div>
                <div className="text-3xl font-extrabold font-mono tracking-tight text-cyan-300">
                  {formatUSD(selectedWallet.saldoReal ?? selectedWallet.saldoUsdt ?? 0)}
                </div>
                <span className="text-xs text-cyan-200/70 block mt-1">Confirmado en Tronscan</span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <i className="ri-wallet-line text-slate-300" />
                  <span>Total USDT</span>
                </div>
                <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-200">
                  {formatUSD(selectedWallet.saldoUsdt || 0)}
                </div>
                <span className="text-xs text-slate-300/70 block mt-1">Unidades USDT disponibles</span>
              </div>
            </div>

            {/* Wallet Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70 block mb-1">
                  Wallet / Titular
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white truncate block">
                  {selectedWallet.titular || selectedWallet.activo}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70 block mb-1">
                  Red / Protocolo
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white uppercase truncate block">
                  {selectedWallet.red || 'TRON (TRC20)'}
                </span>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70 block mb-1">
                  Dirección Pública (Tronscan)
                </span>
                <a
                  href={getTronscanUrl(selectedWallet.wallet)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono font-semibold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 break-all"
                  title="Abrir balances en Tronscan"
                >
                  <span className="truncate">{selectedWallet.wallet || '—'}</span>
                  <i className="ri-external-link-line text-xs shrink-0" />
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70 block mb-1">
                  Tarifas de Red
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-emerald-300 border border-white/10">
                  {selectedWallet.tarifas || 'RED TRON • 1 USDT'}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Historial de Movimientos (USDT)
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {formatNumber((selectedWallet.movimientos || []).length)} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Origen / Hash</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4 text-right">Monto (USDT)</th>
                    <th className="py-3 px-4 text-right">Balance (USDT)</th>
                    <CreatedByHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!selectedWallet.movimientos || selectedWallet.movimientos.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No hay movimientos registrados para esta billetera
                      </td>
                    </tr>
                  ) : (
                    <PaginatedRows columns={6} rows={selectedWallet.movimientos} getDate={(movement) => movement.fecha}>{(m: any, idx: number) => {
                      const isPositive = (m.monto || 0) > 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {formatDate(m.fecha)}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] border border-border">
                              {m.origen || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-foreground min-w-[200px]">
                            {m.concepto || 'Operación USDT'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isPositive ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {isPositive ? `+${formatUSD(m.monto)}` : formatUSD(m.monto)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                            {formatUSD(m.balance)}
                          </td>
                          <CreatedByCell name={m.createdByName} />
                        </tr>
                      );
                    }}</PaginatedRows>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VISTA GENERAL: RESUMEN CONSOLIDADO + TARJETAS HORIZON UI + TABLA */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Consolidated Summary Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            className="rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-wrap justify-between items-center gap-4"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                <i className="ri-coin-line text-emerald-400" />
                <span>Custodia y Balances Cripto</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {formatUSD(metrics.totalActivosDigitales)} <span className="text-xl sm:text-2xl font-bold text-emerald-300">USDT</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Total consolidado en billeteras USDT (Red TRON TRC-20)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Billeteras
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-white">
                  {formatNumber(wallets.length)}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Saldo Real Total
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-cyan-300">
                  {formatUSD(totalSaldoRealUsdt)}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Red Principal
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-400">
                  TRC20
                </span>
              </div>
            </div>
          </div>

          {/* GRID TIPO TARJETAS (HORIZON UI CRYPTO WALLET CARDS) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <i className="ri-wallet-3-line text-sm" />
                <span>Billeteras Cripto en Custodia</span>
              </h3>
              <span className="text-xs text-muted-foreground">{formatNumber(wallets.length)} billeteras operativas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {wallets.map((w: any, idx: number) => {
                const bgGradient = getCardGradient(idx);
                const saldoReal = w.saldoReal ?? w.saldoUsdt ?? 0;

                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWalletId(w.id)}
                    style={{ background: bgGradient }}
                    className="relative rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[220px] overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl group select-none border border-white/10"
                  >
                    <div className="absolute right-[-20px] top-[-20px] w-36 h-36 rounded-full bg-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                    {/* Top Row: Network badge & Tronscan External Link */}
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/30 backdrop-blur-sm border border-white/20">
                          {w.red || 'TRC20'}
                        </span>
                        <h4 className="text-base font-bold text-white mt-2.5 tracking-tight group-hover:text-emerald-200 transition-colors">
                          {w.activo}
                        </h4>
                      </div>

                      {/* Clickable Wallet Link leading to Tronscan Balance View */}
                      <a
                        href={getTronscanUrl(w.wallet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors border border-white/10 shadow-sm"
                        title="Ver balances en Tronscan"
                      >
                        <span>{formatShortWallet(w.wallet)}</span>
                        <i className="ri-external-link-line text-xs" />
                      </a>
                    </div>

                    {/* Middle Row: Saldo Contable & Saldo Real */}
                    <div className="my-3 grid grid-cols-2 gap-2 relative z-10">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-0.5">
                          Saldo Contable
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-white">
                          {formatUSD(w.saldoUsdt || 0)}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block mb-0.5">
                          Saldo Real
                        </span>
                        <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-cyan-300">
                          {formatUSD(saldoReal)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Metadata & Extract Prompt */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[11px]">
                      <div>
                        <span className="text-slate-300 block text-[10px]">Titular</span>
                        <span className="font-semibold text-white">{w.titular || w.activo}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-emerald-200 group-hover:translate-x-1 transition-transform">
                        <span>Ver extracto</span>
                        <i className="ri-arrow-right-line text-xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table List of Digital Wallets */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Detalle de Billeteras Digitales</h3>
                <p className="text-xs text-muted-foreground">Monitoreo de saldos contables, balances en cadena y enlaces a Tronscan</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Billetera / Activo</th>
                    <th className="py-3 px-4">Red</th>
                    <th className="py-3 px-4">Dirección Pública (Tronscan)</th>
                    <th className="py-3 px-4 text-right">Saldo Contable (USDT)</th>
                    <th className="py-3 px-4 text-right">Saldo Real (USDT)</th>
                    <th className="py-3 px-4 text-right">Tasa / Rate</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                    <CreatedByHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {<PaginatedRows columns={7} rows={wallets}>{(w: any) => {
                    const saldoReal = w.saldoReal ?? w.saldoUsdt ?? 0;
                    return (
                      <tr
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-bold text-foreground">
                          {w.activo}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {w.red || 'TRC20'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={getTronscanUrl(w.wallet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                            title="Abrir balance en Tronscan"
                          >
                            <span>{w.wallet || '—'}</span>
                            <i className="ri-external-link-line text-xs" />
                          </a>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatUSD(w.saldoUsdt || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-cyan-500">
                          {formatUSD(saldoReal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          ${formatRate(w.rateFinal || 3200)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWalletId(w.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Extracto</span>
                            <i className="ri-arrow-right-line" />
                          </button>
                        </td>
                        <CreatedByCell name={w.createdByName} />
                      </tr>
                    );
                  }}</PaginatedRows>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
