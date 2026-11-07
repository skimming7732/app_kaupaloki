import { PublicHeader } from '../components/common/PublicHeader';
import { KpiStrip } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { supabase } from '../lib/supabase';
import { formatNumber, formatRate, formatCOP, formatCurrency, formatDate } from '../utils/formatters';

type PortalData = {
  client: Pick<NormalizedData['clientes'][number], 'codigo' | 'nombre' | 'pais' | 'saldoPendienteCOP' | 'totalIngresosCOP' | 'totalDispersadoCOP' | 'estado'>;
  negocios: NormalizedData['negocios'];
  dispersiones: NormalizedData['dispersiones'];
  efectivo: NormalizedData['efectivo'];
};

export const ClientPublicView = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  return <><PublicHeader /><ClientPortal key={id || params.get('ref') || ''} token={id || params.get('ref') || ''} preview={params.get('from') === 'dashboard'} /></>;
};

const ClientPortal = ({ token, preview }: { token: string; preview: boolean }) => {
  const navigate = useNavigate();
  const { data } = useAirtable();
  const { user, profile, is2faVerified } = useAuth();
  const [activeTab, setActiveTab] = useState<'negocios' | 'pagos' | 'ingresos'>('negocios');
  const [portal, setPortal] = useState<PortalData | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  const isFromDashboard = preview && !!user && !!is2faVerified &&
    ['administrador', 'super_admin', 'operador', 'dispersor'].includes(profile?.role || '');
  const internalClient = isFromDashboard
    ? data.clientes.find((client) => client.id === token || client.codigo.toLowerCase() === token.toLowerCase())
    : undefined;
  const matches = (item: { clienteId?: string; clienteCodigo?: string }) =>
    !!internalClient && (item.clienteId ? item.clienteId === internalClient.id : item.clienteCodigo === internalClient.codigo);
  const client = internalClient || portal?.client;
  const clientNegocios = internalClient ? data.negocios.filter(matches) : portal?.negocios || [];
  const dispersiones = internalClient ? data.dispersiones.filter(matches) : portal?.dispersiones || [];
  const efectivo = internalClient ? data.efectivo.filter(matches) : portal?.efectivo || [];
  const clientPagos = [
    ...dispersiones.map((item) => ({
      ...item, tipo: 'Dispersión bancaria', origen: item.origenFondos,
    })),
    ...efectivo.filter((item) => item.tipo === 'Pago').map((item) => ({
      ...item, tipo: 'Pago en efectivo', origen: item.origenFondos, comprobanteUrl: undefined,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const clientIngresos = efectivo.filter((item) => item.tipo === 'Ingreso').map((item) => ({
    ...item, concepto: item.referencia || 'Ingreso en efectivo', origen: item.origenFondos,
  }));
  const totalPagosMonto = clientPagos.reduce((sum, item) => sum + item.monto, 0);
  const totalNegociosMonto = clientNegocios.reduce((sum, item) => sum + item.ingresoCOP, 0);
  const totalIngresosMonto = clientIngresos.reduce((sum, item) => sum + item.monto, 0);

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

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      {isFromDashboard && (
        <button type="button" onClick={() => navigate('/clientes')}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <i className="ri-arrow-left-line" aria-hidden="true" /> Volver al panel
        </button>
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

          <span className="self-start rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {client.estado || 'PENDIENTE'}
          </span>
        </div>
      </div>

      <KpiStrip label="Resumen de cuenta" metrics={[
        { label: 'Saldo pendiente', value: formatCOP(client.saldoPendienteCOP ?? totalNegociosMonto + totalIngresosMonto - totalPagosMonto), icon: 'ri-wallet-3-line', featured: true },
        { label: 'Total ingresos', value: formatCOP(client.totalIngresosCOP ?? totalNegociosMonto + totalIngresosMonto), icon: 'ri-arrow-down-circle-line' },
        { label: 'Total pagado', value: formatCOP(client.totalDispersadoCOP ?? totalPagosMonto), icon: 'ri-send-plane-line' },
        { label: 'Operaciones', value: clientNegocios.length + clientPagos.length + clientIngresos.length, icon: 'ri-list-check' },
      ]} />

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
          <span>Negocios ({formatNumber(clientNegocios.length)})</span>
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
          <span>Pagos y Dispersiones ({formatNumber(clientPagos.length)})</span>
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
          <span>Ingresos ({formatNumber(clientIngresos.length)})</span>
        </button>
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
              <tbody className="divide-y divide-border">
                {clientNegocios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No hay negocios registrados para este cliente
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={6} rows={clientNegocios}>{(n) => (
                    <tr key={n.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium">{n.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(n.fecha)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {n.divisaCodigo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(n.montoDivisa, n.divisaCodigo)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        ${formatRate(n.tasaCambio)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
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
              <tbody className="divide-y divide-border">
                {clientPagos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No hay pagos ni dispersiones registradas
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={6} rows={clientPagos}>{(p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium">{p.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(p.fecha)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground border border-border">
                          {p.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.origen}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{p.referencia || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-500">
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
              <tbody className="divide-y divide-border">
                {clientIngresos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      No hay ingresos de caja registrados para este cliente
                    </td>
                  </tr>
                ) : (
                  <PaginatedRows columns={5} rows={clientIngresos}>{(i) => (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium">{i.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(i.fecha)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{i.concepto}</td>
                      <td className="py-3 px-4 text-muted-foreground">{i.origen}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
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
    </div>
  );
};
