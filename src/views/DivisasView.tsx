import { AddCatalogButton } from '../components/modals/AddCatalogButton';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCurrency } from '../utils/formatters';

export const DivisasView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');

  const filteredDivisas = data.divisas.filter((d) => {
    return (
      d.codigo.toLowerCase().includes(search.toLowerCase()) ||
      d.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (d.pais && d.pais.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ISO, nombre o país..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{filteredDivisas.length} divisas configuradas</span>
          <AddCatalogButton table="divisas" />
        </div>
      </div>

      {/* De-compressed Clean Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código ISO</th>
                <th className="py-3 px-4">Nombre de la Divisa</th>
                <th className="py-3 px-4">País / Región</th>
                <th className="py-3 px-4 text-right">Total Recibido</th>
                <th className="py-3 px-4 text-right">Total Comprado</th>
                <th className="py-3 px-4 text-right">Total Pendiente</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDivisas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No hay divisas que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filteredDivisas.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold font-mono text-xs">
                        {d.codigo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{d.nombre}</td>
                    <td className="py-3 px-4 text-muted-foreground">{d.pais || 'Internacional'}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatCurrency(d.totalRecibido, d.codigo)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatCurrency(d.totalComprado, d.codigo)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-500">
                      {formatCurrency(d.totalPendiente, d.codigo)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {d.estado || 'Activo'}
                      </span>
                    </td>
                    <CreatedByCell name={d.createdByName} />
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
