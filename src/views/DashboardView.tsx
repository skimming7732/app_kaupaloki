import React from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatUSD } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const { metrics, data } = useAirtable();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos Líquidos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-bank-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.totalActivosLiquidos)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Caja y bancos disponibles</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Activos Digitales</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-coin-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatUSD(metrics.totalActivosDigitales)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">USDT en wallets</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendiente Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="ri-time-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.saldoPendienteClientes)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Por dispersar a clientes</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Ganancia Estimada</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <i className="ri-line-chart-line" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground">{formatCOP(metrics.gananciaEsperada)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Margen proyectado</span>
          </div>
        </div>
      </div>

      {/* Settlement Breakdown Card */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <i className="ri-calculator-line text-primary" />
          <span>Resumen de Liquidación y Negocios</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Volumen Total Negocios</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(metrics.totalNegocioCOP)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">{data.negocios.length} operaciones registradas</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Total Ventas USDT</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(metrics.totalVentasUSDT)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Equivalente de venta</span>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Liquidez Esperada</span>
            <span className="text-xl font-bold text-foreground">{formatCOP(metrics.liquidezEsperada)}</span>
            <span className="text-[11px] text-muted-foreground block mt-1">Margen libre estimado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
