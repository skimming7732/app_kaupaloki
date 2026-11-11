import { useWriteAccess } from '../utils/useWriteAccess';
import { CLIENT_COUNTRIES, findClientCountry, getClientCountryIso } from '../data/clientCountries';
import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { CreatedByCell, CreatedByHeader, formatAuthorName } from '../components/common/CreatedByCell';
import { CreatedByFilter } from '../components/common/CreatedByFilter';
import { FilterModal, FilterTriggerButton } from '../components/common/FilterModal';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatCOP, formatNumber, normalizeSearch } from '../utils/formatters';
import { AddClienteModal } from '../components/modals/AddClienteModal';
import { EditClienteModal } from '../components/modals/EditClienteModal';
import { ShareClientModal } from '../components/modals/ShareClientModal';

interface ClientesViewProps {
  onOpenAddCliente?: () => void;
}

type SortField = 'nombre' | 'pais' | 'totalNegocios' | 'totalIngresosCOP' | 'totalDispersadoCOP' | 'saldoPendienteCOP' | 'porCobrarCOP' | 'totalComisionesCOP' | 'estado';
const countryKey = (pais?: string) => findClientCountry(pais || 'COLOMBIA')?.value ?? normalizeSearch(pais?.trim() || 'COLOMBIA').toUpperCase();

