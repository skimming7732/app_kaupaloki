import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReceiptPreview } from '../components/common/ReceiptPreview';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { supabase } from '../lib/supabase';
import { formatCOP, formatCurrency, formatDate } from '../utils/formatters';

type PortalData = {
  client: Pick<NormalizedData['clientes'][number], 'codigo' | 'nombre' | 'pais' | 'saldoPendienteCOP' | 'totalIngresosCOP' | 'totalDispersadoCOP' | 'estado'>;
  negocios: NormalizedData['negocios'];
  dispersiones: NormalizedData['dispersiones'];
  efectivo: NormalizedData['efectivo'];
};

export const ClientPublicView = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  return <ClientPortal key={id || params.get('ref') || ''} token={id || params.get('ref') || ''} preview={params.get('from') === 'dashboard'} />;
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background animate-fade-in">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 md:p-8 shadow-2xl relative text-center">
          <div className="mb-6">
            <img
              src="/logo.png"
              alt="Kaupaloki"
              className="theme-logo-dark mx-auto mb-4"
              style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
            />
            <img
              src="/logo-blue.png"
              alt="Kaupaloki"
              className="theme-logo-light mx-auto mb-4"
              style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
            />
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
      {/* Top Bar with optional back button */}
      <div className="flex items-center justify-between">
        {isFromDashboard ? (
          <button
            onClick={() => navigate('/clientes')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm transition-colors"
          >
            <i className="ri-arrow-left-line" />
            <span>Volver al Panel</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-sm">
              K
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kaupaloki Portal</span>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <i className="ri-shield-check-line" />
          <span>Estado de Cuenta Oficial</span>
        </div>
      </div>

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

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Saldo Pendiente</span>
              <span className="text-2xl font-black text-foreground">
                {formatCOP(
                  client.saldoPendienteCOP !== undefined && client.saldoPendienteCOP !== null
                    ? client.saldoPendienteCOP
                    : (totalNegociosMonto + totalIngresosMonto - totalPagosMonto)
                )}
              </span>
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase bg-primary/10 text-primary">
              {client.estado || 'PENDIENTE'}
            </span>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6">
          <div>
            <span className="text-xs text-muted-foreground block">Total Negocios / Ingresos</span>
            <span className="text-lg font-bold text-foreground">
              {formatCOP(client.totalIngresosCOP || (totalNegociosMonto + totalIngresosMonto))}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Total Pagado (Dispersado + Efectivo)</span>
            <span className="text-lg font-bold text-emerald-500">
              {formatCOP(client.totalDispersadoCOP || totalPagosMonto)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Operaciones Realizadas</span>
            <span className="text-lg font-bold text-foreground">
              {clientNegocios.length + clientPagos.length + clientIngresos.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('negocios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'negocios'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <i className="ri-exchange-dollar-line" />
          <span>Negocios ({clientNegocios.length})</span>
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
          <span>Pagos y Dispersiones ({clientPagos.length})</span>
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
          <span>Ingresos ({clientIngresos.length})</span>
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
                  clientNegocios.map((n) => (
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
                        ${n.tasaCambio.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCOP(n.ingresoCOP)}
                      </td>
                    </tr>
                  ))
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
                  <th className="py-3 px-4 text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clientPagos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No hay pagos ni dispersiones registradas
                    </td>
                  </tr>
                ) : (
                  clientPagos.map((p) => (
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
                      <td className="py-3 px-4 text-center">
                        {p.comprobanteUrl?.startsWith('storage:') ? (
                          <ReceiptPreview receipt={p.comprobanteUrl} compact />
                        ) : p.comprobanteUrl ? (
                          <a
                            href={p.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-semibold text-[11px] transition-colors"
                          >
                            <i className="ri-file-text-line" />
                            <span>Ver</span>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
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
                  clientIngresos.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono font-medium">{i.codigo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(i.fecha)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{i.concepto}</td>
                      <td className="py-3 px-4 text-muted-foreground">{i.origen}</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCOP(i.monto)}
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
  );
};
