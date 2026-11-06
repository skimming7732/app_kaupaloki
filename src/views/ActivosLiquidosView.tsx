import React from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const ActivosLiquidosView: React.FC = () => {
  const { metrics, data } = useAirtable();

  // Extract from dispersiones and efectivo to build recent transaction list
  const recentMovements = [
    ...data.dispersiones.slice(0, 10).map((d) => ({
      id: d.id,
      tipo: 'Egreso (Dispersión)',
      fecha: d.fecha,
      institucion: d.origenFondos || 'Bancolombia',
      detalle: `Pago a ${d.clienteNombre}`,
      monto: -d.monto,
    })),
    ...data.efectivo.slice(0, 10).map((e) => ({
      id: e.id,
      tipo: e.tipo === 'Ingreso' ? 'Ingreso Efectivo' : 'Egreso Efectivo',
      fecha: e.fecha,
      institucion: e.origenFondos || 'Efectivo Dosquebradas',
      detalle: e.referencia || `Movimiento ${e.clienteNombre}`,
      monto: e.tipo === 'Ingreso' ? e.monto : -e.monto,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 15);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Account Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Total en Instituciones</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-bank-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatCOP(metrics.totalActivosLiquidos)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Saldo consolidado en custodia</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Institución Principal (Bancolombia)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-building-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatCOP(metrics.totalActivosLiquidos * 0.75)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Cuenta corriente institucional</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Otras Instituciones y Efectivo</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <i className="ri-wallet-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatCOP(metrics.totalActivosLiquidos * 0.25)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Caja física y contingencia</span>
        </div>
      </div>

      {/* Extract / Transactions Table with Perfect Light & Dark Theme Contrast */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h3 className="text-sm font-bold text-foreground">Extracto de Movimientos Líquidos</h3>
            <p className="text-xs text-muted-foreground">Movimientos por Institución y caja física</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{recentMovements.length} movimientos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Institución / Origen</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Detalle</th>
                <th className="py-3 px-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No hay movimientos en el extracto
                  </td>
                </tr>
              ) : (
                recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground font-mono">{formatDate(m.fecha)}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{m.institucion}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.monto > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">{m.detalle}</td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      m.monto > 0 ? 'text-emerald-500' : 'text-foreground'
                    }`}>
                      {m.monto > 0 ? `+${formatCOP(m.monto)}` : formatCOP(m.monto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
