import { PublicHeader } from '../components/common/PublicHeader';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData, type NormalizedData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import { formatNumber, formatRate, formatCOP, formatCurrency, formatDate, compareChronologicalDesc } from '../utils/formatters';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { CurrencyFilterDropdown } from '../components/common/CurrencyFilterDropdown';

type PortalCommissionItem = {
  id: string;
  clienteMasked: string;
  negocios: number;
  totalComisionesCOP: number;
};

type PortalData = {
  client: Pick<NormalizedData['clientes'][number], 'codigo' | 'nombre' | 'pais' | 'saldoPendienteCOP' | 'totalIngresosCOP' | 'totalDispersadoCOP' | 'estado'>;
  negocios: NormalizedData['negocios'];
  dispersiones: NormalizedData['dispersiones'];
  efectivo: NormalizedData['efectivo'];
  comisiones?: PortalCommissionItem[];
};

const maskClientCodeForPortal = (codigo: string, nombre?: string): string => {
  const rawCode = (codigo || '').trim();
  const parts = rawCode.split('-').filter(Boolean);
  let prefix = '';
  let words: string[] = [];

  if (parts.length >= 2 && /^C\d+$/i.test(parts[0])) {
    prefix = parts[0].toUpperCase();
    words = parts.slice(1);
  } else if (parts.length === 1 && /^C\d+$/i.test(parts[0])) {
    prefix = parts[0].toUpperCase();
    words = (nombre || '').trim().split(/\s+/).filter(Boolean);
  } else {
    words = (nombre || rawCode).trim().split(/[\s-]+/).filter(Boolean);
  }

  const maskedWords = words.map((w) => `${w.charAt(0).toUpperCase()}*****`);
  if (prefix && maskedWords.length > 0) return `${prefix}-${maskedWords.join('-')}`;
  if (prefix) return prefix;
  return maskedWords.join('-');
};

export const ClientPublicView = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  return <><PublicHeader /><ClientPortal key={id || params.get('ref') || ''} token={id || params.get('ref') || ''} preview={(params.get('from') === 'dashboard' || params.get('from') === 'panel-control')} /></>;
};

