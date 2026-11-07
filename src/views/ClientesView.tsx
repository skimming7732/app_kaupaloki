import { KpiStrip, sumRows } from '../components/common/KpiStrip';
import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAirtable } from '../context/AirtableContext';
import { formatCOP } from '../utils/formatters';
import { AddClienteModal } from '../components/modals/AddClienteModal';
import { ShareClientModal } from '../components/modals/ShareClientModal';

interface ClientesViewProps {
  onOpenAddCliente?: () => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({ onOpenAddCliente }) => {
  const { data } = useAirtable();
  const [search, setSearch] = useState('');
  const [sharingClient, setSharingClient] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const navigate = useNavigate();

  const filteredClientes = useMemo(() => {
    return data.clientes.filter((c) => {
      const match =
        c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.codigo.toLowerCase().includes(search.toLowerCase());
      return match;
    });
  }, [data.clientes, search]);

  const getStatusBadge = (estado: string) => {
    const norm = (estado || 'PENDIENTE').toUpperCase();
    if (norm.includes('PAGADO')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">PAGADO</span>;
    }
    if (norm.includes('DEBE')) {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">DEBE</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">PENDIENTE</span>;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header Row with Action Button (Like /efectivo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h2 className="text-base font-bold text-foreground">Gestión de Clientes</h2>
          <p className="text-xs text-muted-foreground">Cuentas, estados de saldo y enlaces de consulta pública</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddCliente ? onOpenAddCliente : () => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
        >
          <i className="ri-user-add-line text-sm" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Search and count */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
        <div className="relative w-full sm:w-80">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {filteredClientes.length} clientes registrados
        </span>
      </div>

      <KpiStrip metrics={([
        ['Clientes', filteredClientes.length],
        ['Ingresos COP', formatCOP(sumRows(filteredClientes, (c) => c.totalIngresosCOP))],
        ['Dispersado COP', formatCOP(sumRows(filteredClientes, (c) => c.totalDispersadoCOP))],
        ['Pendiente COP', formatCOP(sumRows(filteredClientes, (c) => c.saldoPendienteCOP))],
      ] as const).map(([label, value]) => ({ label, value }))} />

      {/* Clientes Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4 text-right">Total Negocios</th>
                <th className="py-3 px-4 text-right">Total Dispersado</th>
                <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={8} rows={filteredClientes}>{(c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/cliente/${c.codigo.toLowerCase()}?from=dashboard`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Merged Name and Code */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {c.nombre || 'Sin nombre'}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {c.codigo}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground">{c.pais || 'Colombia'}</td>
                    
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {formatCOP(c.totalIngresosCOP)}
                    </td>
                    
                    <td className="py-3 px-4 text-right font-medium text-emerald-500">
                      {formatCOP(c.totalDispersadoCOP)}
                    </td>
                    
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      {formatCOP(c.saldoPendienteCOP)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(c.estado)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSharingClient(c)}
                          title="Compartir enlace y mensaje de WhatsApp"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                        >
                          <i className="ri-share-forward-line text-sm" />
                        </button>
                        <button
                          onClick={() => navigate(`/cliente/${c.codigo.toLowerCase()}?from=dashboard`)}
                          title="Ver estado de cuenta"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <i className="ri-external-link-line" />
                        </button>
                      </div>
                    </td>
                    <CreatedByCell name={c.createdByName} />
                  </tr>
                )}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Cliente Modal */}
      <AddClienteModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
      {/* Share Client WhatsApp & Portal Modal */}
      {sharingClient && (
        <ShareClientModal isOpen onClose={() => setSharingClient(null)} cliente={sharingClient} />
      )}
    </div>
  );
};
