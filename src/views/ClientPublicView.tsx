import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatCurrency, formatDate } from '../utils/formatters';

export const ClientPublicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data } = useAirtable();

  const [activeTab, setActiveTab] = useState<'negocios' | 'pagos' | 'ingresos'>('negocios');

  // Resolve client by URL param slug (e.g. "c-c0027-daniel-ramirez" or "c0027") or query ref
  const clientSlug = (id || searchParams.get('ref') || '').toLowerCase();

  const client = useMemo(() => {
    if (!clientSlug) return null;
    return data.clientes.find((c) => {
      const cCode = c.codigo.toLowerCase();
      const cName = c.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const slugMatch = `${cCode}-${cName}`.includes(clientSlug) || clientSlug.includes(cCode);
      return slugMatch || c.id === clientSlug;
    });
  }, [data.clientes, clientSlug]);

  // Filter client's records
  const clientNegocios = useMemo(() => {
    if (!client) return [];
    return data.negocios.filter((n) => n.clienteId === client.id || n.clienteNombre === client.nombre);
  }, [data.negocios, client]);

  // Pagos = Dispersiones + Efectivo de tipo 'Pago'
  const clientPagos = useMemo(() => {
    if (!client) return [];
    const dispersiones = data.dispersiones
      .filter((d) => d.clienteId === client.id || d.clienteNombre === client.nombre)
      .map((d) => ({
        id: d.id,
        codigo: d.codigo,
        fecha: d.fecha,
        tipo: 'Dispersión Bancaria',
        origen: d.origenFondos || 'Bancolombia',
        monto: d.monto,
        referencia: d.referencia
      }));

    const efectivoPagos = data.efectivo
      .filter((e) => (e.clienteId === client.id || e.clienteNombre === client.nombre) && e.tipo === 'Pago')
      .map((e) => ({
        id: e.id,
        codigo: e.codigo,
        fecha: e.fecha,
        tipo: 'Pago en Efectivo',
        origen: e.origenFondos || 'Caja Efectivo',
        monto: e.monto,
        referencia: e.referencia
      }));

    return [...dispersiones, ...efectivoPagos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [data.dispersiones, data.efectivo, client]);

  // Ingresos = Efectivo de tipo 'Ingreso' + Comisiones
  const clientIngresos = useMemo(() => {
    if (!client) return [];
    return data.efectivo
      .filter((e) => (e.clienteId === client.id || e.clienteNombre === client.nombre) && e.tipo === 'Ingreso')
      .map((e) => ({
        id: e.id,
        codigo: e.codigo,
        fecha: e.fecha,
        concepto: e.referencia || 'Ingreso en Efectivo',
        origen: e.origenFondos || 'Caja',
        monto: e.monto
      }));
  }, [data.efectivo, client]);

  const totalPagosMonto = useMemo(() => {
    return clientPagos.reduce((acc, p) => acc + p.monto, 0);
  }, [clientPagos]);

  const totalNegociosMonto = useMemo(() => {
    return clientNegocios.reduce((acc, n) => acc + n.ingresoCOP, 0);
  }, [clientNegocios]);

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3 text-xl">
            <i className="ri-user-unfollow-line" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Cliente No Encontrado</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            El enlace de cliente no corresponde a un registro activo.
          </p>
          <button
            onClick={() => navigate('/clientes')}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
          >
            Volver a Clientes
          </button>
        </div>
      </div>
    );
  }

  const isFromDashboard = searchParams.get('from') === 'dashboard';

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
                {formatCOP(totalNegociosMonto - totalPagosMonto)}
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
            <span className="text-xs text-muted-foreground block">Total Negocios Acordados</span>
            <span className="text-lg font-bold text-foreground">{formatCOP(totalNegociosMonto)}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Total Pagado (Dispersado + Efectivo)</span>
            <span className="text-lg font-bold text-emerald-500">{formatCOP(totalPagosMonto)}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Operaciones Realizadas</span>
            <span className="text-lg font-bold text-foreground">{clientNegocios.length}</span>
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
