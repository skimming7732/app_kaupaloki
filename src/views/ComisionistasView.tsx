import { useWriteAccess } from '../utils/useWriteAccess';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import React, { useState, useMemo } from 'react';
import { useData, type NormalizedData } from '../context/DataContext';
import { formatNumber, formatCOP, formatDate } from '../utils/formatters';
import { AddComisionistaModal } from '../components/modals/AddComisionistaModal';

export const ComisionistasView: React.FC = () => {
  const canWrite = useWriteAccess('admin');
  const { data } = useData();
  const [search, setSearch] = useState('');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<'comisionesCOP' | 'ingresosCOP' | 'porcentajeComision' | 'comisionistaNombre' | 'codigo' | 'fechaCreacion'>('comisionesCOP');
  const [sortAsc, setSortAsc] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<NormalizedData['comisionistas'][number]>();

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'comisionistaNombre' || field === 'codigo');
    }
  };

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <i className="ri-expand-up-down-line text-[11px] opacity-40" />;
    return <i className={sortAsc ? 'ri-arrow-up-s-fill text-primary text-xs' : 'ri-arrow-down-s-fill text-primary text-xs'} />;
  };

  const { filteredComisionistas } = useMemo(() => {
    const filtered = data.comisionistas.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.comisionistaNombre.toLowerCase().includes(q) ||
        c.comisionaDeNombres.some((n) => n.toLowerCase().includes(q))
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortField) {
        case 'comisionesCOP':
          return (a.comisionesCOP - b.comisionesCOP) * dir || a.codigo.localeCompare(b.codigo);
        case 'ingresosCOP':
          return (a.ingresosCOP - b.ingresosCOP) * dir || a.codigo.localeCompare(b.codigo);
        case 'porcentajeComision':
          return (a.porcentajeComision - b.porcentajeComision) * dir || a.codigo.localeCompare(b.codigo);
        case 'comisionistaNombre':
          return a.comisionistaNombre.localeCompare(b.comisionistaNombre, 'es') * dir;
        case 'fechaCreacion':
          return String(a.fechaCreacion || '').localeCompare(String(b.fechaCreacion || '')) * dir;
        case 'codigo':
        default:
          return a.codigo.localeCompare(b.codigo, undefined, { numeric: true }) * dir;
      }
    });

    return {
      filteredComisionistas: sorted,
    };
  }, [data.comisionistas, data.usuarios, search, filterCreador, sortField, sortAsc]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Comisionistas</h2>
          <p className="text-xs text-muted-foreground">Control y cálculo automático de comisiones sobre clientes asignados</p>
        </div>
        {canWrite && (<button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-user-star-line text-sm" />
          <span>Nuevo Comisionista</span>
        </button>)}
      </div>

      {/* Filter Bar: Desktop & Mobile (Search + Filtros) */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por comisionista o cliente..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Popup Filter Trigger Button */}
          <FilterTriggerButton
            onClick={() => setIsFilterOpen(true)}
            activeCount={filterCreador ? 1 : 0}
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{formatNumber(filteredComisionistas.length)} de {formatNumber(data.comisionistas.length)} comisionistas</span>
          {(search || filterCreador) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterCreador('');
              }}
              className="font-semibold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros de Comisionistas"
        activeCount={filterCreador ? 1 : 0}
        onClear={() => setFilterCreador('')}
      >
        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={filterCreador}
            onChange={setFilterCreador}
            records={data.comisionistas}
            className="w-full"
          />
        </div>
      </FilterModal>

      <KpiStrip metrics={([
        ['Comisionistas', filteredComisionistas.length],
        ['Ingresos referidos', formatCOP(sumRows(filteredComisionistas, (c) => c.ingresosCOP))],
        ['Comisiones', formatCOP(sumRows(filteredComisionistas, (c) => c.comisionesCOP))],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">
                  <button type="button" onClick={() => handleSort('codigo')} className="inline-flex items-center gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors">
                    <span>Código</span>{renderSortIcon('codigo')}
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button type="button" onClick={() => handleSort('comisionistaNombre')} className="inline-flex items-center gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors">
                    <span>Comisionista</span>{renderSortIcon('comisionistaNombre')}
                  </button>
                </th>
                <th className="py-3 px-4">Clientes de los que comisiona</th>
                <th className="py-3 px-4 text-right">
                  <button type="button" onClick={() => handleSort('ingresosCOP')} className="inline-flex items-center justify-end gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors ml-auto">
                    <span>Ingresos Base</span>{renderSortIcon('ingresosCOP')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button type="button" onClick={() => handleSort('porcentajeComision')} className="inline-flex items-center justify-end gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors ml-auto">
                    <span>% Comisión</span>{renderSortIcon('porcentajeComision')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button type="button" onClick={() => handleSort('comisionesCOP')} className="inline-flex items-center justify-end gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors ml-auto">
                    <span>Comisiones (COP)</span>{renderSortIcon('comisionesCOP')}
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button type="button" onClick={() => handleSort('fechaCreacion')} className="inline-flex items-center gap-1 uppercase tracking-wider font-semibold hover:text-foreground transition-colors">
                    <span>Fecha</span>{renderSortIcon('fechaCreacion')}
                  </button>
                </th>
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
                <PaginatedRows pageSize={100} columns={9} rows={filteredComisionistas}>{(c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">{c.codigo}</td>
                    <td className="py-3 px-4 font-bold text-foreground">{c.comisionistaNombre}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 max-w-xs">
                        {c.comisionaDeNombres.length === 0 ? (
                          <span className="text-muted-foreground italic text-[11px]">Sin clientes asignados</span>
                        ) : (
                          <>
                            {c.comisionaDeNombres.slice(0, 2).map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[10px] font-medium border border-border truncate max-w-[110px]"
                                title={name}
                              >
                                {name}
                              </span>
                            ))}
                            {c.comisionaDeNombres.length > 2 && (
                              <span
                                title={c.comisionaDeNombres.join(', ')}
                                className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20 shrink-0 cursor-help"
                              >
                                +{c.comisionaDeNombres.length - 2} más
                              </span>
                            )}
                          </>
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
                      {canWrite && (<button type="button" onClick={() => setEditing(c)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-muted">
                        <i className="ri-edit-line" aria-hidden="true" /> Editar
                      </button>)}
                    </td>
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View ("Cajitas") */}
      <div className="block md:hidden space-y-3">
        {filteredComisionistas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs shadow-sm">
            No hay comisionistas registrados aún
          </div>
        ) : (
          filteredComisionistas.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-foreground">{c.codigo}</span>
                    <span className="text-[11px] text-muted-foreground">{formatDate(c.fechaCreacion)}</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-0.5">{c.comisionistaNombre}</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                  {formatNumber(c.porcentajeComision * 100, 2)}%
                </span>
              </div>

              {/* Clientes referidos */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-medium">Clientes de los que comisiona:</span>
                  <span className="font-bold text-foreground">{c.comisionaDeNombres.length} asignados</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.comisionaDeNombres.length === 0 ? (
                    <span className="text-muted-foreground italic text-[11px]">Sin clientes vinculados</span>
                  ) : (
                    c.comisionaDeNombres.map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-card text-foreground text-[10px] font-medium border border-border"
                      >
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Ingresos Base</span>
                  <span className="font-mono font-bold text-foreground text-xs">{formatCOP(c.ingresosCOP)}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">Comisión Ganada</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{formatCOP(c.comisionesCOP)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                <CreatedByCell name={c.createdByName} />
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    <i className="ri-edit-line text-sm text-primary" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>


      <AddComisionistaModal isOpen={isAddOpen || Boolean(editing)} record={editing} onClose={() => { setIsAddOpen(false); setEditing(undefined); }} />
    </div>
  );
};
