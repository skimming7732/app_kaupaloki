import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAirtable } from '../../context/AirtableContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { profile } = useAuth();
  const { syncStatus, lastSyncTime, syncWithAirtable } = useAirtable();
  const role = profile?.role || 'operador';
  const isAdmin = role === 'administrador' || role === 'super_admin';
  const isDispersor = role === 'dispersor';

  const navItems = [
    { to: '/inicio', label: 'Inicio', icon: '🏠', roles: ['all'] },
    ...(isAdmin ? [{ to: '/dashboard', label: 'Panel de Control', icon: '📊', roles: ['admin'] }] : []),
    { to: '/clientes', label: 'Clientes', icon: '👥', roles: ['all'] },
    ...(!isDispersor ? [{ to: '/negocios', label: 'Negocios', icon: '💼', roles: ['admin', 'operador'] }] : []),
    ...(isAdmin || isDispersor ? [{ to: '/dispersiones', label: 'Dispersiones', icon: '💸', roles: ['admin', 'dispersor'] }] : []),
    ...(isAdmin ? [{ to: '/efectivo', label: 'Efectivo', icon: '💵', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/compras', label: 'Compras USDT', icon: '📥', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/ventas', label: 'Ventas USDT', icon: '📤', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/activos-liquidos', label: 'Activos Líquidos', icon: '🏦', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/activos-digitales', label: 'Activos Digitales', icon: '🪙', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/divisas', label: 'Divisas', icon: '🌐', roles: ['admin'] }] : []),
    ...(isAdmin ? [{ to: '/usuarios', label: 'Usuarios & Accesos', icon: '🛡️', roles: ['admin'] }] : []),
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-main)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Top Logo */}
      <div>
        <div style={{ padding: '28px 24px 20px 24px', borderBottom: '1px solid var(--border-main)' }}>
          <img src="/logo.png" alt="Kaupaloki" className="theme-logo-dark" style={{ height: '34px', width: 'auto' }} />
          <img src="/logo-blue.png" alt="Kaupaloki" className="theme-logo-light" style={{ height: '34px', width: 'auto' }} />
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                background: isActive ? 'var(--brand-primary)' : 'transparent',
                textDecoration: 'none',
                boxShadow: isActive ? '0 4px 14px rgba(67, 24, 255, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Sync Status Button */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-main)' }}>
        <button
          type="button"
          onClick={() => syncWithAirtable(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '12px',
            border: '1px solid var(--border-main)',
            background: 'var(--bg-card-secondary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: syncStatus === 'syncing' ? 'var(--warning)' : (syncStatus === 'error' ? 'var(--danger)' : 'var(--success)'),
              boxShadow: syncStatus === 'syncing' ? '0 0 6px var(--warning)' : '0 0 6px var(--success)',
            }} />
            <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Airtable'}</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
            {lastSyncTime || 'En vivo'}
          </span>
        </button>
      </div>
    </aside>
  );
};
