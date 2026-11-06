import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatCurrency, formatDate } from '../utils/formatters';

export const NegociosView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');

  const filteredNegocios = useMemo(() => {
    return data.negocios.filter((n) => {
      const matchSearch =
        n.codigo.toLowerCase().includes(search.toLowerCase()) ||
        n.clienteNombre.toLowerCase().includes(search.toLowerCase());
      const matchDivisa = !selectedDivisa || n.divisaCodigo === selectedDivisa;
      return matchSearch && matchDivisa;
    });
  }, [data.negocios, search, selectedDivisa]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o cliente..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDivisa}
            onChange={(e) => setSelectedDivisa(e.target.value)}
            className="px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Todas las divisas</option>
            {data.divisas.map((d) => (
              <option key={d.id} value={d.codigo}>
                {d.codigo}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {filteredNegocios.length} negocios
          </span>
        </div>
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
                <th className="py-3 px-4">Divisa</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-right">Tasa</th>
                <th className="py-3 px-4 text-right">Ingreso (COP)</th>
                <th className="py-3 px-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNegocios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron operaciones de negocio
                  </td>
                </tr>
              ) : (
                filteredNegocios.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{n.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(n.fecha)}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{n.clienteNombre}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                        {n.divisaCodigo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {formatCurrency(n.montoDivisa, n.divisaCodigo)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ${n.tasaCambio.toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(n.ingresoCOP)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {n.estado || 'Completado'}
                      </span>
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
