import { useNavigate, useParams } from 'react-router-dom';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { AssetCatalogButton } from '../components/modals/AssetCatalogButton';
import { InstitutionLogo } from '../components/common/InstitutionLogo';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { isAuditorRole } from '../utils/roles';
import { isTronAddress, isTronNetwork } from '../utils/tronUsdtBalance';
import { isPolygonAddress, isPolygonNetwork } from '../utils/polygonUsdtBalance';
import { useTronUsdtBalances } from '../hooks/useTronUsdtBalances';
import { formatCOP, formatNumber, formatRate, formatUSD, formatDate } from '../utils/formatters';
import { formatJurisdiction } from '../utils/countryJurisdiction';
import { JurisdictionFlag } from '../components/common/JurisdictionFlag';
import { getInstitutionCardGradient } from '../utils/institutionGradient';
import { AssetCardsFilterBar, type InstitutionOption, type CountryOption } from '../components/common/AssetCardsFilterBar';

export const ActivosDigitalesView: React.FC = () => {
  const { data, metrics, loading: dataLoading, marcarCompraRecibida } = useData();
  const { theme, profile } = useAuth();
  const canWrite = !isAuditorRole(profile?.role);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { assetId: selectedWalletId } = useParams();
  const setSelectedWalletId = (id: string | null) => navigate(id ? '/activos-digitales/' + encodeURIComponent(id) : '/activos-digitales');

  const recordedWallets = data.activosDigitales;
  const { balances: chainBalances, loading: isChainRefreshing, refresh: refreshBalances } = useTronUsdtBalances(
    recordedWallets.map((wallet) => ({ address: String(wallet.wallet || ''), red: wallet.red })),
  );

  const wallets = useMemo(() => recordedWallets.map((wallet) => {
    const rawAddr = String(wallet.wallet || '').trim();
    const addrKey = isPolygonNetwork(wallet.red) ? rawAddr.toLowerCase() : rawAddr;
    return {
      ...wallet,
      saldoReal: chainBalances[addrKey] ?? null,
    };
  }), [recordedWallets, chainBalances]);

  const [receivingId, setReceivingId] = useState<string | null>(null);

  // Statement (Extracto) mode and filters state
  const [balanceMode, setBalanceMode] = React.useState<'contable' | 'real'>('contable');
  const [movSearch, setMovSearch] = React.useState('');
  const [fechaDesde, setFechaDesde] = React.useState('');
  const [fechaHasta, setFechaHasta] = React.useState('');
  const [tipoFilter, setTipoFilter] = React.useState<'todos' | 'entradas' | 'salidas'>('todos');

  // Horizon Cards interactive filters (con saldo / sin saldo, multi-institución, jurisdicción)
  const [cardSaldoFilter, setCardSaldoFilter] = React.useState<'todos' | 'con_saldo' | 'sin_saldo'>('todos');
  const [cardInstitutions, setCardInstitutions] = React.useState<string[]>([]);
  const [cardCountries, setCardCountries] = React.useState<string[]>([]);

  const institutionOptions = useMemo<InstitutionOption[]>(() => {
    const counts = new Map<string, { count: number; logoUrl?: string | null }>();
    for (const w of wallets) {
      const name = w.institution?.name || (isPolygonNetwork(w.red) ? 'Polygon' : 'TronLink');
      const prev = counts.get(name) || { count: 0, logoUrl: w.institution?.logo_url };
      counts.set(name, { count: prev.count + 1, logoUrl: w.institution?.logo_url || prev.logoUrl });
    }
    return Array.from(counts.entries())
      .map(([name, { count, logoUrl }]) => ({ name, count, logoUrl, icon: 'ri-wallet-3-line' }))
      .sort((a, b) => b.count - a.count);
  }, [wallets]);

  const countryOptions = useMemo<CountryOption[]>(() => {
    const counts = new Map<string, { count: number; flag: string; flagUrl?: string }>();
    for (const w of wallets) {
      const jur = formatJurisdiction(w.pais);
      const prev = counts.get(jur.name) || { count: 0, flag: jur.flag, flagUrl: jur.flagUrl };
      counts.set(jur.name, { count: prev.count + 1, flag: jur.flag, flagUrl: jur.flagUrl });
    }
    return Array.from(counts.entries())
      .map(([name, { count, flag, flagUrl }]) => ({ name, flag, flagUrl, count }))
      .sort((a, b) => b.count - a.count);
  }, [wallets]);

  const conSaldoCount = useMemo(() => wallets.filter((w: any) => (w.saldoUsdt || 0) > 0 || (w.saldoReal || 0) > 0).length, [wallets]);
  const sinSaldoCount = useMemo(() => wallets.filter((w: any) => (w.saldoUsdt || 0) <= 0 && (!w.saldoReal || w.saldoReal <= 0)).length, [wallets]);

  const filteredWalletsCards = useMemo(() => {
    return wallets
      .filter((w: any) => {
        const hasBalance = (w.saldoUsdt || 0) > 0 || (w.saldoReal || 0) > 0;
        if (cardSaldoFilter === 'con_saldo' && !hasBalance) return false;
        if (cardSaldoFilter === 'sin_saldo' && hasBalance) return false;
        if (cardInstitutions.length > 0) {
          const instName = w.institution?.name || (isPolygonNetwork(w.red) ? 'Polygon' : 'TronLink');
          if (!cardInstitutions.includes(instName)) return false;
        }
        if (cardCountries.length > 0) {
          const jur = formatJurisdiction(w.pais);
          if (!cardCountries.includes(jur.name)) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => (b.saldoUsdt || 0) - (a.saldoUsdt || 0));
  }, [wallets, cardSaldoFilter, cardInstitutions, cardCountries]);

  const isFilterActive = cardSaldoFilter !== 'todos' || cardInstitutions.length > 0 || cardCountries.length > 0;

  const filteredDigitalTotals = useMemo(() => {
    return filteredWalletsCards.reduce(
      (acc: { contableUsdt: number; realUsdt: number; copTotal: number }, w: any) => {
        const contable = w.saldoUsdt || 0;
        const real = (w.saldoReal !== null && w.saldoReal !== undefined && Number.isFinite(w.saldoReal)) ? w.saldoReal : contable;
        const rate = w.rateFinal || 3950;
        return {
          contableUsdt: acc.contableUsdt + contable,
          realUsdt: acc.realUsdt + real,
          copTotal: acc.copTotal + (contable * rate),
        };
      },
      { contableUsdt: 0, realUsdt: 0, copTotal: 0 }
    );
  }, [filteredWalletsCards]);

  const selectedWallet = useMemo(() => {
    if (!selectedWalletId) return null;
    return wallets.find((w: any) => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  const selectedAddress = String(selectedWallet?.wallet || '').trim();
  const isPolygon = isPolygonNetwork(selectedWallet?.red);
  const isTron = isTronNetwork(selectedWallet?.red) || !isPolygon;
  const isChainSupported = (isPolygon && isPolygonAddress(selectedAddress)) || (isTron && isTronAddress(selectedAddress));
  const chainAddrKey = isPolygon ? selectedAddress.toLowerCase() : selectedAddress;
  const chainLoading = isChainRefreshing || (isChainSupported && chainBalances[chainAddrKey] === undefined);
  const networkName = isPolygon ? 'Polygon' : 'TRON';
  const chainMessage = chainLoading ? `Consultando ${networkName}…`
    : !selectedAddress ? 'Sin dirección registrada'
    : !isChainSupported ? `Dirección ${networkName} no válida`
    : `No se pudo consultar ${networkName}`;

  // Filtered movements for statement with filters BEFORE table
  const filteredMovimientos = useMemo(() => {
    const movs = selectedWallet?.movimientos || [];
    return movs.filter((m: any) => {
      const matchSearch = !movSearch ||
        (m.concepto && m.concepto.toLowerCase().includes(movSearch.toLowerCase())) ||
        (m.origen && m.origen.toLowerCase().includes(movSearch.toLowerCase())) ||
        (m.createdByName && m.createdByName.toLowerCase().includes(movSearch.toLowerCase()));
      const matchFecha = matchesDateRange(m.fecha, fechaDesde, fechaHasta);
      const matchTipo =
        tipoFilter === 'todos' ||
        (tipoFilter === 'entradas' && (m.monto || 0) > 0) ||
        (tipoFilter === 'salidas' && (m.monto || 0) < 0);
      return matchSearch && matchFecha && matchTipo;
    });
  }, [selectedWallet?.movimientos, movSearch, fechaDesde, fechaHasta, tipoFilter]);

  const { totalIngresos, totalEgresos } = useMemo(() => {
    let totalIngresos = 0;
    let totalEgresos = 0;
    for (const wallet of recordedWallets) {
      for (const movement of wallet.movimientos ?? []) {
        const amount = Number(movement.monto);
        if (!Number.isFinite(amount)) continue;
        if (amount > 0) totalIngresos += amount;
        else totalEgresos -= amount;
      }
    }
    return { totalIngresos, totalEgresos };
  }, [recordedWallets]);

  const totalSaldoUsdt = useMemo(() => {
    const sum = wallets.reduce((acc, w) => acc + (Number(w.saldoUsdt) || 0), 0);
    return sum || metrics?.totalActivosDigitales || 0;
  }, [wallets, metrics?.totalActivosDigitales]);

  const totalEnTransitoWallet = useMemo(() => {
    return (selectedWallet?.movimientos || [])
      .filter((m: any) => m.esPendiente && (m.monto || 0) > 0)
      .reduce((sum: number, m: any) => sum + (Number(m.monto) || 0), 0);
  }, [selectedWallet?.movimientos]);


  const handleMarcarCompra = async (m: any) => {
    const idOriginal = m.idOriginal;
    if (!idOriginal) return;
    if (!window.confirm(`¿Confirmas que los ${formatNumber(m.monto, 2, 6)} USDT de la compra ${m.origen} ya fueron recibidos en esta billetera?`)) {
      return;
    }
    setReceivingId(idOriginal);
    try {
      await marcarCompraRecibida(idOriginal);
    } catch (err: any) {
      alert(err?.message || 'No se pudo marcar la compra como recibida.');
    } finally {
      setReceivingId(null);
    }
  };

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

  const getExplorerUrl = (address: string, red?: string) => {
    const clean = address.trim();
    if (isPolygonNetwork(red)) {
      return `https://polygonscan.com/address/${encodeURIComponent(clean)}`;
    }
    return `https://tronscan.org/#/address/${encodeURIComponent(clean)}`;
  };

  const getTronscanUrl = (address: string) => {
    return getExplorerUrl(address, 'TRC20');
  };

  const formatShortWallet = (address: string) => {
    if (!address) return '—';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Card background gradients for crypto wallets (vibrant in light theme, deep in dark theme)
  const getCardGradient = (index: number, red?: string) => {
    if (isPolygonNetwork(red)) {
      return isDark
        ? 'linear-gradient(135deg, #5b21b6 0%, #2e1065 100%)'
        : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
    }
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

  if (selectedWalletId && dataLoading && recordedWallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-8 space-y-3 rounded-2xl border border-border bg-card">
        <i className="ri-loader-4-line text-3xl text-primary animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground">Cargando datos de la billetera digital...</p>
      </div>
    );
  }

  if (selectedWalletId && !dataLoading && recordedWallets.length > 0 && !selectedWallet) {
    return (
      <div className="p-8 text-center space-y-4 rounded-2xl border border-border bg-card">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center text-2xl">
          <i className="ri-error-warning-line" />
        </div>
        <h2 className="text-base font-bold text-foreground">Billetera no encontrada</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          No se encontró ninguna billetera digital registrada con el identificador <code className="font-mono text-primary bg-muted px-1.5 py-0.5 rounded">{selectedWalletId}</code>.
        </p>
        <button
          type="button"
          onClick={() => setSelectedWalletId(null)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm"
        >
          <i className="ri-arrow-left-line" />
          <span>Volver a Activos Digitales</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============================================================== */}
      {/* VISTA DETALLE: EXTRACTO DE LA BILLETERA CRIPTO SELECCIONADA    */}
      {/* ============================================================== */}
      {selectedWallet ? (
        <div className="space-y-6">
          {/* Top Bar with Back Button and Export Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWalletId(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span>Volver a Billeteras</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <InstitutionLogo name={selectedWallet.institution?.name || 'Institución sin vincular'} logoUrl={selectedWallet.institution?.logo_url}
                    fallbackIcon="ri-wallet-3-line" sizeClass="size-6" />
                  <span className="truncate" title={selectedWallet.activo}>Extracto: {selectedWallet.activo}</span>
                  <span className={`max-w-32 shrink-0 truncate text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    isPolygon
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}>
                    {isPolygon ? 'Polygon (PoS)' : (selectedWallet.red || 'TRON (TRC20)')}
                  </span>
                  {(() => {
                    const jur = formatJurisdiction(selectedWallet.pais);
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                        <JurisdictionFlag countryName={selectedWallet.pais} />
                        <span>{jur.name}</span>
                      </span>
                    );
                  })()}
                </h2>
                <p className="text-xs text-muted-foreground">Movimientos en cadena, saldo contable y saldo real auditado</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AssetCatalogButton table="activos_digitales" asset={selectedWallet} />
              {isChainSupported && (
                <a href={getExplorerUrl(selectedAddress, selectedWallet.red)} target="_blank" rel="noopener noreferrer"
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                    isPolygon
                      ? 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/30 text-purple-600 dark:text-purple-400'
                      : 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-600/30 text-emerald-600'
                  }`}>
                  <i className="ri-external-link-line text-sm" />
                  <span>{isPolygon ? 'Ver en Polygonscan' : 'Ver en Tronscan'}</span>
                </a>
              )}
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
              background: getInstitutionCardGradient({
                color: selectedWallet.institution?.color,
                institutionName: selectedWallet.institution?.name || (isPolygon ? 'Polygon' : (selectedWallet.red || 'TRON')),
                network: selectedWallet.red,
                fallbackIndex: 0,
                isDark,
              }),
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
            className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute right-[-40px] top-[-40px] w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

            {/* Mode Switch: Contable vs Real Blockchain */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-black/25 backdrop-blur-md border border-white/10">
                <button
                  type="button"
                  onClick={() => setBalanceMode('contable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    balanceMode === 'contable'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  <i className="ri-booklet-line text-sm" />
                  <span>Saldo Contable</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hasReal = selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal);
                    if (hasReal) setBalanceMode('real');
                  }}
                  disabled={selectedWallet.saldoReal === null || selectedWallet.saldoReal === undefined || !Number.isFinite(selectedWallet.saldoReal)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    (selectedWallet.saldoReal === null || selectedWallet.saldoReal === undefined || !Number.isFinite(selectedWallet.saldoReal))
                      ? 'opacity-40 cursor-not-allowed text-white/50'
                      : balanceMode === 'real'
                      ? 'bg-cyan-400 text-slate-950 shadow-sm'
                      : 'text-white/80 hover:text-white'
                  }`}
                  title={
                    selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal)
                      ? 'Ver saldo en cadena'
                      : chainMessage
                  }
                >
                  <i className="ri-shield-check-line text-sm" />
                  <span>Saldo real en {networkName}</span>
                  {(selectedWallet.saldoReal === null || selectedWallet.saldoReal === undefined || !Number.isFinite(selectedWallet.saldoReal)) && (
                    <span className="text-[10px] ml-1 opacity-75">({chainMessage})</span>
                  )}
                </button>
              </div>

              {isChainSupported && (
                <button type="button" disabled={chainLoading} onClick={refreshBalances}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50">
                  <i className={chainLoading ? "ri-loader-4-line animate-spin" : "ri-refresh-line"} aria-hidden="true" />
                  <span>{chainLoading ? 'Consultando en cadena...' : `Actualizar saldo ${networkName}`}</span>
                </button>
              )}

              {/* Reference compare badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
                {balanceMode === 'contable' ? (
                  <>
                    <span className="text-slate-300">Saldo Real On-Chain:</span>
                    {selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal) ? (
                      <strong className="font-mono text-cyan-300">{formatUSD(selectedWallet.saldoReal)}</strong>
                    ) : (
                      <span role="status" className="text-slate-200 text-xs">{chainMessage}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-300">Saldo Contable Interno:</span>
                    <strong className="font-mono text-white">{formatUSD(selectedWallet.saldoUsdt || 0)}</strong>
                  </>
                )}
              </div>
            </div>

            {/* Balances Row dynamically reacting to mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-white/10 relative z-10">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1.5">
                  <i className={balanceMode === 'contable' ? "ri-coin-line text-emerald-400" : "ri-shield-check-line text-cyan-400"} />
                  <span>{balanceMode === 'contable' ? 'Saldo Contable USDT' : `Saldo Real Blockchain (${networkName})`}</span>
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${balanceMode === 'contable' ? 'text-white' : 'text-cyan-300'}`}>
                  {balanceMode === 'contable'
                    ? formatUSD(selectedWallet.saldoUsdt || 0)
                    : (selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal))
                    ? formatUSD(selectedWallet.saldoReal)
                    : <span className="text-2xl font-sans text-slate-400">{chainMessage}</span>}
                </div>
                <span className="text-xs text-emerald-200/70 block mt-1">
                  {balanceMode === 'contable'
                    ? 'Registrado en contabilidad interna Kaupaloki'
                    : (selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal))
                    ? `USDT confirmado en la red ${networkName}`
                    : chainMessage}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <i className="ri-scales-line text-amber-300" />
                  <span>{balanceMode === 'contable' ? 'Referencia Saldo Real' : 'Referencia Saldo Contable'}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-200">
                  {balanceMode === 'contable'
                    ? (selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal))
                      ? formatUSD(selectedWallet.saldoReal)
                      : '—'
                    : formatUSD(selectedWallet.saldoUsdt || 0)}
                </div>
                <span className="text-xs text-slate-300/80 block mt-1 flex items-center gap-1.5">
                  {(selectedWallet.saldoReal !== null && selectedWallet.saldoReal !== undefined && Number.isFinite(selectedWallet.saldoReal)) ? (
                    <>
                      <i className="ri-checkbox-circle-fill text-emerald-400" />
                      <span>
                        {Math.abs(selectedWallet.saldoReal - (selectedWallet.saldoUsdt || 0)) === 0
                          ? 'Sin descuadre (Diferencia: $0.00 USDT)'
                          : `Diferencia: ${formatUSD(selectedWallet.saldoReal - (selectedWallet.saldoUsdt || 0))}`}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">{chainMessage}</span>
                  )}
                </span>
              </div>

              {totalEnTransitoWallet > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                    <i className="ri-time-line text-amber-300" />
                    <span>Por Recibir (En Tránsito)</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-amber-300 animate-pulse">
                    {formatUSD(totalEnTransitoWallet)}
                  </div>
                  <span className="text-xs text-amber-200/80 block mt-1">
                    Fondos en camino (no suman al saldo contable disponible)
                  </span>
                </div>
              )}
            </div>

            {/* Wallet Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-6 relative z-10">
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
                  Jurisdicción
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <JurisdictionFlag countryName={selectedWallet.pais} className="w-4 h-3 rounded-xs object-cover shrink-0 shadow-xs" />
                  <span>{formatJurisdiction(selectedWallet.pais).name}</span>
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
                  Dirección pública
                </span>
                {isChainSupported ? (
                  <a href={getExplorerUrl(selectedAddress, selectedWallet.red)} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono font-semibold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1"
                    title={isPolygon ? "Abrir balances en Polygonscan" : "Abrir balances en Tronscan"}>
                    <span className="truncate">{selectedAddress}</span>
                    <i className="ri-external-link-line text-xs shrink-0" />
                  </a>
                ) : <span className="block truncate text-xs font-mono text-white">{selectedAddress || '—'}</span>}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70 block mb-1">
                  Tarifas de Red
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-emerald-300 border border-white/10">
                  {selectedWallet.tarifas || '—'}
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
                {formatNumber(filteredMovimientos.length)} de {formatNumber((selectedWallet.movimientos || []).length)} registros
              </span>
            </div>

            {/* Filter Toolbar placed strictly BEFORE the table */}
            <div className="p-3.5 bg-muted/20 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                  <input
                    type="text"
                    value={movSearch}
                    onChange={(e) => setMovSearch(e.target.value)}
                    placeholder="Buscar por concepto o hash..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                {/* Date range filter */}
                <div className="flex items-center gap-2">
                  <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
                </div>
              </div>

              {/* Type filter tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setTipoFilter('todos')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${tipoFilter === 'todos' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFilter('entradas')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${tipoFilter === 'entradas' ? 'bg-card text-emerald-500 shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Ingresos (+)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFilter('salidas')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${tipoFilter === 'salidas' ? 'bg-card text-rose-500 shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Egresos (-)
                </button>
              </div>
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
                  {filteredMovimientos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No hay movimientos que coincidan con los filtros aplicados
                      </td>
                    </tr>
                  ) : (
                    <PaginatedRows columns={6} rows={filteredMovimientos}>{(m: any, idx: number) => {
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {m.esPendiente && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                                  <i className="ri-time-line text-[10px]" /> Por recibir
                                </span>
                              )}
                              <span>{m.concepto || 'Operación USDT'}</span>
                              {m.esPendiente && m.tipoOperacion === 'COMPRA_USDT' && canWrite && (
                                <button
                                  type="button"
                                  disabled={receivingId === m.idOriginal}
                                  onClick={() => handleMarcarCompra(m)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-xs ml-1 flex items-center gap-1"
                                  title="Confirmar recepción en billetera"
                                >
                                  <i className={receivingId === m.idOriginal ? "ri-loader-4-line animate-spin" : "ri-check-line"} />
                                  <span>Recibir</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isPositive ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {isPositive ? '+' : ''}{formatNumber(m.monto, 2, 6)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                            {formatNumber(m.balance, 2, 6)}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">Activos Digitales</h1>
              <p className="text-xs text-muted-foreground">Gestión de billeteras y movimientos en USDT.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={chainLoading}
                onClick={refreshBalances}
                title="Actualizar saldos reales de blockchain"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <i className={chainLoading ? "ri-loader-4-line animate-spin text-primary" : "ri-refresh-line text-muted-foreground"} />
                <span className="hidden sm:inline">Actualizar saldos en cadena</span>
              </button>
              <AssetCatalogButton table="activos_digitales" />
            </div>
          </div>

          {/* Consolidated Summary Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0b1437 0%, #1b254b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            className="rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-wrap justify-between items-center gap-4"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-1.5">
                <i className="ri-wallet-3-line text-indigo-400" />
                <span>Tesorería y Custodia Consolidada</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white flex items-baseline gap-2">
                <span>{formatUSD(totalSaldoUsdt)}</span>
                <span className="text-lg sm:text-xl font-bold text-slate-300">USDT</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Dinero total disponible en billeteras cripto (Haz clic en una tarjeta para ver su extracto)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Total Ingresos
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-400">
                  {formatNumber(totalIngresos, 2, 2)} USDT
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Total Egresos
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-rose-400">
                  {formatNumber(totalEgresos, 2, 2)} USDT
                </span>
              </div>
            </div>
          </div>

          {/* GRID TIPO TARJETAS (HORIZON UI CRYPTO WALLET CARDS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <i className="ri-wallet-3-line text-sm" />
                <span>Billeteras Cripto en Custodia</span>
              </h3>
            </div>

            <AssetCardsFilterBar
              saldoFilter={cardSaldoFilter}
              setSaldoFilter={setCardSaldoFilter}
              selectedInstitutions={cardInstitutions}
              setSelectedInstitutions={setCardInstitutions}
              institutionOptions={institutionOptions}
              selectedCountries={cardCountries}
              setSelectedCountries={setCardCountries}
              countryOptions={countryOptions}
              totalCount={wallets.length}
              conSaldoCount={conSaldoCount}
              sinSaldoCount={sinSaldoCount}
              filteredCount={filteredWalletsCards.length}
              itemLabel="billeteras"
            />

            {filteredWalletsCards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <i className="ri-filter-off-line text-2xl text-muted-foreground mb-1 block" />
                <p className="text-xs text-muted-foreground">No hay billeteras que coincidan con los filtros seleccionados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCardSaldoFilter('todos');
                    setCardInstitutions([]);
                    setCardCountries([]);
                  }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="asset-cards-grid">
                {filteredWalletsCards.map((w: any, idx: number) => {
                  const isPoly = isPolygonNetwork(w.red);
                  const bgGradient = getInstitutionCardGradient({
                    color: w.institution?.color,
                    institutionName: w.institution?.name || (isPoly ? 'Polygon' : (w.red || 'TRON')),
                    network: w.red,
                    fallbackIndex: idx,
                    isDark,
                  });
                  const address = String(w.wallet || '').trim();
                  const isTr = isTronNetwork(w.red) || !isPoly;
                  const validChain = (isPoly && isPolygonAddress(address)) || (isTr && isTronAddress(address));
                  const hasReal = w.saldoReal !== null && w.saldoReal !== undefined && Number.isFinite(w.saldoReal);
                  const expUrl = getExplorerUrl(address, w.red);

                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWalletId(w.id)}
                      style={{ background: bgGradient }}
                      className="asset-card relative rounded-3xl text-white shadow-lg flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-2xl group select-none border border-white/10"
                    >
                    <div className="absolute right-[-20px] top-[-20px] w-36 h-36 rounded-full bg-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                    <div className="flex flex-wrap justify-between items-start gap-x-3 gap-y-2 relative z-10">
                      <div className="flex min-w-0 flex-1 basis-40 items-center gap-2">
                        <InstitutionLogo name={w.institution?.name || 'Institución sin vincular'} logoUrl={w.institution?.logo_url}
                            fallbackIcon="ri-wallet-3-line" sizeClass="size-8" />
                        <div className="min-w-0">
                          <span className="block truncate text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                            {w.institution?.name || (isPoly ? 'POLYGON' : (w.red || 'TRC20'))} - USDT
                          </span>
                          <h4 title={w.titular || w.activo} className="truncate text-base font-bold text-white tracking-tight group-hover:text-emerald-200 transition-colors">{w.titular || w.activo}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const jur = formatJurisdiction(w.pais);
                          return (
                            <span className="text-[11px] font-medium text-white/95 bg-black/25 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm" title={`Jurisdicción: ${jur.name}`}>
                              <JurisdictionFlag countryName={w.pais} className="w-4 h-2.5 rounded-xs object-cover shadow-xs inline-block shrink-0" />
                              <span className="truncate max-w-[95px]">{jur.name}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Middle Row: Saldo Contable & Saldo Real */}
                    <div className="asset-card-balances my-4 relative z-10">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 block mb-0.5">
                          Saldo Contable
                        </span>
                        <div className="asset-card-amount font-extrabold font-mono tracking-tight text-white">
                          {formatUSD(w.saldoUsdt || 0)}
                        </div>
                      </div>

                      <div className="asset-card-real min-w-0 flex flex-col justify-end">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-white/60 block mb-1">
                          Saldo Real
                        </span>
                        <div className="asset-card-real-amount text-sm font-semibold font-mono text-cyan-200/90 bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10 inline-flex items-center gap-1 shadow-xs">
                          {hasReal ? formatUSD(w.saldoReal) : <span className="text-white/40 font-sans text-xs font-normal">Sin sincronizar</span>}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Wallet Address & Minimal Extract Arrow */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 relative z-10 text-[11px]">
                      <div className="min-w-0 flex items-center gap-1.5">
                        <i className="ri-wallet-3-line text-xs text-white/60 shrink-0" />
                        {validChain && address ? (
                          <a
                            href={expUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 transition-colors truncate"
                            title={isPoly ? `Ver en Polygonscan: ${address}` : `Ver en Tronscan: ${address}`}
                          >
                            <span className="truncate">{formatShortWallet(address)}</span>
                            <i className="ri-external-link-line text-[10px] shrink-0" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-white/70 truncate" title={address || undefined}>
                            {address ? formatShortWallet(address) : 'Sin dirección'}
                          </span>
                        )}
                      </div>

                      <div
                        className="size-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 group-hover:text-white flex items-center justify-center transition-all group-hover:translate-x-0.5 border border-white/10 shrink-0 shadow-sm"
                        title="Ver extracto"
                      >
                        <i className="ri-arrow-right-line text-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* Sum of filtered cards when filter is active */}
            {isFilterActive && filteredWalletsCards.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-card border border-emerald-500/30 shadow-sm animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                    <i className="ri-calculator-line" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                        Suma Total Seleccionada
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {filteredWalletsCards.length} {filteredWalletsCards.length === 1 ? 'billetera' : 'billeteras'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Total acumulado de las billeteras filtradas por {cardInstitutions.length > 0 && cardCountries.length > 0 ? 'institución y jurisdicción' : cardInstitutions.length > 0 ? 'institución' : cardCountries.length > 0 ? 'jurisdicción' : 'saldo'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Saldo Contable (USDT)
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-500">
                      {formatUSD(filteredDigitalTotals.contableUsdt)}
                    </span>
                  </div>

                  <div className="border-l border-border pl-4 sm:pl-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Saldo Real Auditado
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-cyan-500">
                      {formatUSD(filteredDigitalTotals.realUsdt)}
                    </span>
                  </div>

                  <div className="border-l border-border pl-4 sm:pl-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Liquidez Estimada (COP)
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-foreground">
                      {formatCOP(filteredDigitalTotals.copTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table List of Digital Wallets */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Detalle de Billeteras Digitales</h3>
                <p className="text-xs text-muted-foreground">Monitoreo de saldos contables, balances en cadena y enlaces a exploradores blockchain (Tronscan / Polygonscan)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Titular de la Billetera</th>
                    <th className="py-3 px-4">Jurisdicción</th>
                    <th className="py-3 px-4">Red</th>
                    <th className="py-3 px-4">Dirección pública</th>
                    <th className="py-3 px-4 text-right">Saldo Contable (USDT)</th>
                    <th className="py-3 px-4 text-right">Saldo Real (USDT)</th>
                    <th className="py-3 px-4 text-right">Tasa / Rate</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                    <CreatedByHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {<PaginatedRows columns={9} rows={wallets}>{(w: any) => {
                    const address = String(w.wallet || '').trim();
                    const isPoly = isPolygonNetwork(w.red);
                    const isTr = isTronNetwork(w.red) || !isPoly;
                    const validChain = (isPoly && isPolygonAddress(address)) || (isTr && isTronAddress(address));
                    const expUrl = getExplorerUrl(address, w.red);
                    const hasReal = w.saldoReal !== null && w.saldoReal !== undefined && Number.isFinite(w.saldoReal);
                    const jur = formatJurisdiction(w.pais);
                    return (
                      <tr
                        key={w.id}
                        onClick={() => setSelectedWalletId(w.id)}
                        className="hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-bold text-foreground">
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            <InstitutionLogo name={w.institution?.name || 'Institución sin vincular'} logoUrl={w.institution?.logo_url}
                            fallbackIcon="ri-wallet-3-line" sizeClass="size-5" />
                            {w.titular || w.activo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-foreground border border-border whitespace-nowrap">
                            <JurisdictionFlag countryName={w.pais} />
                            <span>{jur.name}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPoly
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {isPoly ? 'POLYGON' : (w.red || 'TRC20')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {validChain ? (
                            <a href={expUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="font-mono text-xs text-primary hover:underline inline-flex items-center gap-1"
                              title={isPoly ? "Abrir balance en Polygonscan" : "Abrir balance en Tronscan"}>
                              <span>{address}</span>
                              <i className="ri-external-link-line text-xs" />
                            </a>
                          ) : <span className="font-mono text-xs text-muted-foreground">{address || '—'}</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatUSD(w.saldoUsdt || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-cyan-500">
                          {hasReal ? formatUSD(w.saldoReal) : <span className="text-muted-foreground/50 font-sans font-normal">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          ${formatRate(w.rateFinal || 3200)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedWalletId(w.id)}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Extracto</span>
                              <i className="ri-arrow-right-line" />
                            </button>
                            <AssetCatalogButton table="activos_digitales" asset={w} allowDelete />
                          </div>
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
