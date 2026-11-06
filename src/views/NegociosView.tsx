import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { useAuth } from '../context/AuthContext';
import { formatCOP, formatCurrency, formatDate } from '../utils/formatters';
import { EditNegocioModal } from '../components/modals/EditNegocioModal';

export const NegociosView: React.FC = () => {
  const { data } = useAirtable();
  const { profile } = useAuth();
  const isOperador = profile?.role === 'operador';
  const authorizedCurrencies = profile?.authorized_currencies || [];

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

      let matchFecha = true;
      if (fechaDesde && n.fecha) {
        matchFecha = matchFecha && n.fecha >= fechaDesde;
      }
      if (fechaHasta && n.fecha) {
        matchFecha = matchFecha && n.fecha <= fechaHasta;
      }

      return matchSearch && matchDivisa && matchCliente && matchFecha;
    });
  }, [data.negocios, search, selectedDivisa, selectedCliente, fechaDesde, fechaHasta, isOperador, authorizedCurrencies]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Comprehensive Filter Bar: Fecha Desde - Hasta, Cliente, Divisa, Búsqueda */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o cliente..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Divisa */}
          <div>
            <select
              value={selectedDivisa}
              onChange={(e) => setSelectedDivisa(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Todas las divisas</option>
              {availableDivisas.map((d) => (
                <option key={d.id} value={d.codigo}>
                  {d.codigo}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">Desde:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">Hasta:</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Cliente quick selector */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold">Cliente:</span>
            <select
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-input bg-background text-xs text-foreground focus:ring-1 focus:ring-primary outline-none max-w-xs"
            >
              <option value="">Todos los clientes</option>
              {data.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>{filteredNegocios.length} negocios</span>
            {(search || selectedDivisa || selectedCliente || fechaDesde || fechaHasta) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDivisa('');
                  setSelectedCliente('');
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="text-primary hover:underline font-semibold text-xs"
              >
                Limpiar filtros
              </button>
            )}
          </div>
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
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredNegocios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Negocio Modal */}
      <EditNegocioModal
        isOpen={Boolean(editingNegocio)}
        negocio={editingNegocio}
        onClose={() => setEditingNegocio(null)}
      />
    </div>
  );
};
