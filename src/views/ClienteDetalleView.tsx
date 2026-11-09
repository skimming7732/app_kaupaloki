import { getClientCountryIso } from '../data/clientCountries';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData, type NormalizedData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCOP, formatNumber, formatDate, formatCurrency, formatRate, compareChronologicalDesc } from '../utils/formatters';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import { ReceiptThumbnail } from '../components/common/ReceiptThumbnail';
import { ReceiptLightboxModal, type LightboxItem } from '../components/modals/ReceiptLightboxModal';
import { EditClienteModal } from '../components/modals/EditClienteModal';
import { ShareClientModal } from '../components/modals/ShareClientModal';
import { AddNegocioModal, type EditableNegocio } from '../components/modals/AddNegocioModal';
import { AddDispersionModal } from '../components/modals/AddDispersionModal';
import { AddEfectivoModal } from '../components/modals/AddEfectivoModal';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';

export const ClienteDetalleView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useData();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'administrador' || profile?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'negocios' | 'dispersiones' | 'efectivo' | 'comisiones'>('negocios');
  const [copiedCode, setCopiedCode] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAddNegocioOpen, setIsAddNegocioOpen] = useState(false);
  const [editingNegocio, setEditingNegocio] = useState<EditableNegocio | undefined>(undefined);
  const [isAddDispersionOpen, setIsAddDispersionOpen] = useState(false);
  const [editingDispersion, setEditingDispersion] = useState<NormalizedData['dispersiones'][number] | undefined>(undefined);
  const [isAddEfectivoOpen, setIsAddEfectivoOpen] = useState(false);

  // Lightbox for receipts
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; index: number; items: LightboxItem[] }>({
    isOpen: false,
    index: 0,
    items: [],
  });

  // Find client by ID or case-insensitive code
  const cliente = useMemo(() => {
    if (!id) return null;
    const target = id.trim().toLowerCase();
    return data.clientes.find(
      (c) => c.id.toLowerCase() === target || c.codigo.toLowerCase() === target
    ) || null;
  }, [data.clientes, id]);

  // Client matches helper
  const matchesClient = (item: { clienteId?: string; clienteCodigo?: string }) => {
    if (!cliente) return false;
    return Boolean(
      (item.clienteId && (item.clienteId === cliente.id || item.clienteId === cliente.codigo)) ||
      (item.clienteCodigo && (item.clienteCodigo === cliente.codigo || item.clienteCodigo === cliente.id))
    );
  };

  // Associated records
  const clientNegocios = useMemo(() => {
    return data.negocios
      .filter((n) => matchesClient(n) && matchesDateRange(n.fecha, fechaDesde, fechaHasta))
      .sort(compareChronologicalDesc);
  }, [data.negocios, cliente, fechaDesde, fechaHasta]);

  const clientDispersiones = useMemo(() => {
    return data.dispersiones
      .filter((d) => matchesClient(d) && matchesDateRange(d.fecha, fechaDesde, fechaHasta))
      .sort(compareChronologicalDesc);
  }, [data.dispersiones, cliente, fechaDesde, fechaHasta]);

  const clientEfectivo = useMemo(() => {
    return data.efectivo
      .filter((e) => matchesClient(e) && matchesDateRange(e.fecha, fechaDesde, fechaHasta))
      .sort(compareChronologicalDesc);
  }, [data.efectivo, cliente, fechaDesde, fechaHasta]);

  // Commission info
  const comisionistaData = useMemo(() => {
    if (!cliente) return null;
    return data.comisionistas.find((cm) => {
      const targetId = cm.comisionistaId || (cm as any).comisionistaClienteId;
      return targetId === cliente.id || targetId === cliente.codigo;
    }) || null;
  }, [data.comisionistas, cliente]);

  // If this client is referred by another
  const referidorComisionista = useMemo(() => {
    if (!cliente) return null;
    return data.comisionistas.find((cm) =>
      Array.isArray(cm.comisionaDeIds) && (cm.comisionaDeIds.includes(cliente.id) || cm.comisionaDeIds.includes(cliente.codigo))
    ) || null;
  }, [data.comisionistas, cliente]);

  const referidoPor = useMemo(() => {
    if (!referidorComisionista) return null;
    const targetId = referidorComisionista.comisionistaId || (referidorComisionista as any).comisionistaClienteId;
    return data.clientes.find((c) => c.id === targetId || c.codigo === targetId) || null;
  }, [referidorComisionista, data.clientes]);

  // Referred clients details if client is a comisionista
  const clientesReferidos = useMemo(() => {
    if (!comisionistaData || !Array.isArray(comisionistaData.comisionaDeIds)) return [];
    return comisionistaData.comisionaDeIds
      .map((refId) => data.clientes.find((c) => c.id === refId || c.codigo === refId))
      .filter((c): c is NormalizedData['clientes'][number] => Boolean(c));
  }, [comisionistaData, data.clientes]);

  const handleCopyCode = () => {
    if (!cliente) return;
    navigator.clipboard.writeText(cliente.codigo);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openReceiptLightbox = (item: NormalizedData['dispersiones'][number]) => {
    const items: LightboxItem[] = clientDispersiones.flatMap((d) =>
      (d.comprobanteUrl || '').split(',').map((url) => url.trim()).filter(Boolean).map((url, index) => ({
        id: d.id + '-' + index,
        codigo: d.codigo,
        clienteNombre: d.clienteNombre,
        monto: d.monto,
        comprobanteUrl: url,
      }))
    );
    const index = items.findIndex((entry) => entry.id === item.id + '-0');
    if (index >= 0) setLightboxState({ isOpen: true, index, items });
  };

  const rejectedTotal = data.dispersiones.reduce((total, item) =>
    matchesClient(item) && item.estado.trim().toUpperCase() === 'RECHAZADO' ? total + item.monto : total, 0);

  if (!cliente) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/clientes')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <i className="ri-arrow-left-line text-sm" />
          <span>Volver a Clientes</span>
        </button>

        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            <i className="ri-user-unfollow-line" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Cliente no encontrado</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            El cliente solicitado no existe o no tienes permisos para acceder a su expediente.
          </p>
          <button
            onClick={() => navigate('/clientes')}
            className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Ir al listado de clientes
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (estado: string) => {
    const norm = (estado || 'SIN ACTIVIDAD').toUpperCase();
    if (norm.includes('ACTIVIDAD') || norm.includes('INACTIVO')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border/60">
          SIN ACTIVIDAD
        </span>
      );
    }
    if (norm.includes('PAGADO')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          AL DÍA / PAGADO
        </span>
      );
    }
    if (norm.includes('DEBE')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          DEBE AL SISTEMA
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        SALDO PENDIENTE
      </span>
    );
  };

  const porPagar = cliente.saldoPendienteCOP || 0;
  const porCobrar = cliente.porCobrarCOP || 0;
  const saldoCliente = porPagar - porCobrar;
  const signoSaldo = saldoCliente < 0 ? '−' : saldoCliente > 0 ? '+' : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/clientes')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <i className="ri-arrow-left-line text-sm group-hover:-translate-x-1 transition-transform" />
          <span>Volver al listado de Clientes</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Public Portal Shortcut */}
          <button
            onClick={() => navigate(`/cliente/${cliente.codigo.toLowerCase()}?from=panel-control`)}
            title="Abrir la vista portal que ve el cliente"
            className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5"
          >
            <i className="ri-external-link-line text-muted-foreground" />
            <span className="hidden sm:inline">Vista Portal Cliente</span>
          </button>

          {/* Share Access PIN Modal */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition-colors flex items-center gap-1.5"
          >
            <i className="ri-share-line" />
            <span>Compartir Enlace PIN</span>
          </button>

          {/* Edit Client */}
          {isAdmin && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors flex items-center gap-1.5"
            >
              <i className="ri-edit-line text-muted-foreground" />
              <span>Editar</span>
            </button>
          )}

          {/* New Operation (Negocio) */}
          <button
            onClick={() => {
              setEditingNegocio(undefined);
              setIsAddNegocioOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-opacity"
          >
            <i className="ri-add-line" />
            <span>Nuevo Negocio</span>
          </button>

          {/* New Dispersion */}
          <button
            onClick={() => {
              setEditingDispersion(undefined);
              setIsAddDispersionOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <i className="ri-bank-card-line" />
            <span>Nueva Dispersión</span>
          </button>
        </div>
      </div>

      {/* Client Identity Dossier Card */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl border border-primary/20 shrink-0">
              {cliente.nombre ? cliente.nombre.slice(0, 2).toUpperCase() : 'CL'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                  {getClientCountryIso(cliente.pais)}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {cliente.pais || 'Colombia'}
                </span>
                {cliente.esComisionista && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <i className="ri-hand-coin-line" />
                    <span>Comisionista</span>
                  </span>
                )}
                {referidoPor && (
                  <button
                    type="button"
                    onClick={() => navigate(`/clientes/${referidoPor.codigo.toLowerCase()}`)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1 hover:bg-indigo-500/20 transition-colors"
                  >
                    <i className="ri-user-shared-line" />
                    <span>Comisionista: {referidoPor.nombre}</span>
                  </button>
                )}
              </div>

              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {cliente.nombre || 'Sin nombre'}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-mono font-semibold bg-muted/60 px-2.5 py-1 rounded-lg border border-border/80">
                  <span>{cliente.codigo}</span>
                  <button
                    onClick={handleCopyCode}
                    title="Copiar código"
                    className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                  >
                    <i className={copiedCode ? "ri-check-line text-emerald-500" : "ri-file-copy-line"} />
                  </button>
                </div>
                {cliente.createdBy && (
                  <div className="flex items-center gap-1">
                    <i className="ri-user-smile-line text-muted-foreground" />
                    <span>Registrado por: <strong>{cliente.createdBy}</strong></span>
                  </div>
                )}
                {cliente.createdAt && (
                  <div className="flex items-center gap-1">
                    <i className="ri-calendar-line text-muted-foreground" />
                    <span>Fecha alta: {formatDate(cliente.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Balance Status Widget (matching shared client portal style) */}
          <div className="min-w-0 md:text-right flex flex-col md:items-end justify-center">
            <div className="inline-flex">{getStatusBadge(cliente.estado)}</div>
            <p className={'mt-2 break-words text-3xl font-black tabular-nums sm:text-4xl font-mono ' + (
              saldoCliente < 0 ? 'text-destructive' : saldoCliente > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
            )}>
              <span className="sr-only">Saldo de la cuenta </span>
              {signoSaldo}{formatCOP(Math.abs(saldoCliente))}
            </p>
            <span className="text-[11px] text-muted-foreground mt-0.5">
              {saldoCliente > 0
                ? 'Pendiente por pagar al cliente'
                : saldoCliente < 0
                ? 'El cliente debe al sistema'
                : 'Cuentas perfectamente al día'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial KPIs Dossier */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Negocios</span>
            <i className="ri-exchange-dollar-line text-lg text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            {formatNumber(cliente.totalNegocios ?? clientNegocios.length)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Volumen: <strong className="text-foreground">{formatCOP(cliente.totalIngresosCOP)}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Pagado</span>
            <i className="ri-bank-card-line text-lg text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            {formatCOP(cliente.totalDispersadoCOP)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {clientDispersiones.length} dispersiones registradas
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Por Pagar</span>
            <i className="ri-time-line text-lg text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            {formatCOP(porPagar)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Pendiente por dispersar al cliente
          </div>
          {rejectedTotal > 0 && (
            <p className="mt-1 text-xs text-destructive">Dispersiones rechazadas: {formatCOP(rejectedTotal)}</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Por Cobrar</span>
            <i className="ri-money-dollar-circle-line text-lg text-rose-500" />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${porCobrar > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {formatCOP(porCobrar)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Saldo que debe el cliente
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {!cliente.esComisionista && referidoPor ? 'Comisionista' : 'Comisiones'}
            </span>
            <i className="ri-hand-coin-line text-lg text-indigo-500" />
          </div>
          {!cliente.esComisionista && referidoPor ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/clientes/${referidoPor.codigo.toLowerCase()}`)}
                className="text-left text-sm sm:text-base font-black text-foreground hover:text-primary transition-colors line-clamp-1"
                title={referidoPor.nombre}
              >
                {referidoPor.nombre}
              </button>
              <div className="text-xs text-muted-foreground mt-1">
                Comisión: <strong className="text-foreground font-mono">
                  {referidorComisionista
                    ? `${formatNumber((referidorComisionista.porcentajeComision <= 1 ? referidorComisionista.porcentajeComision * 100 : referidorComisionista.porcentajeComision), 2)}%`
                    : 'Asignado'}
                </strong>
              </div>
            </>
          ) : (
            <>
              <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {formatCOP(cliente.totalComisionesCOP ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2" title={clientesReferidos.map((c) => c.nombre).join(', ')}>
                {cliente.esComisionista
                  ? (clientesReferidos.length > 0
                      ? `Comisiona de: ${clientesReferidos.map((c) => c.nombre).join(', ')}`
                      : 'Sin referidos asignados')
                  : 'No es comisionista'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('negocios')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'negocios'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <i className="ri-briefcase-line text-sm" />
          <span>Negocios</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
            {clientNegocios.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dispersiones')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'dispersiones'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <i className="ri-bank-card-line text-sm" />
          <span>Dispersiones y Comprobantes</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
            {clientDispersiones.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('efectivo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'efectivo'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <i className="ri-money-dollar-box-line text-sm" />
          <span>Movimientos Efectivo</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
            {clientEfectivo.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('comisiones')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'comisiones'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <i className="ri-hand-coin-line text-sm" />
          <span>Comisiones y Red</span>
          {cliente.esComisionista && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {clientesReferidos.length}
            </span>
          )}
        </button>
      </div>

      {/* Date Range Filter for Tabs */}
      {activeTab !== 'comisiones' && (
        <div className="p-3 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3">
          <DateRangeFilter
            from={fechaDesde}
            to={fechaHasta}
            setFrom={setFechaDesde}
            setTo={setFechaHasta}
            className="w-full sm:w-auto"
          />
          {(fechaDesde || fechaHasta) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filtrando por fecha</span>
              <button
                type="button"
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="text-primary hover:underline font-semibold"
              >
                Ver todo el histórico
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Negocios */}
      {activeTab === 'negocios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Operaciones y Negocios del Cliente ({clientNegocios.length})
            </h3>
            <button
              onClick={() => {
                setEditingNegocio(undefined);
                setIsAddNegocioOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold flex items-center gap-1.5"
            >
              <i className="ri-add-line" />
              <span>Registrar Negocio</span>
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Divisa / Monto</th>
                    <th className="py-3 px-4 text-right">Tasa Cambio</th>
                    <th className="py-3 px-4 text-right">Ingreso COP</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <CreatedByHeader />
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientNegocios.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        Este cliente aún no tiene negocios registrados.
                      </td>
                    </tr>
                  ) : (
                    clientNegocios.map((n) => (
                      <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {n.codigo}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(n.fecha)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-foreground">
                            {formatCurrency(n.montoDivisa, n.divisaCodigo)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {formatRate(n.tasaCambio)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatCOP(n.ingresoCOP)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.estado === 'COMPLETADO'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {n.estado || 'REGISTRADO'}
                          </span>
                        </td>
                        <CreatedByCell name={n.createdByName} createdBy={n.createdBy} createdAt={n.createdAtAudit} />
                        <td className="py-3 px-4 text-center">
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingNegocio(n);
                                setIsAddNegocioOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                              title="Editar negocio"
                            >
                              <i className="ri-pencil-line text-sm" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dispersiones y Pagos */}
      {activeTab === 'dispersiones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Dispersiones Bancarias y Comprobantes ({clientDispersiones.length})
            </h3>
            <button
              onClick={() => {
                setEditingDispersion(undefined);
                setIsAddDispersionOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <i className="ri-add-line" />
              <span>Nueva Dispersión</span>
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Monto Pagado (COP)</th>
                    <th className="py-3 px-4">Origen de Fondos</th>
                    <th className="py-3 px-4">Referencia / Destino</th>
                    <th className="py-3 px-4 text-center">Comprobante</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <CreatedByHeader />
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientDispersiones.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        Este cliente no registra dispersiones bancarias.
                      </td>
                    </tr>
                  ) : (
                    clientDispersiones.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {d.codigo}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(d.fecha)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCOP(d.monto)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {d.origenFondos || 'Cuenta bancaria'}
                        </td>
                        <td className="py-3 px-4 text-foreground max-w-xs truncate">
                          {d.referencia || 'Sin referencia'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {d.comprobanteUrl ? (
                            <button
                              type="button"
                              onClick={() => openReceiptLightbox(d)}
                              className="inline-flex h-10 w-7 items-center justify-center overflow-hidden rounded-md border border-border align-middle hover:opacity-80"
                              aria-label={'Ver comprobante de ' + d.codigo}
                            >
                              <ReceiptThumbnail receipt={d.comprobanteUrl.split(',')[0].trim()} />
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Sin adjunto</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ['COMPLETADO', 'DISPERSADO', 'APROBADO'].includes(d.estado.toUpperCase())
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {d.estado || 'DISPERSADO'}
                          </span>
                        </td>
                        <CreatedByCell name={d.createdByName} createdBy={d.createdBy} createdAt={d.createdAtAudit} />
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setEditingDispersion(d);
                              setIsAddDispersionOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            title="Editar dispersión"
                          >
                            <i className="ri-pencil-line text-sm" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Movimientos de Efectivo */}
      {activeTab === 'efectivo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Movimientos de Caja y Efectivo ({clientEfectivo.length})
            </h3>
            <button
              onClick={() => setIsAddEfectivoOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <i className="ri-add-line" />
              <span>Registrar Efectivo</span>
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-center">Tipo</th>
                    <th className="py-3 px-4 text-right">Monto (COP)</th>
                    <th className="py-3 px-4">Caja / Origen</th>
                    <th className="py-3 px-4">Concepto / Detalle</th>
                    <CreatedByHeader />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clientEfectivo.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No hay movimientos de efectivo vinculados a este cliente.
                      </td>
                    </tr>
                  ) : (
                    clientEfectivo.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {e.codigo}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(e.fecha)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            e.tipo === 'Ingreso'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {e.tipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatCOP(e.monto)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {e.origenFondos || 'Caja Efectivo'}
                        </td>
                        <td className="py-3 px-4 text-foreground max-w-sm truncate">
                          {e.referencia || 'Movimiento de efectivo'}
                        </td>
                        <CreatedByCell name={e.createdByName} createdBy={e.createdBy} createdAt={e.createdAtAudit} />
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Comisiones y Red */}
      {activeTab === 'comisiones' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comisionista Status Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
                  <i className="ri-hand-coin-line" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Perfil de Comisionista</h4>
                  <p className="text-xs text-muted-foreground">Configuración de comisiones y beneficios</p>
                </div>
              </div>

              {cliente.esComisionista ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Código de comisionista:</span>
                    <span className="font-bold font-mono text-primary">{comisionistaData?.codigo || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Estado de comisionista:</span>
                    <span className="font-bold text-emerald-500">Activo</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Porcentaje asignado:</span>
                    <span className="font-bold font-mono text-foreground">
                      {comisionistaData?.porcentajeComision
                        ? `${formatNumber((comisionistaData.porcentajeComision <= 1 ? comisionistaData.porcentajeComision * 100 : comisionistaData.porcentajeComision), 2)}%`
                        : 'Variable'}
                    </span>
                  </div>
                  <div className="py-2 border-b border-border space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisiona de ({clientesReferidos.length}):</span>
                    </div>
                    {clientesReferidos.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {clientesReferidos.map((refClient) => (
                          <button
                            key={refClient.id}
                            type="button"
                            onClick={() => navigate(`/clientes/${refClient.codigo.toLowerCase()}`)}
                            className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-foreground text-[11px] font-semibold border border-border transition-colors flex items-center gap-1"
                          >
                            <i className="ri-user-follow-line text-xs" />
                            <span>{refClient.nombre}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sin clientes asignados</span>
                    )}
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Total comisiones generadas:</span>
                    <span className="font-bold font-mono text-emerald-500 text-sm">
                      {formatCOP(cliente.totalComisionesCOP ?? 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/comisionistas')}
                    className="w-full mt-3 px-3 py-2 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-settings-4-line" />
                    <span>Administrar en módulo de Comisionistas</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <i className="ri-user-unfollow-line text-3xl text-muted-foreground/40 mb-2 block" />
                  <p className="text-xs text-muted-foreground">
                    Este cliente no está registrado como comisionista actualmente.
                  </p>
                  <button
                    onClick={() => navigate('/comisionistas')}
                    className="mt-3 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold transition-opacity"
                  >
                    Configurar como Comisionista
                  </button>
                </div>
              )}
            </div>

            {/* Referrer (Referido por) Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                  <i className="ri-user-shared-line" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Origen del Cliente / Referidor</h4>
                  <p className="text-xs text-muted-foreground">¿Quién trajo a este cliente?</p>
                </div>
              </div>

              {referidoPor ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Comisionista asignado:</span>
                    <span className="font-bold text-foreground">{referidoPor.nombre}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Código comisionista:</span>
                    <span className="font-mono font-semibold text-primary">{referidorComisionista?.codigo || referidoPor.codigo}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Porcentaje de comisión:</span>
                    <span className="font-mono font-bold text-foreground">
                      {referidorComisionista
                        ? `${formatNumber((referidorComisionista.porcentajeComision <= 1 ? referidorComisionista.porcentajeComision * 100 : referidorComisionista.porcentajeComision), 2)}%`
                        : '—'}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/clientes/${referidoPor.codigo.toLowerCase()}`)}
                    className="w-full mt-3 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors flex items-center justify-center gap-1.5"
                  >
                    <i className="ri-eye-line" />
                    <span>Ver expediente de {referidoPor.nombre}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <i className="ri-user-line text-3xl text-muted-foreground/40 mb-2 block" />
                  <p className="text-xs text-muted-foreground">
                    Este cliente llegó de forma directa, no está asignado a ningún comisionista.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Table of referred clients if applicable */}
          {cliente.esComisionista && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground">
                Clientes Asignados a su Red de Comisiones ({clientesReferidos.length})
              </h4>
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Cliente Referido</th>
                      <th className="py-3 px-4 text-center">País</th>
                      <th className="py-3 px-4 text-center">Negocios</th>
                      <th className="py-3 px-4 text-right">Volumen Ingresos</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clientesReferidos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No tiene clientes asignados en este momento.
                        </td>
                      </tr>
                    ) : (
                      clientesReferidos.map((refClient) => (
                        <tr key={refClient.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{refClient.nombre}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{refClient.codigo}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                              {getClientCountryIso(refClient.pais)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {formatNumber(refClient.totalNegocios ?? 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                            {formatCOP(refClient.totalIngresosCOP)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => navigate(`/clientes/${refClient.codigo.toLowerCase()}`)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              Ver expediente
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for 9:16 mobile receipts */}
      <ReceiptLightboxModal
        isOpen={lightboxState.isOpen}
        currentIndex={lightboxState.index}
        onNavigate={(index) => setLightboxState((prev) => ({ ...prev, index }))}
        items={lightboxState.items}
        onClose={() => setLightboxState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Edit Client Modal */}
      {isEditOpen && (
        <EditClienteModal
          isOpen={isEditOpen}
          cliente={cliente}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {/* Share Client Modal */}
      {isShareOpen && (
        <ShareClientModal
          isOpen={isShareOpen}
          cliente={cliente}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {/* Add / Edit Negocio Modal */}
      {isAddNegocioOpen && (
        <AddNegocioModal
          isOpen={isAddNegocioOpen}
          negocio={editingNegocio}
          initialClienteId={cliente.id}
          onClose={() => {
            setIsAddNegocioOpen(false);
            setEditingNegocio(undefined);
          }}
        />
      )}

      {/* Add / Edit Dispersion Modal */}
      {isAddDispersionOpen && (
        <AddDispersionModal
          isOpen={isAddDispersionOpen}
          record={editingDispersion}
          initialClienteId={cliente.id}
          onClose={() => {
            setIsAddDispersionOpen(false);
            setEditingDispersion(undefined);
          }}
        />
      )}

      {/* Add Efectivo Modal */}
      {isAddEfectivoOpen && (
        <AddEfectivoModal
          isOpen={isAddEfectivoOpen}
          initialClienteId={cliente.id}
          onClose={() => setIsAddEfectivoOpen(false)}
        />
      )}
    </div>
  );
};
