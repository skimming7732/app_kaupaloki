import { ClientSearchSelect } from '../components/common/ClientSearchSelect';
import { KpiStrip, sumRows, totalsByCurrency } from '../components/common/KpiStrip';
import { TableSelectFilter } from '../components/common/TableSelectFilter';
import { DateRangeFilter, matchesDateRange } from '../components/common/DateRangeFilter';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatRate, formatCOP, formatCurrency, formatDate } from '../utils/formatters';
import { EditNegocioModal } from '../components/modals/EditNegocioModal';
import { AddNegocioModal } from '../components/modals/AddNegocioModal';

interface NegociosViewProps {
  onOpenAddNegocio?: () => void;
}

export const NegociosView: React.FC<NegociosViewProps> = ({ onOpenAddNegocio }) => {
  const { data } = useData();
  const { profile } = useAuth();
  const isOperador = profile?.role === 'operador';
  const authorizedCurrencies = profile?.authorized_currencies || [];

  const [isAddOpen, setIsAddOpen] = useState(false);

  // Available divisas for dropdown (filtered if Operador)
  const availableDivisas = useMemo(() => {
    if (isOperador && authorizedCurrencies.length > 0) {
      return data.divisas.filter((d) => authorizedCurrencies.includes(d.codigo));
    }
    return data.divisas;
  }, [data.divisas, isOperador, authorizedCurrencies]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDivisa, setSelectedDivisa] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Selected negocio for editing
  const [editingNegocio, setEditingNegocio] = useState<any | null>(null);

  const totalVisible = isOperador && authorizedCurrencies.length ? data.negocios.filter((n) => authorizedCurrencies.includes(n.divisaCodigo)).length : data.negocios.length;
  const filteredNegocios = useMemo(() => {
    return data.negocios.filter((n) => {
      // Currency restriction for Operador
      if (isOperador && authorizedCurrencies.length > 0) {
        if (!authorizedCurrencies.includes(n.divisaCodigo)) {
          return false;
        }
      }

      const matchSearch =
        n.codigo.toLowerCase().includes(search.toLowerCase()) ||
        n.clienteNombre.toLowerCase().includes(search.toLowerCase());
      const matchDivisa = !selectedDivisa || n.divisaCodigo === selectedDivisa;
      const matchCliente =
        !selectedCliente ||
        n.clienteId === selectedCliente ||
        n.clienteNombre.toLowerCase().includes(selectedCliente.toLowerCase());

      const matchFecha = matchesDateRange(n.fecha, fechaDesde, fechaHasta);

      return matchSearch && matchDivisa && matchCliente && matchFecha;
    });
  }, [data.negocios, search, selectedDivisa, selectedCliente, fechaDesde, fechaHasta, isOperador, authorizedCurrencies]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button (Like /efectivo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Operaciones Cambiarias</h2>
          <p className="text-xs text-muted-foreground">Registro y control de conversiones en tiempo real</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddNegocio ? onOpenAddNegocio : () => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-add-line text-sm" />
          <span>Registrar Negocio</span>
        </button>
      </div>

      {/* Comprehensive Filter Bar: Fecha Desde - Hasta, Cliente, Divisa, Búsqueda */}
      <div className="p-3 rounded-2xl bg-card border border-border space-y-2">
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o cliente..."
              className="h-8 w-full pl-8 pr-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Divisa */}
          <div>
            <TableSelectFilter label="Divisa" value={selectedDivisa} onChange={setSelectedDivisa} className="w-full">
              <option value="">Todas las divisas</option>
              {availableDivisas.map((d) => (
                <option key={d.id} value={d.codigo}>
                  {d.codigo}
                </option>
              ))}
            </TableSelectFilter>
          </div>

            <ClientSearchSelect value={selectedCliente} onChange={setSelectedCliente} placeholder="Todos los clientes" compact />
          {/* Fecha Desde */}
          <DateRangeFilter from={fechaDesde} to={fechaHasta} setFrom={setFechaDesde} setTo={setFechaHasta} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{formatNumber(filteredNegocios.length)} de {formatNumber(totalVisible)} registros</span>
            {(search || selectedDivisa || selectedCliente || fechaDesde || fechaHasta) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDivisa('');
                  setSelectedCliente('');
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                type="button" className="text-primary hover:underline font-semibold text-xs"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      <KpiStrip metrics={([
        ['Negocios', filteredNegocios.length],
        ['Total Monto', totalsByCurrency(filteredNegocios, (n) => n.divisaCodigo, (n) => n.montoDivisa)],
        ['Total Ingreso (COP)', formatCOP(sumRows(filteredNegocios, (n) => n.ingresoCOP))],
      ] as const).map(([label, value]) => ({ label, value }))} />

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
                <th className="py-3 px-4 text-center">Acciones</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNegocios.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No se encontraron operaciones de negocio
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={10} rows={filteredNegocios}>{(n) => (
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
                      {formatNumber(n.montoDivisa, 2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ${formatRate(n.tasaCambio)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(n.ingresoCOP)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        {n.estado || 'Completado'}
                      </span>
                    </td>
                    {/* Action: Edit */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setEditingNegocio(n)}
                        title="Editar negocio"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <i className="ri-edit-line text-sm" />
                      </button>
                    </td>
                    <CreatedByCell name={n.createdByName} />
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddNegocioModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      <EditNegocioModal
        isOpen={Boolean(editingNegocio)}
        negocio={editingNegocio}
        onClose={() => setEditingNegocio(null)}
      />
    </div>
  );
};
