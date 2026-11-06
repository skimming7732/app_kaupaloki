import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';
import { ReceiptModal } from '../components/modals/ReceiptModal';

export const DispersionesView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; title: string } | null>(null);

  const filteredDispersiones = useMemo(() => {
    return data.dispersiones.filter((d) => {
      const match =
        d.codigo.toLowerCase().includes(search.toLowerCase()) ||
        d.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        (d.referencia && d.referencia.toLowerCase().includes(search.toLowerCase()));
      return match;
    });
  }, [data.dispersiones, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente o referencia..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {filteredDispersiones.length} dispersiones registradas
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Monto (COP)</th>
                <th className="py-3 px-4">Origen / Banco</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4 text-center">Comprobante</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDispersiones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron dispersiones registradas
                  </td>
                </tr>
              ) : (
                filteredDispersiones.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{d.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(d.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{d.clienteNombre}</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(d.monto)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {d.origenFondos || 'Bancolombia'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{d.referencia || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      {d.comprobanteUrl ? (
                        <button
                          onClick={() => setSelectedReceipt({ url: d.comprobanteUrl!, title: `Comprobante ${d.codigo}` })}
                          className="w-7 h-7 rounded-lg overflow-hidden border border-border inline-flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <img src={d.comprobanteUrl} alt="Comprobante" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Exitosa'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        imageUrl={selectedReceipt?.url || null}
        title={selectedReceipt?.title}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