const ClientPortal = ({ token, preview }: { token: string; preview: boolean }) => {
  const navigate = useNavigate();
  const { data, loading } = useData();
  const { user, profile, is2faVerified } = useAuth();
  const [activeTab, setActiveTab] = useState<'negocios' | 'pagos' | 'ingresos' | 'comisiones'>('negocios');
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Filters state: Date range defaults to Máximo (empty strings = all dates)
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');

  const isStaff = !!user && !!is2faVerified;
  const isFromDashboard = (preview || isStaff) &&
    ['administrador', 'super_admin', 'operador', 'dispersor', 'comercial', 'supervisor'].includes(profile?.role || '');
  const internalClient = isFromDashboard
    ? data.clientes.find((client) => client.id === token || client.codigo.toLowerCase() === token.toLowerCase())
    : undefined;
  const matches = (item: { clienteId?: string; clienteCodigo?: string }) =>
    !!internalClient && (item.clienteId ? item.clienteId === internalClient.id : item.clienteCodigo === internalClient.codigo);
  const client = internalClient || portal?.client;
  const clientNegocios = internalClient ? data.negocios.filter(matches) : portal?.negocios || [];
  const dispersiones = internalClient ? data.dispersiones.filter(matches) : portal?.dispersiones || [];
  const efectivo = internalClient ? data.efectivo.filter(matches) : portal?.efectivo || [];

  const clientPagos = useMemo(() => [
    ...dispersiones.filter((item) => item.estado?.trim().toUpperCase() !== 'RECHAZADO').map((item) => ({
      ...item, tipo: 'Dispersión bancaria', origen: item.origenFondos,
    })),
    ...efectivo.filter((item) => item.tipo === 'Pago').map((item) => ({
      ...item, tipo: 'Pago en efectivo', origen: item.origenFondos, comprobanteUrl: undefined,
    })),
  ].sort(compareChronologicalDesc), [dispersiones, efectivo]);

  const clientIngresos = useMemo(() => efectivo.filter((item) => item.tipo === 'Ingreso').map((item) => ({
    ...item, concepto: item.referencia || 'Ingreso en efectivo', origen: item.origenFondos,
  })).sort(compareChronologicalDesc), [efectivo]);

  // Available currencies from the client's transactions
  const divisasUnicas = useMemo(() => {
    const set = new Set<string>();
    clientNegocios.forEach((item) => {
      if (item.divisaCodigo) set.add(item.divisaCodigo.toUpperCase());
    });
    return Array.from(set).sort();
  }, [clientNegocios]);

  // Filtered lists reacting dynamically to date and currency
  const filteredNegocios = useMemo(() => {
    return clientNegocios.filter((item) => {
      const matchFecha = matchesDateRange(item.fecha, fechaDesde, fechaHasta);
      const matchDivisa = !selectedDivisa || item.divisaCodigo?.toUpperCase() === selectedDivisa.toUpperCase();
      return matchFecha && matchDivisa;
    });
  }, [clientNegocios, fechaDesde, fechaHasta, selectedDivisa]);

  const filteredPagos = useMemo(() => {
    return clientPagos.filter((item) => {
      return matchesDateRange(item.fecha, fechaDesde, fechaHasta);
    });
  }, [clientPagos, fechaDesde, fechaHasta]);

  const filteredIngresos = useMemo(() => {
    return clientIngresos.filter((item) => {
      return matchesDateRange(item.fecha, fechaDesde, fechaHasta);
    });
  }, [clientIngresos, fechaDesde, fechaHasta]);

  // Aggregated amounts for the filtered view
  const totalPagosMonto = useMemo(() => clientPagos.reduce((sum, item) => sum + item.monto, 0), [clientPagos]);
  const totalNegociosMonto = useMemo(() => clientNegocios.reduce((sum, item) => sum + item.ingresoCOP, 0), [clientNegocios]);
  const totalIngresosMonto = useMemo(() => clientIngresos.reduce((sum, item) => sum + item.monto, 0), [clientIngresos]);

  const totalFilteredPagosMonto = useMemo(() => filteredPagos.reduce((sum, item) => sum + item.monto, 0), [filteredPagos]);
  const totalFilteredNegociosMonto = useMemo(() => filteredNegocios.reduce((sum, item) => sum + item.ingresoCOP, 0), [filteredNegocios]);
  const totalFilteredNegociosDivisa = useMemo(() => {
    if (!selectedDivisa) return 0;
    return filteredNegocios.reduce((sum, item) => sum + item.montoDivisa, 0);
  }, [filteredNegocios, selectedDivisa]);
  const totalFilteredIngresosMonto = useMemo(() => filteredIngresos.reduce((sum, item) => sum + item.monto, 0), [filteredIngresos]);

  const hasFilter = Boolean(fechaDesde || fechaHasta || selectedDivisa);

  // Active commissions for this client (only populated if client has active commissions)
  const clientComisiones = useMemo<PortalCommissionItem[]>(() => {
    if (internalClient) {
      const commRecord = data.comisionistas.find((cm) => {
        const targetId = cm.comisionistaId || (cm as any).comisionistaClienteId;
        return targetId === internalClient.id || targetId === internalClient.codigo;
      });
      if (!commRecord || !Array.isArray(commRecord.comisionaDeIds) || commRecord.comisionaDeIds.length === 0) {
        return [];
      }
      const pct = Number(commRecord.porcentajeComision || 0);
      const pctFactor = pct > 1 ? pct / 100 : pct;

      return commRecord.comisionaDeIds
        .map((refId) => data.clientes.find((c) => c.id === refId || c.codigo === refId))
        .filter((c): c is NormalizedData['clientes'][number] => Boolean(c))
        .map((refClient) => {
          const allRefNegocios = data.negocios.filter(
            (n) => (n.clienteId ? n.clienteId === refClient.id : n.clienteCodigo === refClient.codigo)
          );
          const filteredRefNegocios = allRefNegocios.filter((n) => {
            const matchFecha = matchesDateRange(n.fecha, fechaDesde, fechaHasta);
            const matchDivisa = !selectedDivisa || n.divisaCodigo?.toUpperCase() === selectedDivisa.toUpperCase();
            return matchFecha && matchDivisa;
          });
          const negociosCount = hasFilter
            ? filteredRefNegocios.length
            : (allRefNegocios.length > 0 ? allRefNegocios.length : (refClient.totalNegocios ?? 0));
          const refVolumen = hasFilter
            ? filteredRefNegocios.reduce((sum, n) => sum + n.ingresoCOP, 0)
            : (allRefNegocios.length > 0
                ? allRefNegocios.reduce((sum, n) => sum + n.ingresoCOP, 0)
                : Math.max(0, (refClient.totalIngresosCOP || 0) - (refClient.totalComisionesCOP || 0)));
          return {
            id: refClient.id,
            clienteMasked: maskClientCodeForPortal(refClient.codigo, refClient.nombre),
            negocios: negociosCount,
            totalComisionesCOP: refVolumen * pctFactor,
          };
        });
    }
    return portal?.comisiones || [];
  }, [internalClient, data.comisionistas, data.clientes, data.negocios, portal?.comisiones, fechaDesde, fechaHasta, selectedDivisa, hasFilter]);

  const hasActiveComisiones = clientComisiones.length > 0;
  const totalComisionesMonto = useMemo(
    () => clientComisiones.reduce((sum, item) => sum + item.totalComisionesCOP, 0),
    [clientComisiones]
  );

  const handleVerifyPin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (verifyingPin || !/^\d{4}$/.test(pin)) return;
    setVerifyingPin(true);
    setPinError('');
    try {
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) {
        setPinError('Pide a tu asesor un enlace de acceso vigente.');
        return;
      }
      const { data: result, error } = await supabase.rpc('abrir_portal_cliente', { p_token: token, p_pin: pin });
      if (error) throw error;
      if (!result) {
        setPinError('El PIN o el enlace no es válido, o el acceso está temporalmente bloqueado.');
        return;
      }
      setPortal(result as PortalData);
      setPin('');
    } catch {
      setPinError('No se pudo verificar el PIN. Inténtalo de nuevo.');
    } finally {
      setVerifyingPin(false);
    }
  };

  if (isStaff && loading && !client) {
    return (
      <div className="min-h-[calc(100dvh-57px)] flex items-center justify-center p-4 bg-background">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary" />
          <span className="text-xs text-muted-foreground font-semibold">Cargando portal del cliente...</span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-[calc(100dvh-57px)] flex items-center justify-center p-4 bg-background animate-fade-in">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl relative text-center">
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              <i className="ri-shield-keyhole-line" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Portal Contable Privado</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Ingresa el PIN de seguridad de 4 dígitos para consultar tu estado de cuenta.
            </p>
          </div>

          {pinError && (
            <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2 text-left animate-shake">
              <i className="ri-error-warning-line text-sm flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                aria-label="PIN de cuatro dígitos"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.4em] font-mono font-bold py-3 px-4 rounded-2xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingPin || pin.length !== 4}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {verifyingPin && <i className="ri-loader-4-line animate-spin" />}
              <span>Acceder al Portal</span>
            </button>
          </form>

          <p className="text-[11px] text-muted-foreground mt-6">
            Kaupaloki Treasury & Trading · Acceso Privado Cifrado
          </p>
        </div>
      </div>
    );
  }

  // The PIN endpoint returns the signed balance. Internal previews have it split already.
  const saldo = client.saldoPendienteCOP ?? ((client.totalIngresosCOP ?? totalNegociosMonto + totalIngresosMonto)
    - (client.totalDispersadoCOP ?? totalPagosMonto));
  const porRecibir = Math.max(0, saldo);
  const porPagar = internalClient?.porCobrarCOP ?? Math.max(0, -saldo);
  const saldoCliente = porRecibir - porPagar;
  const signo = saldoCliente < 0 ? '−' : saldoCliente > 0 ? '+' : '';

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {isFromDashboard && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-primary font-semibold">
            <i className="ri-shield-user-line text-sm" />
            <span>Vista de cliente pública (simulación de portal con PIN)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/clientes/${(internalClient?.codigo || token).toLowerCase()}`)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold shadow-xs hover:opacity-90"
            >
              <i className="ri-folder-user-line" /> Ir al Expediente Interno
            </button>
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <i className="ri-arrow-left-line" /> Volver a Clientes
            </button>
          </div>
        </div>
      )}

      {/* Client Overview Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-card border border-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div>
            <span className="text-xs font-mono font-semibold text-primary block mb-1">{client.codigo}</span>
            <h1 className="text-2xl font-black text-foreground">{client.nombre}</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <i className="ri-global-line" />
              <span>{client.pais || 'Colombia'}</span>
            </p>
          </div>

          <div className="min-w-0 md:text-right">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              {client.estado || 'PENDIENTE'}
            </span>
            <p className={'mt-2 break-words text-3xl font-black tabular-nums sm:text-4xl ' + (
              saldoCliente < 0 ? 'text-destructive' : saldoCliente > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            )}>
              <span className="sr-only">Saldo de la cuenta </span>
              {signo}{formatCOP(Math.abs(saldoCliente))}
            </p>
          </div>
        </div>
      </div>

      <KpiStrip label="Resumen de cuenta" metrics={[
        {
          label: 'Por recibir',
          value: formatCOP(porRecibir),
          icon: 'ri-wallet-3-line',
          featured: true,
        },
        {
          label: selectedDivisa ? `Ingresos ${selectedDivisa}` : (hasFilter ? 'Ingresos en período' : 'Total ingresos'),
          value: selectedDivisa
            ? `${formatCurrency(totalFilteredNegociosDivisa, selectedDivisa)} (${formatCOP(totalFilteredNegociosMonto)})`
            : formatCOP(hasFilter ? (totalFilteredNegociosMonto + totalFilteredIngresosMonto + totalComisionesMonto) : (totalNegociosMonto + totalIngresosMonto + totalComisionesMonto > 0 ? (totalNegociosMonto + totalIngresosMonto + totalComisionesMonto) : (client.totalIngresosCOP || 0))),
          icon: 'ri-arrow-down-circle-line',
        },
        {
          label: hasFilter ? 'Pagado en período' : 'Total pagado',
          value: formatCOP(hasFilter ? totalFilteredPagosMonto : (totalPagosMonto > 0 ? totalPagosMonto : (client.totalDispersadoCOP || 0))),
          icon: 'ri-send-plane-line',
        },
        {
          label: 'Operaciones',
          value: filteredNegocios.length + filteredPagos.length + filteredIngresos.length,
          icon: 'ri-list-check',
        },
      ]} />

      {/* Filter Toolbar: Rango de fecha (por defecto Máximo) y Filtro de Divisa */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          {/* Divisa Filter */}
          <div className="flex flex-col gap-1.5 w-full sm:w-48">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <i className="ri-money-dollar-circle-line text-xs" />
              <span>Divisa</span>
            </span>
            <CurrencyFilterDropdown
              value={selectedDivisa}
              onChange={setSelectedDivisa}
              currencies={divisasUnicas.length > 0 ? divisasUnicas : undefined}
              className="w-full"
            />
          </div>

          {/* Date Range Filter with default Máximo */}
          <DateRangeFilter
            from={fechaDesde}
            to={fechaHasta}
            setFrom={setFechaDesde}
            setTo={setFechaHasta}
            className="w-full sm:w-auto"
          />
        </div>

        {/* Clear Filters / Filter Status */}
        {hasFilter && (
          <div className="flex items-center gap-2 self-start md:self-end pb-0.5 text-xs">
            <span className="text-muted-foreground text-[11px]">Filtro activo</span>
            <button
              type="button"
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setSelectedDivisa('');
              }}
              className="px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold transition-colors inline-flex items-center gap-1 text-[11px]"
            >
              <i className="ri-close-line" />
              <span>Restablecer a Máximo</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('negocios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'negocios'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <i className="ri-exchange-dollar-line" />
          <span>Negocios ({formatNumber(filteredNegocios.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('pagos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'pagos'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <i className="ri-send-plane-line" />
          <span>Pagos y Dispersiones ({formatNumber(filteredPagos.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('ingresos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ingresos'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <i className="ri-arrow-down-circle-line" />
          <span>Ingresos ({formatNumber(filteredIngresos.length)})</span>
        </button>

        {hasActiveComisiones && (
          <button
            onClick={() => setActiveTab('comisiones')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'comisiones'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <i className="ri-hand-coin-line" />
            <span>Comisiones ({formatNumber(clientComisiones.length)})</span>
          </button>
        )}
      </div>

      {/* Tab 1: NEGOCIOS */}
      {activeTab === 'negocios' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Divisa</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-right">Tasa</th>
                  <th className="py-3 px-4 text-right">Ingreso COP</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {filteredNegocios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      {hasFilter
                        ? 'No hay negocios que coincidan con la fecha o divisa seleccionada'
                        : 'No hay negocios registrados para este cliente'}
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={6} rows={filteredNegocios}>{(n) => (
                    <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium">{n.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{formatDate(n.fecha)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {n.divisaCodigo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium font-mono">
                        {formatCurrency(n.montoDivisa, n.divisaCodigo)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        ${formatRate(n.tasaCambio)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                        {formatCOP(n.ingresoCOP)}
                      </td>
                    </tr>
                  )}</PaginatedRows>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: PAGOS (DISPERSIONES + EFECTIVO) */}
      {activeTab === 'pagos' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo de Pago</th>
                  <th className="py-3 px-4">Origen / Banco</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4 text-right">Monto Pagado (COP)</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {filteredPagos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      {hasFilter
                        ? 'No hay pagos ni dispersiones en el rango de fechas seleccionado'
                        : 'No hay pagos ni dispersiones registradas'}
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={6} rows={filteredPagos}>{(p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium">{p.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{formatDate(p.fecha)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                          {p.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.origen}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{p.referencia || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-500 font-mono">
                        {formatCOP(p.monto)}
                      </td>
                    </tr>
                  )}</PaginatedRows>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: INGRESOS */}
      {activeTab === 'ingresos' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto / Detalle</th>
                  <th className="py-3 px-4">Caja / Receptor</th>
                  <th className="py-3 px-4 text-right">Monto Ingresado (COP)</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {filteredIngresos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      {hasFilter
                        ? 'No hay ingresos de caja en el rango de fechas seleccionado'
                        : 'No hay ingresos de caja registrados para este cliente'}
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={5} rows={filteredIngresos}>{(i) => (
                    <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium">{i.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{formatDate(i.fecha)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{i.concepto}</td>
                      <td className="py-3 px-4 text-muted-foreground">{i.origen}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground font-mono">
                        {formatCOP(i.monto)}
                      </td>
                    </tr>
                  )}</PaginatedRows>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: COMISIONES (solo si tiene comisiones activas) */}
      {hasActiveComisiones && activeTab === 'comisiones' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Negocios</th>
                  <th className="py-3 px-4 text-right">Total Comisiones</th>
                </tr>
              </thead>
              <tbody className="divide-y border-border">
                {clientComisiones.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      {item.clienteMasked}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                      {formatNumber(item.negocios)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCOP(item.totalComisionesCOP)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
