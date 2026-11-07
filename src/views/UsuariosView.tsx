import { PaginatedRows } from '../components/common/PaginatedRows';
import { CreatedByCell, CreatedByHeader } from '../components/common/CreatedByCell';
import React, { useState, useMemo } from 'react';
import { useAirtable } from '../context/AirtableContext';
import type { AirtableUser } from '../context/AirtableContext';
import { EditUserModal } from '../components/modals/EditUserModal';
import { SendInviteModal } from '../components/modals/SendInviteModal';
import { DeleteUserModal } from '../components/modals/DeleteUserModal';
import { AddUserModal } from '../components/modals/AddUserModal';

export const UsuariosView: React.FC = () => {
  const { data, updateRecord } = useAirtable();
  const [selectedRole, setSelectedRole] = useState('Todos');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AirtableUser | null>(null);
  const [invitingUser, setInvitingUser] = useState<AirtableUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AirtableUser | null>(null);

  const roles = ['Todos', 'Super Admin', 'Admin', 'Operador', 'Dispersor'];

  const normalizeRole = (r: string) => {
    const s = (r || '').toLowerCase().trim();
    if (s === 'super admin' || s === 'super_admin') return 'super_admin';
    if (s === 'admin' || s === 'administrador') return 'administrador';
    if (s === 'operador' || s === 'operator') return 'operador';
    if (s === 'dispersor' || s === 'dispersador') return 'dispersor';
    return s;
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: 'Super Admin',
    administrador: 'Admin',
    operador: 'Operador',
    dispersor: 'Dispersor',
  };

  const filteredUsers = useMemo(() => {
    return data.usuarios.filter((u) => {
      const matchSearch =
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.correo.toLowerCase().includes(search.toLowerCase()) ||
        u.codigo.toLowerCase().includes(search.toLowerCase());
      const matchRole = selectedRole === 'Todos' || normalizeRole(u.rol) === normalizeRole(selectedRole);
      return matchSearch && matchRole;
    });
  }, [data.usuarios, search, selectedRole]);

  const handleCopyLink = (u: AirtableUser) => {
    const link = `${window.location.origin}/onboarding?email=${encodeURIComponent(u.correo)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleEstado = async (u: AirtableUser) => {
    const nuevoEstado = (u.estado || '').toLowerCase() === 'activo' ? 'Invitado' : 'Activo';
    setUpdatingId(u.id);
    try {
      await updateRecord('Usuarios', u.id, { Estado: nuevoEstado });
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleIcon = (rol: string) => {
    switch (normalizeRole(rol)) {
      case 'super_admin':
        return <i className="ri-vip-crown-line text-amber-500" />;
      case 'administrador':
        return <i className="ri-shield-user-line text-blue-500" />;
      case 'dispersor':
        return <i className="ri-send-plane-line text-purple-500" />;
      default:
        return <i className="ri-user-star-line text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Role Filter Bar & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        {/* Roles pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === r
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Search & Add Action */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuario o correo..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center gap-1.5 whitespace-nowrap transition-all"
          >
            <i className="ri-user-add-line text-sm" />
            <span>Invitar Usuario</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 font-bold">Código</th>
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">País</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4">Divisas</th>
                <th className="py-3.5 px-4 text-center">Estado (Click para cambiar)</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
                <CreatedByHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                <PaginatedRows columns={8} rows={filteredUsers}>{(u) => {
                  const isActivo = (u.estado || '').toLowerCase() === 'activo';
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      {/* Prominent Code Column - No row numbers */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 tracking-wide shadow-sm">
                          {u.codigo}
                        </span>
                      </td>

                      {/* User with avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center text-sm border border-border">
                            {getRoleIcon(u.rol)}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">{u.nombre || 'Sin nombre'}</span>
                            <span className="text-[11px] text-muted-foreground">{u.correo}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground font-medium">{u.pais || 'Colombia'}</td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-foreground border border-border">
                          {roleLabelMap[normalizeRole(u.rol)] || u.rol}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {['administrador', 'super_admin'].includes(u.rol) || !u.divisasAutorizadas?.length ||
                          (data.divisas.length > 0 && data.divisas.every((d) => u.divisasAutorizadas?.includes(d.codigo))) ? (
                          <span className="text-xs font-semibold text-primary">Todas</span>
                        ) : (
                          <span className="text-xs" title={u.divisasAutorizadas.join(', ')}>
                            {u.divisasAutorizadas.slice(0, 4).join(' · ')}
                            {u.divisasAutorizadas.length > 4 && ' +' + (u.divisasAutorizadas.length - 4)}
                          </span>
                        )}
                      </td>

                      {/* Interactive Status Pill Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(u)}
                          disabled={updatingId === u.id}
                          title="Haz clic para alternar entre Invitado y Activo"
                          className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 ${
                            isActivo
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        >
                          {updatingId === u.id ? (
                            <i className="ri-loader-4-line animate-spin text-xs" />
                          ) : (
                            <span className={`w-2 h-2 rounded-full ${isActivo ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          )}
                          <span>{isActivo ? 'Activo' : 'Invitado'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopyLink(u)}
                            title="Copiar enlace de acceso"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <i className={copiedId === u.id ? "ri-check-line text-emerald-500" : "ri-share-line"} />
                          </button>

                          <button
                            onClick={() => setInvitingUser(u)}
                            title="Enviar correo de invitación"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                          >
                            <i className="ri-mail-send-line" />
                          </button>

                          <button
                            onClick={() => setEditingUser(u)}
                            title="Editar permisos y rol"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <i className="ri-edit-line" />
                          </button>

                          <button
                            onClick={() => setDeletingUser(u)}
                            title="Eliminar usuario"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                      <CreatedByCell name={u.createdByName} />
                    </tr>
                  );
                }}</PaginatedRows>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
      />

      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />

      <SendInviteModal
        isOpen={Boolean(invitingUser)}
        user={invitingUser}
        onClose={() => setInvitingUser(null)}
      />

      <DeleteUserModal
        isOpen={Boolean(deletingUser)}
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
};
