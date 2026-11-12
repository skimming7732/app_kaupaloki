import { useNavigate, useParams } from 'react-router-dom';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import { AssetCatalogButton } from '../components/modals/AssetCatalogButton';
import { AssetInstitutionLogo } from '../components/common/InstitutionLogo';
import { formatJurisdiction } from '../utils/countryJurisdiction';
import { getInstitutionCardGradient } from '../utils/institutionGradient';
import { AssetCardsFilterBar, type InstitutionOption } from '../components/common/AssetCardsFilterBar';
import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';

export const ActivosLiquidosView: React.FC = () => {
  const { metrics, data } = useData();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { assetId: selectedActivoId } = useParams();
  const setSelectedActivoId = (id: string | null) => navigate(id ? '/activos-liquidos/' + encodeURIComponent(id) : '/activos-liquidos');

  const activos = data.activosLiquidos || [];

  // Statement (Extracto) mode and filters state
  const [balanceMode, setBalanceMode] = React.useState<'contable' | 'real'>('contable');
  const [movSearch, setMovSearch] = React.useState('');
  const [fechaDesde, setFechaDesde] = React.useState('');
  const [fechaHasta, setFechaHasta] = React.useState('');
  const [tipoFilter, setTipoFilter] = React.useState<'todos' | 'entradas' | 'salidas'>('todos');

  // Horizon Cards interactive filters (con saldo / sin saldo, multi-institución)
  const [cardSaldoFilter, setCardSaldoFilter] = useState<'todos' | 'con_saldo' | 'sin_saldo'>('todos');
  const [cardInstitutions, setCardInstitutions] = useState<string[]>([]);

  const institutionOptions = useMemo<InstitutionOption[]>(() => {
    const counts = new Map<string, { count: number; logoUrl?: string | null }>();
    for (const a of activos) {
      const name = a.institution?.name || a.institucion || 'Sin Institución';
      const prev = counts.get(name) || { count: 0, logoUrl: a.institution?.logo_url };
      counts.set(name, { count: prev.count + 1, logoUrl: a.institution?.logo_url || prev.logoUrl });
    }
    return Array.from(counts.entries())
      .map(([name, { count, logoUrl }]) => ({ name, count, logoUrl }))
      .sort((a, b) => b.count - a.count);
  }, [activos]);

  const conSaldoCount = useMemo(() => activos.filter((a: any) => (a.saldoCop || 0) > 0).length, [activos]);
  const sinSaldoCount = useMemo(() => activos.filter((a: any) => (a.saldoCop || 0) <= 0).length, [activos]);

  const filteredActivosCards = useMemo(() => {
    return activos.filter((a: any) => {
      const saldo = a.saldoCop || 0;
      if (cardSaldoFilter === 'con_saldo' && saldo <= 0) return false;
      if (cardSaldoFilter === 'sin_saldo' && saldo > 0) return false;
      if (cardInstitutions.length > 0) {
        const instName = a.institution?.name || a.institucion;
        if (!cardInstitutions.includes(instName)) return false;
      }
      return true;
    });
  }, [activos, cardSaldoFilter, cardInstitutions]);

  const selectedActivo = useMemo(() => {
    if (!selectedActivoId) return null;
    return activos.find((a: any) => a.id === selectedActivoId) || null;
  }, [activos, selectedActivoId]);

  // Filtered movements for statement with filters BEFORE table
  const filteredMovimientos = useMemo(() => {
    const movs = selectedActivo?.movimientos || [];
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
  }, [selectedActivo?.movimientos, movSearch, fechaDesde, fechaHasta, tipoFilter]);

  const totalIngresos = useMemo(() => {
    return activos.reduce((acc: number, a: any) => acc + (a.ingresosCop || 0), 0);
  }, [activos]);

  const totalEgresos = useMemo(() => {
    return activos.reduce((acc: number, a: any) => acc + (a.egresosCop || 0), 0);
  }, [activos]);

  const handleExportCSV = (activo: any) => {
    const movements = activo.movimientos || [];
    const headers = ['Fecha', 'Origen', 'Concepto', 'Monto COP', 'Balance COP', 'Creado por'];
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
    link.setAttribute('download', `extracto-${activo.activo.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Card background gradients matching Horizon UI (vibrant in light theme, deep in dark theme)
  const getCardGradient = (index: number) => {
    const lightGradients = [
      'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', // Vibrant Sapphire Blue
      'linear-gradient(135deg, #059669 0%, #047857 100%)', // Vibrant Emerald
      'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Vibrant Royal Violet
      'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)', // Vibrant Warm Amber
    ];
    const darkGradients = [
      'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', // Deep Navy
      'linear-gradient(135deg, #065f46 0%, #022c22 100%)', // Emerald Green
      'linear-gradient(135deg, #581c87 0%, #1e1b4b 100%)', // Royal Purple
      'linear-gradient(135deg, #7c2d12 0%, #27272a 100%)', // Warm Amber
    ];
    return isDark ? darkGradients[index % darkGradients.length] : lightGradients[index % lightGradients.length];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ============================================================== */}
      {/* VISTA DETALLE: EXTRACTO BANCARIO DE LA INSTITUCIÓN SELECCIONADA */}
      {/* ============================================================== */}
      {selectedActivo ? (
        <div className="space-y-6">
          {/* Top Bar with Back Button and Export Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedActivoId(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span>Volver a Instituciones</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AssetInstitutionLogo institution={selectedActivo.institution} name={selectedActivo.institucion} sizeClass="size-6" />
                  <span className="truncate" title={selectedActivo.activo}>Extracto: {selectedActivo.activo}</span>
                  <span className="max-w-24 shrink-0 truncate text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {selectedActivo.institucion}
                  </span>
                  {(() => {
                    const jur = formatJurisdiction(selectedActivo.pais);
                    return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-foreground">
                        <span className="text-sm leading-none">{jur.flag}</span>
                        <span>{jur.name}</span>
                      </span>
                    );
                  })()}
                </h2>
                <p className="text-xs text-muted-foreground">Historial de movimientos y saldo en custodia institucional</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AssetCatalogButton table="activos_liquidos" asset={selectedActivo} allowDelete={false}
                buttonClassName="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90" />
              <button
                type="button"
                onClick={() => handleExportCSV(selectedActivo)}
                className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs text-foreground flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <i className="ri-download-2-line text-sm text-primary" />
                <span>Exportar Extracto (CSV)</span>
              </button>
            </div>
          </div>

          {/* Master Horizon Bank Statement Card */}
          <div
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #4318FF 0%, #2563EB 50%, #1D4ED8 100%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(67, 24, 255, 0.25)',
            }}
            className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
          >
            <div className="absolute right-[-40px] top-[-40px] w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

            {/* Mode Switch: Contable vs Real */}
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
                {((selectedActivo.institucion || '').toUpperCase() === 'EFECTIVO' || (selectedActivo.activo || '').toUpperCase().includes('EFECTIVO')) ? (
                  <span className="px-3 py-1.5 text-xs text-slate-400/80 italic flex items-center gap-1">
                    <i className="ri-information-line text-xs" />
                    <span>Efectivo físico (no aplica API)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal)) {
                        setBalanceMode('real');
                      }
                    }}
                    disabled={selectedActivo.saldoReal === null || selectedActivo.saldoReal === undefined || !Number.isFinite(selectedActivo.saldoReal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      (selectedActivo.saldoReal === null || selectedActivo.saldoReal === undefined || !Number.isFinite(selectedActivo.saldoReal))
                        ? 'opacity-40 cursor-not-allowed text-white/50'
                        : balanceMode === 'real'
                        ? 'bg-emerald-400 text-slate-950 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                    title={
                      selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal)
                        ? 'Ver saldo real reportado'
                        : 'Esta cuenta bancaria no tiene conexión API configurada'
                    }
                  >
                    <i className="ri-bank-line text-sm" />
                    <span>Saldo Real (Banco / API)</span>
                    {(selectedActivo.saldoReal === null || selectedActivo.saldoReal === undefined || !Number.isFinite(selectedActivo.saldoReal)) && (
                      <span className="text-[10px] ml-1 opacity-75">(Sin API)</span>
                    )}
                  </button>
                )}
              </div>

              {/* Real-time sync badge / discrepancy watch */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs">
                {balanceMode === 'contable' ? (
                  <>
                    <span className="text-slate-300">Saldo Real Banco / API:</span>
                    {((selectedActivo.institucion || '').toUpperCase() === 'EFECTIVO' || (selectedActivo.activo || '').toUpperCase().includes('EFECTIVO')) ? (
                      <span className="text-slate-400 font-mono text-xs italic">No aplica (Efectivo)</span>
                    ) : (selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal)) ? (
                      <strong className="font-mono text-emerald-300">{formatCOP(selectedActivo.saldoReal)}</strong>
                    ) : (
                      <span className="text-slate-400 italic font-sans text-xs">Sin información</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-300">Saldo Contable Interno:</span>
                    <strong className="font-mono text-white">{formatCOP(selectedActivo.saldoCop)}</strong>
                  </>
                )}
              </div>
            </div>

            {/* Balances Row dynamically reacting to mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-white/10 relative z-10">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <i className={balanceMode === 'contable' ? "ri-wallet-3-line text-blue-400" : "ri-bank-line text-emerald-400"} />
                  <span>{balanceMode === 'contable' ? 'Saldo Contable Disponible' : 'Saldo Real Verificado en Banco / API'}</span>
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${balanceMode === 'contable' ? 'text-white' : 'text-emerald-300'}`}>
                  {balanceMode === 'contable'
                    ? formatCOP(selectedActivo.saldoCop)
                    : (selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal))
                    ? formatCOP(selectedActivo.saldoReal)
                    : <span className="text-2xl font-sans text-slate-300">
                        {((selectedActivo.institucion || '').toUpperCase() === 'EFECTIVO' || (selectedActivo.activo || '').toUpperCase().includes('EFECTIVO'))
                          ? 'No aplica en efectivo'
                          : 'Sin sincronización API'}
                      </span>}
                </div>
                <span className="text-xs text-slate-300/80 block mt-1">
                  {balanceMode === 'contable'
                    ? 'Libro mayor de tesorería y operaciones registradas'
                    : (selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal))
                    ? 'Fondos en custodia bancaria institucional reportados'
                    : 'Esta entidad no cuenta con integración API para lectura en tiempo real'}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                  <i className="ri-scales-line text-amber-300" />
                  <span>{balanceMode === 'contable' ? 'Referencia Saldo Real' : 'Referencia Saldo Contable'}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-200">
                  {balanceMode === 'contable'
                    ? (selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal))
                      ? formatCOP(selectedActivo.saldoReal)
                      : '—'
                    : formatCOP(selectedActivo.saldoCop)}
                </div>
                <span className="text-xs text-slate-300/70 block mt-1 flex items-center gap-1.5">
                  {(selectedActivo.saldoReal !== null && selectedActivo.saldoReal !== undefined && Number.isFinite(selectedActivo.saldoReal)) ? (
                    <>
                      <i className="ri-checkbox-circle-fill text-emerald-400" />
                      <span>
                        {Math.abs(selectedActivo.saldoReal - selectedActivo.saldoCop) === 0
                          ? 'Sin descuadres (Diferencia: $0 COP)'
                          : `Diferencia: ${formatCOP(selectedActivo.saldoReal - selectedActivo.saldoCop)}`}
                      </span>
                    </>
                  ) : (
                    <span className="italic text-slate-400">
                      {((selectedActivo.institucion || '').toUpperCase() === 'EFECTIVO' || (selectedActivo.activo || '').toUpperCase().includes('EFECTIVO'))
                        ? 'Caja en efectivo física no posee API'
                        : 'Sin datos de API bancaria para auditar descuadre'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Account Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-6 relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Titular
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white truncate block">
                  {selectedActivo.titular || selectedActivo.empresa || selectedActivo.activo}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Institución
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white uppercase truncate block">
                  {selectedActivo.institucion}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Jurisdicción
                </span>
                <span className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <span className="text-base leading-none">{formatJurisdiction(selectedActivo.pais).flag}</span>
                  <span>{formatJurisdiction(selectedActivo.pais).name}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Cuenta
                </span>
                <span className="text-xs sm:text-sm font-mono font-semibold text-slate-200 truncate block">
                  {selectedActivo.cuenta || 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tarifas
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-emerald-300 border border-white/10">
                  {selectedActivo.tarifas || 'EXENTO DE FEE'}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/50" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Historial de Movimientos
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {formatNumber(filteredMovimientos.length)} de {formatNumber((selectedActivo.movimientos || []).length)} registros
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
                    placeholder="Buscar por concepto o referencia..."
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
                    <th className="py-3 px-4">Origen</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-right">Balance</th>
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
                            {m.concepto || 'Movimiento'}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isPositive ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {isPositive ? `+${formatCOP(m.monto)}` : formatCOP(m.monto)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                            {formatCOP(m.balance)}
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
              <h1 className="text-xl font-bold text-foreground">Activos Líquidos</h1>
              <p className="text-xs text-muted-foreground">Gestión de cuentas bancarias operativas y efectivo en custodia.</p>
            </div>
            <AssetCatalogButton table="activos_liquidos" />
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
                <i className="ri-safe-2-line text-indigo-400" />
                <span>Tesorería y Liquidez Consolidada</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {formatCOP(metrics.totalActivosLiquidos)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Dinero total disponible en cuentas operativas y efectivo (Haz clic en una tarjeta para ver su extracto)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Total Ingresos
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-emerald-400">
                  {formatCOP(totalIngresos)}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Total Egresos
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono text-rose-400">
                  {formatCOP(totalEgresos)}
                </span>
              </div>
            </div>
          </div>

          {/* GRID TIPO TARJETAS (HORIZON UI BANK CARDS) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <i className="ri-bank-card-line text-sm" />
                <span>Instituciones y Cuentas Operativas</span>
              </h3>
            </div>

            <AssetCardsFilterBar
              saldoFilter={cardSaldoFilter}
              setSaldoFilter={setCardSaldoFilter}
              selectedInstitutions={cardInstitutions}
              setSelectedInstitutions={setCardInstitutions}
              institutionOptions={institutionOptions}
              totalCount={activos.length}
              conSaldoCount={conSaldoCount}
              sinSaldoCount={sinSaldoCount}
              filteredCount={filteredActivosCards.length}
              itemLabel="cuentas"
            />

            {filteredActivosCards.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <i className="ri-filter-off-line text-2xl text-muted-foreground mb-1 block" />
                <p className="text-xs text-muted-foreground">No hay cuentas que coincidan con los filtros seleccionados.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCardSaldoFilter('todos');
                    setCardInstitutions([]);
                  }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredActivosCards.map((a: any, idx: number) => {
                  const bgGradient = getInstitutionCardGradient({
                    color: a.institution?.color,
                    institutionName: a.institution?.name || a.institucion,
                    fallbackIndex: idx,
                    isDark,
                  });

                  return (
                    <div
                      key={a.id}
                      onClick={() => setSelectedActivoId(a.id)}
                      style={{ background: bgGradient }}
                      className="relative rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[210px] overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl group select-none border border-white/10"
                    >
                    <div className="absolute right-[-20px] top-[-20px] w-36 h-36 rounded-full bg-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                    {/* Top Row: Institution badge & Currency */}
                    <div className="flex justify-between items-start gap-2 relative z-10">
                      <div className="flex min-w-0 items-center gap-2">
                        <AssetInstitutionLogo institution={a.institution} name={a.institucion} sizeClass="size-8" />
                        <div className="min-w-0">
                          <span className="block truncate text-[10px] font-extrabold uppercase tracking-wider text-white/80">{a.institution?.name || a.institucion}</span>
                          <h4 title={a.activo} className="truncate text-base font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors">{a.activo}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const jur = formatJurisdiction(a.pais);
                          return (
                            <span className="text-[11px] font-medium text-white/95 bg-black/25 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title={`Jurisdicción: ${jur.name}`}>
                              <span className="text-sm leading-none">{jur.flag}</span>
                              <span className="truncate max-w-[85px]">{jur.name}</span>
                            </span>
                          );
                        })()}
                        <span className="text-[11px] font-mono font-bold text-white/80 bg-black/20 px-2 py-0.5 rounded">
                          COP
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Balances */}
                    <div className="my-4 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-0.5">
                        Saldo Disponible
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                        {formatCOP(a.saldoCop)}
                      </div>
                    </div>

                    {/* Bottom Row: Metadata & Extract Prompt */}
                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 relative z-10 text-[11px]">
                      <div>
                        <span className="text-slate-300 block text-[10px]">Cuenta</span>
                        <span className="font-mono font-semibold text-white">{a.cuenta || 'Principal'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div onClick={(event) => event.stopPropagation()}>
                          <AssetCatalogButton table="activos_liquidos" asset={a} allowDelete={false}
                            buttonClassName="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 font-semibold text-white hover:bg-white/20" />
                        </div>
                        <span className="flex items-center gap-1 font-semibold text-indigo-200">
                          Ver extracto <i className="ri-arrow-right-line text-xs" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Table List of Instituciones */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Detalle de Instituciones</h3>
                <p className="text-xs text-muted-foreground">Listado de balances y acceso directo a movimientos</p>
              </div>
              <AssetCatalogButton table="activos_liquidos" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Institución</th>
                    <th className="py-3 px-4">Activo / Cuenta</th>
                    <th className="py-3 px-4">Jurisdicción</th>
                    <th className="py-3 px-4">Titular</th>
                    <th className="py-3 px-4 text-right">Ingresos</th>
                    <th className="py-3 px-4 text-right">Egresos</th>
                    <th className="py-3 px-4 text-right">Saldo Disponible</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                    <CreatedByHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {<PaginatedRows columns={9} rows={activos}>{(a: any) => {
                    const jur = formatJurisdiction(a.pais);
                    return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedActivoId(a.id)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-foreground uppercase">
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <AssetInstitutionLogo institution={a.institution} name={a.institucion} sizeClass="size-5" />
                          {a.institution?.name || a.institucion}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {a.activo}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted/60 text-foreground border border-border whitespace-nowrap">
                          <span className="text-sm leading-none">{jur.flag}</span>
                          <span>{jur.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {a.titular || a.empresa}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-500 font-semibold">
                        {formatCOP(a.ingresosCop || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-500 font-semibold">
                        {formatCOP(a.egresosCop || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {formatCOP(a.saldoCop || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedActivoId(a.id)}
                            className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Extracto</span>
                            <i className="ri-arrow-right-line" />
                          </button>
                          <AssetCatalogButton table="activos_liquidos" asset={a} allowDelete />
                        </div>
                      </td>
                      <CreatedByCell name={a.createdByName} />
                    </tr>
                  );}}</PaginatedRows>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
