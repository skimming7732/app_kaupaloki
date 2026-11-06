import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAirtable } from '../../context/AirtableContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SidebarSection = ({ label, icon, active, expanded, children }: {
  label?: string;
  icon?: string;
  active: boolean;
  expanded: boolean;
  children: React.ReactNode;
}) => {
  if (!label) return <div className="space-y-1">{children}</div>;

  return (
    <details className="group mt-1 border-t border-border pt-2">
      <summary
        title={label}
        aria-label={label}
        className={`flex cursor-pointer list-none items-center gap-3 rounded-xl py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-primary [&::-webkit-details-marker]:hidden ${expanded ? 'px-3.5' : 'justify-center'} ${active ? 'text-primary' : 'text-muted-foreground'}`}
      >
        <i className={icon + ' text-lg'} aria-hidden="true" />
        {expanded && (
          <>
            <span className="flex-1">{label}</span>
            <i className="ri-arrow-down-s-line transition-transform group-open:rotate-180" aria-hidden="true" />
          </>
        )}
      </summary>
      <div className={expanded ? 'ml-3 space-y-1 border-l border-border pl-2' : 'space-y-1'}>
        {children}
      </div>
    </details>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const { syncStatus, lastSyncTime, syncWithAirtable } = useAirtable();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);

  const role = profile?.role || 'operador';
  const isAdmin = role === 'administrador' || role === 'super_admin';
  const canDisperse = isAdmin || role === 'dispersor';

  const primaryItems = [
    { to: '/inicio', label: 'Inicio', icon: 'ri-home-5-line' },
    ...(isAdmin ? [{ to: '/dashboard', label: 'Panel de control', icon: 'ri-dashboard-3-line' }] : []),
    { to: '/clientes', label: 'Clientes', icon: 'ri-team-line' },
    ...(isAdmin || role === 'operador' ? [{ to: '/negocios', label: 'Negocios', icon: 'ri-briefcase-4-line' }] : []),
  ];
  const sections = [
    { label: undefined, items: primaryItems },
    { label: 'Operaciones', icon: 'ri-exchange-line', items: [
      ...(canDisperse ? [{ to: '/dispersiones', label: 'Dispersiones', icon: 'ri-send-plane-2-line' }] : []),
      ...(isAdmin ? [
        { to: '/compras-usdt', label: 'Compras USDT', icon: 'ri-shopping-cart-2-line' },
        { to: '/ventas-usdt', label: 'Ventas USDT', icon: 'ri-funds-line' },
        { to: '/comisionistas', label: 'Comisionistas', icon: 'ri-user-star-line' },
      ] : []),
    ] },
    { label: 'Tesorería', icon: 'ri-safe-line', items: isAdmin ? [
      { to: '/efectivo', label: 'Efectivo', icon: 'ri-money-dollar-circle-line' },
      { to: '/activos-liquidos', label: 'Activos líquidos', icon: 'ri-bank-line' },
      { to: '/activos-digitales', label: 'Activos digitales', icon: 'ri-coin-line' },
      { to: '/gastos', label: 'Gastos', icon: 'ri-file-list-3-line' },
    ] : [] },
    { label: 'Administración', icon: 'ri-settings-3-line', items: isAdmin ? [
      { to: '/divisas', label: 'Divisas', icon: 'ri-global-line' },
      { to: '/usuarios', label: 'Usuarios y accesos', icon: 'ri-shield-user-line' },
    ] : [] },
  ].filter((section) => section.items.length > 0);

  // Active expanded state on desktop: expands on hover or if pinned
  const isExpanded = isHovered || isPinned || hasKeyboardFocus;

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Collapsible, default 72px, expands on hover) */}
      {/* ======================================================== */}
      <div className="w-[72px] shrink-0 hidden md:block" />

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={(event) => {
          if (event.target.matches(':focus-visible')) setHasKeyboardFocus(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHasKeyboardFocus(false);
        }}
        className="hidden md:flex flex-col justify-between fixed top-0 left-0 h-screen z-40 overflow-x-hidden overflow-y-auto transition-all duration-200 ease-in-out border-r border-[var(--border-main)] bg-[var(--bg-sidebar)]"
        style={{
          width: isExpanded ? '260px' : '72px',
          boxShadow: isExpanded ? '8px 0 28px rgba(0, 0, 0, 0.18)' : 'none',
        }}
      >
        {/* Top: Logo & Optional Pin Toggle */}
        <div>
          <div
            style={{
              height: '72px',
              padding: isExpanded ? '0 16px 0 20px' : '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'space-between' : 'center',
              borderBottom: '1px solid var(--border-main)',
            }}
          >
            {isExpanded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <img
                  src="/logo.png"
                  alt="Kaupaloki"
                  className="theme-logo-dark"
                  style={{ height: '32px', width: 'auto', display: 'block' }}
                />
                <img
                  src="/logo-blue.png"
                  alt="Kaupaloki"
                  className="theme-logo-light"
                  style={{ height: '32px', width: 'auto', display: 'block' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src="/iso-type-white.png"
                  alt="Kaupaloki"
                  className="theme-logo-dark"
                  style={{ height: '36px', width: '36px', objectFit: 'contain' }}
                />
                <img
                  src="/iso-type-blue.png"
                  alt="Kaupaloki"
                  className="theme-logo-light"
                  style={{ height: '36px', width: '36px', objectFit: 'contain' }}
                />
              </div>
            )}

            {isExpanded && (
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? 'Desanclar menú' : 'Fijar menú expandido'}
                style={{
                  background: isPinned ? 'var(--bg-card-secondary)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: isPinned ? 'var(--brand-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className={isPinned ? 'ri-pushpin-2-fill' : 'ri-pushpin-2-line'} />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav
            style={{
              padding: isExpanded ? '14px 12px' : '14px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {sections.map((section) => (
              <SidebarSection
                key={section.label || 'principal'}
                label={section.label}
                icon={section.icon}
                active={section.items.some((item) => item.to === pathname)}
                expanded={isExpanded}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={!isExpanded ? item.label : undefined}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isExpanded ? 'flex-start' : 'center',
                      gap: isExpanded ? '12px' : '0',
                      padding: isExpanded ? '10px 14px' : '10px 0',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                      background: isActive ? 'var(--brand-primary)' : 'transparent',
                      textDecoration: 'none',
                      boxShadow: isActive ? '0 4px 14px rgba(67, 24, 255, 0.35)' : 'none',
                      transition: 'background 0.15s ease, color 0.15s ease',
                      whiteSpace: 'nowrap',
                      width: '100%',
                    })}
                  >
                    <i
                      className={`${item.icon}`}
                      style={{
                        fontSize: '18px',
                        minWidth: '20px',
                        textAlign: 'center',
                        flexShrink: 0,
                        fontWeight: 'normal',
                        fontStyle: 'normal',
                      }}
                    />
                    {isExpanded && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </SidebarSection>
            ))}
          </nav>
        </div>

        {/* Bottom Sync Button */}
        <div
          style={{
            padding: isExpanded ? '16px' : '12px 8px',
            borderTop: '1px solid var(--border-main)',
          }}
        >
          <button
            type="button"
            onClick={() => syncWithAirtable(true)}
            title={
              !isExpanded
                ? `Base de Datos (${syncStatus === 'syncing' ? 'Sincronizando...' : lastSyncTime || 'En vivo'})`
                : undefined
            }
            style={{
              width: '100%',
              padding: isExpanded ? '10px 14px' : '10px 0',
              borderRadius: '12px',
              border: '1px solid var(--border-main)',
              background: 'var(--bg-card-secondary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'space-between' : 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background:
                    syncStatus === 'syncing'
                      ? 'var(--warning)'
                      : syncStatus === 'error'
                      ? 'var(--danger)'
                      : 'var(--success)',
                  boxShadow:
                    syncStatus === 'syncing'
                      ? '0 0 6px var(--warning)'
                      : '0 0 6px var(--success)',
                  flexShrink: 0,
                }}
              />
              {isExpanded && (
                <span>
                  {syncStatus === 'syncing' ? 'Sincronizando...' : 'Base de Datos'}
                </span>
              )}
            </div>
            {isExpanded && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {lastSyncTime || 'En vivo'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE DRAWER SLIDE-OVER (< md screens)               */}
      {/* ======================================================== */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] z-50 flex flex-col justify-between transition-transform duration-300 md:hidden overflow-y-auto ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Mobile Drawer Header */}
          <div className="h-16 px-5 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Kaupaloki"
                className="theme-logo-dark"
                style={{ height: '28px', maxHeight: '28px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
              />
              <img
                src="/logo-blue.png"
                alt="Kaupaloki"
                className="theme-logo-light"
                style={{ height: '28px', maxHeight: '28px', width: 'auto', maxWidth: '140px', objectFit: 'contain' }}
              />
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>

          {/* Mobile Nav Links */}
          <nav className="p-3 space-y-1">
            {sections.map((section) => (
              <SidebarSection
                key={section.label || 'principal'}
                label={section.label}
                icon={section.icon}
                active={section.items.some((item) => item.to === pathname)}
                expanded={true}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white shadow-md shadow-primary/30'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`
                    }
                  >
                    <i className={`${item.icon} text-lg`} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </SidebarSection>
            ))}
          </nav>
        </div>

        {/* Mobile Drawer Bottom Database Sync */}
        <div className="p-4 border-t border-[var(--border-main)] pb-8">
          <button
            type="button"
            onClick={() => syncWithAirtable(true)}
            className="w-full p-2.5 rounded-xl border border-border bg-[var(--bg-card-secondary)] text-foreground text-xs font-bold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background:
                    syncStatus === 'syncing'
                      ? 'var(--warning)'
                      : syncStatus === 'error'
                      ? 'var(--danger)'
                      : 'var(--success)',
                }}
              />
              <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Base de Datos'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{lastSyncTime || 'En vivo'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
