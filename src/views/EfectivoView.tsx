import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP, formatDate } from '../utils/formatters';

export const EfectivoView: React.FC = () => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const { totalIngresos, totalPagos, balanceEfectivo, filteredMovimientos } = useMemo(() => {
    let ingresos = 0;
    let pagos = 0;

    data.efectivo.forEach((m) => {
      if (m.tipo === 'Ingreso') ingresos += m.monto;
      else pagos += m.monto;
    });

    const filtered = data.efectivo.filter((m) => {
      const matchSearch =
        m.codigo.toLowerCase().includes(search.toLowerCase()) ||
        m.clienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        (m.referencia && m.referencia.toLowerCase().includes(search.toLowerCase()));
      const matchTipo = !filterTipo || m.tipo === filterTipo;
      return matchSearch && matchTipo;
    });

    return {
      totalIngresos: ingresos,
      totalPagos: pagos,
      balanceEfectivo: ingresos - pagos,
      filteredMovimientos: filtered
    };
  }, [data.efectivo, search, filterTipo]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Single KPI Row (Clean, no duplicate cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase">Saldo en Efectivo</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="ri-wallet-3-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(balanceEfectivo)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Disponible en caja física</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase">Total Ingresos Caja</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <i className="ri-arrow-down-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(totalIngresos)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Entradas de efectivo</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase">Total Pagos en Efectivo</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="ri-arrow-up-line" />
            </div>
          </div>
          <span className="text-xl font-bold text-foreground">{formatCOP(totalPagos)}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Entregas a clientes</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente o nota..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <option value="">Todos los movimientos</option>
            <option value="Ingreso">Ingresos</option>
            <option value="Pago">Pagos</option>
          </select>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {filteredMovimientos.length} registros
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
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4 text-right">Monto (COP)</th>
                <th className="py-3 px-4">Caja / Ubicación</th>
                <th className="py-3 px-4">Referencia / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No hay movimientos de efectivo registrados
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">{m.codigo}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(m.fecha)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.tipo === 'Ingreso'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {m.clienteNombre || 'Movimiento Interno'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(m.monto)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                        {m.origenFondos || 'Caja Efectivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{m.referencia || '—'}</td>
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
