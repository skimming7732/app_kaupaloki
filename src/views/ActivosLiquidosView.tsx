import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { useAuth } from '../context/AuthContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const ActivosLiquidosView: React.FC = () => {
  const { metrics, data } = useAirtable();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [selectedActivoId, setSelectedActivoId] = useState<string | null>(null);

  const activos = data.activosLiquidos || [];

  const selectedActivo = useMemo(() => {
    if (!selectedActivoId) return null;
    return activos.find((a: any) => a.id === selectedActivoId) || null;
  }, [activos, selectedActivoId]);

  const totalIngresos = useMemo(() => {
    return activos.reduce((acc: number, a: any) => acc + (a.ingresosCop || 0), 0);
  }, [activos]);

  const totalEgresos = useMemo(() => {
    return activos.reduce((acc: number, a: any) => acc + (a.egresosCop || 0), 0);
  }, [activos]);

  const handleExportCSV = (activo: any) => {
    const movements = activo.movimientos || [];
    const headers = ['Fecha', 'Origen', 'Concepto', 'Monto COP', 'Balance COP'];
    const rows = movements.map((m: any) => [
      formatDate(m.fecha),
      m.origen || '',
      m.concepto || '',
      m.monto || 0,
      m.balance || 0,
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedActivoId(null)}
                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <i className="ri-arrow-left-line text-sm" />
                <span>Volver a Instituciones</span>
              </button>
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Extracto: {selectedActivo.activo}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {selectedActivo.institucion}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">Historial de movimientos y saldo en custodia institucional</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleExportCSV(selectedActivo)}
              className="px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted font-bold text-xs text-foreground flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <i className="ri-download-2-line text-sm text-primary" />
              <span>Exportar Extracto (CSV)</span>
            </button>
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

            {/* Balances Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/10 relative z-10">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <i className="ri-wallet-3-line text-emerald-400" />
                  <span>Saldo Disponible</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                  {formatCOP(selectedActivo.saldoCop)}
                </div>
                <span className="text-xs text-slate-400 block mt-1">Fondos operativos inmediatamente disponibles</span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                  <i className="ri-funds-box-line text-blue-400" />
                  <span>Saldo Total Consolidado</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-200">
                  {formatCOP(selectedActivo.saldoCop)}
                </div>
                <span className="text-xs text-slate-400 block mt-1">Balance contable auditado en moneda local</span>
              </div>
            </div>

            {/* Account Metadata Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 relative z-10">
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
                {(selectedActivo.movimientos || []).length} registros
              </span>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(!selectedActivo.movimientos || selectedActivo.movimientos.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No hay movimientos registrados para esta institución
                      </td>
                    </tr>
                  ) : (
                    selectedActivo.movimientos.map((m: any, idx: number) => {
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
                        </tr>
                      );
                    })
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <i className="ri-bank-card-line text-sm" />
                <span>Instituciones y Cuentas Operativas</span>
              </h3>
              <span className="text-xs text-muted-foreground">{activos.length} cuentas registradas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activos.map((a: any, idx: number) => {
                const bgGradient = getCardGradient(idx);

                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedActivoId(a.id)}
                    style={{ background: bgGradient }}
                    className="relative rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between min-h-[210px] overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl group select-none border border-white/10"
                  >
                    <div className="absolute right-[-20px] top-[-20px] w-36 h-36 rounded-full bg-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                    {/* Top Row: Institution badge & Currency */}
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-sm border border-white/20">
                          {a.institucion}
                        </span>
                        <h4 className="text-base font-bold text-white mt-2.5 tracking-tight group-hover:text-indigo-200 transition-colors">
                          {a.activo}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white/80 bg-black/20 px-2 py-0.5 rounded">
                        COP
                      </span>
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
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10 text-[11px]">
                      <div>
                        <span className="text-slate-300 block text-[10px]">Cuenta</span>
                        <span className="font-mono font-semibold text-white">{a.cuenta || 'Principal'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-indigo-200 group-hover:translate-x-1 transition-transform">
                        <span>Ver extracto</span>
                        <i className="ri-arrow-right-line text-xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table List of Instituciones */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Detalle de Instituciones</h3>
                <p className="text-xs text-muted-foreground">Listado de balances y acceso directo a movimientos</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Institución</th>
                    <th className="py-3 px-4">Activo / Cuenta</th>
                    <th className="py-3 px-4">Titular</th>
                    <th className="py-3 px-4 text-right">Ingresos</th>
                    <th className="py-3 px-4 text-right">Egresos</th>
                    <th className="py-3 px-4 text-right">Saldo Disponible</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activos.map((a: any) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedActivoId(a.id)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-foreground uppercase">
                        {a.institucion}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {a.activo}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedActivoId(a.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Extracto</span>
                          <i className="ri-arrow-right-line" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
