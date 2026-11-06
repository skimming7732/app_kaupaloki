import React from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatUSD } from '../utils/formatters';

export const ActivosDigitalesView: React.FC = () => {
  const { metrics } = useAirtable();

  const cryptoExtract = [
    { id: '1', fecha: '2026-11-04', wallet: 'Binance Pay', tipo: 'Venta USDT', hash: '0x8f2...91a', monto: -12500 },
    { id: '2', fecha: '2026-11-04', wallet: 'Bitget OTC', tipo: 'Recepción', hash: '0x3a1...bb4', monto: 25000 },
    { id: '3', fecha: '2026-11-03', wallet: 'Cold Storage (Tron)', tipo: 'Transferencia Interna', hash: '0x7c9...12d', monto: 10000 },
    { id: '4', fecha: '2026-11-02', wallet: 'Binance Spot', tipo: 'Liquidación', hash: '0x1e4...88c', monto: -8400 }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Total USDT Custodia</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-coin-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatUSD(metrics.totalActivosDigitales)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Saldo consolidado en Tether</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Binance Corporate</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="ri-exchange-box-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatUSD(metrics.totalActivosDigitales * 0.65)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Liquidez para operaciones OTC</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-xs font-semibold uppercase">Bitget & Wallets Frías</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-shield-keyhole-line" />
            </div>
          </div>
          <span className="text-2xl font-black text-foreground">{formatUSD(metrics.totalActivosDigitales * 0.35)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Reserva multi-firma</span>
        </div>
      </div>

      {/* Extract / Blockchain Ledger Table with Proper Light/Dark Contrast */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h3 className="text-sm font-bold text-foreground">Extracto de Movimientos USDT</h3>
            <p className="text-xs text-muted-foreground">Transacciones de custodia y red blockchain</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{cryptoExtract.length} operaciones</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Billetera / Exchange</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Hash / TxID</th>
                <th className="py-3 px-4 text-right">Monto (USDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {cryptoExtract.map((m) => (
                <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground font-mono">{m.fecha}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{m.wallet}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.monto > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{m.hash}</td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    m.monto > 0 ? 'text-emerald-500' : 'text-foreground'
                  }`}>
                    {m.monto > 0 ? `+${formatUSD(m.monto)}` : formatUSD(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