export const ClientesView: React.FC<ClientesViewProps> = ({ onOpenAddCliente }) => {
  const canWrite = useWriteAccess('clients');
  const { data, loading } = useData();
  const { profile } = useAuth();
  const canFilterComisiones = ['administrador', 'super_admin', 'supervisor'].includes(profile?.role || '');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [pais, setPais] = useState('');
  const [tieneComisionista, setTieneComisionista] = useState('');
  const [esComisionista, setEsComisionista] = useState('');
  const [filterCreador, setFilterCreador] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sharingClient, setSharingClient] = useState<any | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('saldoPendienteCOP');
  const [sortAsc, setSortAsc] = useState<boolean>(false); // Default: Descending (mayor saldo pendiente primero)
  const navigate = useNavigate();

  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    data.clientes.forEach((c) => {
      map.set(c.id, c);
      map.set(c.codigo, c);
    });
    return map;
  }, [data.clientes]);

  const referidos = useMemo(() => new Set(
    data.comisionistas.flatMap((comisionista) => comisionista.comisionaDeIds)
      .filter((id) => typeof id === 'string')
      .map((id) => id.trim().toLowerCase())
  ), [data.comisionistas]);
  const paises = useMemo(() => {
    const options = new Map(CLIENT_COUNTRIES.map((country) => [country.value, country.label]));
    for (const cliente of data.clientes) {
      const key = countryKey(cliente.pais);
      if (!options.has(key)) options.set(key, cliente.pais?.trim() || key);
    }
    return [...options].sort((left, right) => left[1].localeCompare(right[1], 'es'));
  }, [data.clientes]);
  const activeSecondaryCount = (estado ? 1 : 0) + (pais ? 1 : 0) + (filterCreador ? 1 : 0) + (tieneComisionista ? 1 : 0) + (esComisionista ? 1 : 0);
  const filtrosActivos = Boolean(search || activeSecondaryCount > 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'nombre' || field === 'pais' || field === 'estado');
    }
  };

  const filteredClientes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.clientes.filter((c) => {
      if (!c.nombre.toLowerCase().includes(query) && !c.codigo.toLowerCase().includes(query)) return false;
      if (estado && c.estado !== estado) return false;
      if (pais && countryKey(c.pais) !== pais) return false;
      if (filterCreador && formatAuthorName(c.createdByName, c.createdBy, data.usuarios).toLowerCase() !== filterCreador.toLowerCase()) return false;
      if (!canFilterComisiones) return true;
      if (esComisionista && c.esComisionista !== (esComisionista === 'si')) return false;
      const tieneAsignado = referidos.has(c.id.toLowerCase()) || referidos.has(c.codigo.toLowerCase());
      return !tieneComisionista || tieneAsignado === (tieneComisionista === 'si');
    });
  }, [data.clientes, data.usuarios, referidos, search, estado, pais, filterCreador, tieneComisionista, esComisionista, canFilterComisiones]);

  const sortedClientes = useMemo(() => {
    return [...filteredClientes].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === 'nombre') {
        valA = (a.nombre || a.codigo || '').toLowerCase();
        valB = (b.nombre || b.codigo || '').toLowerCase();
      } else if (sortField === 'pais' || sortField === 'estado') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      } else {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      }

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB || '');
        return sortAsc ? cmp : -cmp;
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredClientes, sortField, sortAsc]);

  const getStatusBadge = (estado: string) => {
    const norm = (estado || 'SIN ACTIVIDAD').toUpperCase();
    if (norm.includes('ACTIVIDAD') || norm.includes('INACTIVO')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/60">
          SIN ACTIVIDAD
        </span>
      );
    }
    if (norm.includes('PAGADO')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
          PAGADO
        </span>
      );
    }
    if (norm.includes('DEBE')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">
          DEBE
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">
        PENDIENTE
      </span>
    );
  };

  const renderSortTh = (label: string, field: SortField, align: 'left' | 'center' | 'right' = 'left') => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-4 cursor-pointer select-none hover:text-foreground transition-colors ${
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
        } ${isActive ? 'text-primary font-bold' : ''}`}
      >
        <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <i
            className={`text-xs ${
              isActive
                ? sortAsc
                  ? 'ri-arrow-up-line text-primary'
                  : 'ri-arrow-down-line text-primary'
                : 'ri-arrow-up-down-line opacity-40 hover:opacity-100'
            }`}
          />
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Gestión de Clientes</h2>
          <p className="text-xs text-muted-foreground">Cuentas, estados de saldo, comisiones y enlaces de consulta pública</p>
        </div>
        {canWrite && (<button
          type="button"
          onClick={onOpenAddCliente ? onOpenAddCliente : () => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-user-add-line text-sm" />
          <span>Nuevo Cliente</span>
        </button>)}
      </div>

      {/* Filter Bar: Desktop & Mobile (Search + Filtros) */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar clientes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o código..."
              className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Popup Filter Trigger Button */}
          <FilterTriggerButton
            onClick={() => setIsFilterOpen(true)}
            activeCount={activeSecondaryCount}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-xs">
          <span className="mr-auto font-medium text-muted-foreground" aria-live="polite">
            {formatNumber(sortedClientes.length)} de {formatNumber(data.clientes.length)} clientes
          </span>
          {filtrosActivos && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setEstado('');
                setPais('');
                setFilterCreador('');
                setTieneComisionista('');
                setEsComisionista('');
              }}
              className="font-semibold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
          {sortField !== 'saldoPendienteCOP' || sortAsc !== false ? (
            <button
              type="button"
              onClick={() => {
                setSortField('saldoPendienteCOP');
                setSortAsc(false);
              }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Restablecer orden
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtros de Clientes"
        activeCount={activeSecondaryCount}
        onClear={() => {
          setEstado('');
          setPais('');
          setFilterCreador('');
          setTieneComisionista('');
          setEsComisionista('');
        }}
      >
        {/* Estado Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
          <TableSelectFilter label="Estado" value={estado} onChange={setEstado} className="w-full">
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="DEBE">Debe</option>
            <option value="SIN ACTIVIDAD">Sin actividad</option>
          </TableSelectFilter>
        </div>

        {/* Pais Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">País</label>
          <TableSelectFilter label="País" value={pais} onChange={setPais} className="w-full">
            <option value="">Todos los países</option>
            {paises.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </TableSelectFilter>
        </div>

        {/* Creador Filter */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Creado por</label>
          <CreatedByFilter
            value={filterCreador}
            onChange={setFilterCreador}
            records={data.clientes}
            className="w-full"
          />
        </div>

        {canFilterComisiones && (
          <div className="pt-3 border-t border-border space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tiene comisionista</label>
              <TableSelectFilter label="Tiene comisionista" value={tieneComisionista} onChange={setTieneComisionista} className="w-full">
                <option value="">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </TableSelectFilter>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Es comisionista</label>
              <TableSelectFilter label="Es comisionista" value={esComisionista} onChange={setEsComisionista} className="w-full">
                <option value="">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </TableSelectFilter>
            </div>
          </div>
        )}
      </FilterModal>

      <KpiStrip metrics={([
        ['Clientes', sortedClientes.length],
        ['Total Negocios', formatNumber(sumRows(sortedClientes, (c) => c.totalNegocios ?? 0))],
        ['Total Pagado', formatCOP(sumRows(sortedClientes, (c) => c.totalDispersadoCOP))],
        ['Por pagar', formatCOP(sumRows(sortedClientes, (c) => c.saldoPendienteCOP))],
        ['Por cobrar', formatCOP(sumRows(sortedClientes, (c) => c.porCobrarCOP))],
        ['Total Comisiones', formatCOP(sumRows(sortedClientes, (c) => c.totalComisionesCOP ?? 0))],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                {renderSortTh('Cliente', 'nombre', 'left')}
                {renderSortTh('NEG.', 'totalNegocios', 'center')}
                {renderSortTh('Total Ingresos', 'totalIngresosCOP', 'right')}
                {renderSortTh('Total Pagado', 'totalDispersadoCOP', 'right')}
                {renderSortTh('Por pagar', 'saldoPendienteCOP', 'right')}
                {renderSortTh('Por cobrar', 'porCobrarCOP', 'right')}
                <th className="py-3 px-4 text-center">Comisiona de</th>
                {renderSortTh('Total Comisiones', 'totalComisionesCOP', 'right')}
                {renderSortTh('Estado', 'estado', 'center')}
                <th className="py-3 px-4 text-center">Acciones</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedClientes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-loader-4-line animate-spin text-lg text-primary" />
                        <span>Cargando clientes...</span>
                      </span>
                    ) : (
                      'No se encontraron clientes'
                    )}
                  </td>
                </tr>
              ) : (
                <PaginatedRows pageSize={100} columns={11} rows={sortedClientes}>{(c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/clientes/${c.codigo.toLowerCase()}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Merged Name, ISO tag and Code */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border shrink-0">
                          {getClientCountryIso(c.pais)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {c.nombre || 'Sin nombre'}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {c.codigo}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-3 px-4 text-center font-mono font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
                        {formatNumber(c.totalNegocios ?? 0)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap">
                      {formatCOP(c.totalIngresosCOP)}
                    </td>
                    
                    <td className="py-3 px-4 text-right font-medium text-emerald-500 whitespace-nowrap">
                      {formatCOP(c.totalDispersadoCOP)}
                    </td>
                    
                    <td className="py-3 px-4 text-right font-bold text-foreground whitespace-nowrap">
                      {formatCOP(c.saldoPendienteCOP)}
                    </td>
                    <td className={'py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ' + (c.porCobrarCOP > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {formatCOP(c.porCobrarCOP)}
                    </td>

                    {/* Comisiona de: Compact count badge with full names tooltip */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {c.esComisionista && c.comisionaDeIds && c.comisionaDeIds.length > 0 ? (
                        (() => {
                          const referidosList = c.comisionaDeIds.map((refId) => {
                            const refClient = clientMap.get(refId);
                            return refClient ? `${refClient.codigo} (${refClient.nombre})` : refId;
                          }).join(', ');
                          return (
                            <span
                              title={`Comisiona de: ${referidosList}`}
                              className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-xs font-bold border border-purple-500/20"
                            >
                              {c.comisionaDeIds.length}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    {/* Total Comisiones */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {c.esComisionista ? (
                        <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                          {formatCOP(c.totalComisionesCOP)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(c.estado)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {canWrite && (<button
                          type="button"
                          onClick={() => setEditingClient(c)}
                          title="Editar cliente"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <i className="ri-edit-line text-sm" />
                        </button>)}
                        {canWrite && (<button
                          type="button"
                          onClick={() => setSharingClient(c)}
                          title="Compartir enlace y mensaje de WhatsApp"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        >
                          <i className="ri-share-forward-line text-sm" />
                        </button>)}
                        <button
                          type="button"
                          onClick={() => navigate(`/cliente/${c.codigo.toLowerCase()}?from=panel-control`)}
                          title="Ver estado de cuenta"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <i className="ri-external-link-line" />
                        </button>
                      </div>
                    </td>
                    <CreatedByCell name={c.createdByName} createdBy={c.createdBy} />
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View ("Cajitas") */}
      <div className="block md:hidden space-y-3">
        {sortedClientes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground text-xs shadow-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin text-lg text-primary" />
                <span>Cargando clientes...</span>
              </span>
            ) : (
              'No se encontraron clientes'
            )}
          </div>
        ) : (
          sortedClientes.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/clientes/${c.codigo.toLowerCase()}`)}
              className="p-4 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border shrink-0">
                      {getClientCountryIso(c.pais)}
                    </span>
                    <h4 className="font-bold text-sm text-foreground truncate">{c.nombre || 'Sin nombre'}</h4>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.codigo}</p>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(c.estado)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Ingresos COP</span>
                  <span className="font-semibold text-foreground text-xs">{formatCOP(c.totalIngresosCOP)}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Pagado COP</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{formatCOP(c.totalDispersadoCOP)}</span>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-[10px] font-medium text-muted-foreground block">Por pagar</span>
                  <span className="font-bold text-foreground text-xs">{formatCOP(c.saldoPendienteCOP)}</span>
                </div>
                <div className={`p-2.5 rounded-xl ${c.porCobrarCOP > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/30 text-muted-foreground'}`}>
                  <span className="text-[10px] font-medium block">Por cobrar</span>
                  <span className="font-bold text-xs">{formatCOP(c.porCobrarCOP)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                    {formatNumber(c.totalNegocios ?? 0)} neg.
                  </span>
                  {c.esComisionista && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                      Comisionista
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setEditingClient(c)}
                      title="Editar cliente"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <i className="ri-edit-line text-sm" />
                    </button>
                  )}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setSharingClient(c)}
                      title="Compartir enlace"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    >
                      <i className="ri-share-forward-line text-sm" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/cliente/${c.codigo.toLowerCase()}?from=panel-control`)}
                    title="Ver estado de cuenta"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <i className="ri-external-link-line text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Add Cliente Modal */}
      <AddClienteModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Edit Cliente Modal */}
      {editingClient && (
        <EditClienteModal
          isOpen={Boolean(editingClient)}
          cliente={editingClient}
          onClose={() => setEditingClient(null)}
        />
      )}

      {/* Share Client WhatsApp & Portal Modal */}
      {sharingClient && (
        <ShareClientModal isOpen onClose={() => setSharingClient(null)} cliente={sharingClient} />
      )}
    </div>
  );
};
