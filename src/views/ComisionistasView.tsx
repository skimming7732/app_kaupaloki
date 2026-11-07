import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable, type NormalizedData } from '../context/AirtableContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { AddComisionistaModal } from '../components/modals/AddComisionistaModal';

export const ComisionistasView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<NormalizedData['comisionistas'][number]>();

  const { filteredComisionistas } = useMemo(() => {

    const filtered = data.comisionistas.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.comisionistaNombre.toLowerCase().includes(q) ||
        c.comisionaDeNombres.some((n) => n.toLowerCase().includes(q))
      );
    });

    return {
      filteredComisionistas: filtered,
    };
  }, [data.comisionistas, search]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Comisionistas</h2>
          <p className="text-xs text-muted-foreground">Control y cálculo automático de comisiones sobre clientes asignados</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-user-star-line text-sm" />
          <span>Nuevo Comisionista</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por comisionista o cliente..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {formatNumber(filteredComisionistas.length)} registros encontrados
        </span>
      </div>

      <KpiStrip metrics={([
        ['Comisionistas', filteredComisionistas.length],
        ['Ingresos referidos', formatCOP(sumRows(filteredComisionistas, (c) => c.ingresosCOP))],
        ['Comisiones', formatCOP(sumRows(filteredComisionistas, (c) => c.comisionesCOP))],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Comisionista</th>
                <th className="py-3 px-4">Clientes de los que comisiona</th>
                <th className="py-3 px-4 text-right">Ingresos Base</th>
                <th className="py-3 px-4 text-right">% Comisión</th>
                <th className="py-3 px-4 text-right">Comisiones (COP)</th>
                <th className="py-3 px-4">Fecha</th>
                <CreatedByHeader />
                <th className="py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredComisionistas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground text-2xl">
                        <i className="ri-user-star-line" />
                      </div>
                      <span className="font-semibold text-foreground">No hay comisionistas registrados aún</span>
                      <span className="text-[11px] text-muted-foreground max-w-sm">
                        Haz clic en &quot;Nuevo Comisionista&quot; para vincular clientes y porcentajes de liquidación comercial.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={9} rows={filteredComisionistas}>{(c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{c.codigo}</td>
                    <td className="py-3 px-4 font-bold text-foreground">{c.comisionistaNombre}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.comisionaDeNombres.length === 0 ? (
                          <span className="text-muted-foreground italic text-[11px]">Sin clientes asignados</span>
                        ) : (
                          c.comisionaDeNombres.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-medium border border-border"
                            >
                              {name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                      {formatCOP(c.ingresosCOP)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                      {formatNumber(c.porcentajeComision * 100, 2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500">
                      {formatCOP(c.comisionesCOP)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(c.fechaCreacion)}</td>
                    <CreatedByCell name={c.createdByName} />
                    <td className="px-4">
                      <button type="button" onClick={() => setEditing(c)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted">
                        <i className="ri-edit-line" aria-hidden="true" /> Editar
                      </button>
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddComisionistaModal isOpen={isAddOpen || Boolean(editing)} record={editing} onClose={() => { setIsAddOpen(false); setEditing(undefined); }} />
    </div>
  );
};
