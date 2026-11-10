import { useAuth } from '../../context/AuthContext';
import React from 'react';
import { NavLink } from 'react-router-dom';

interface MobileBottomNavProps {
  onOpenMore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore }) => {
  const { profile } = useAuth();
  const role = profile?.role || 'operador';
  const isAdmin = role === 'administrador' || role === 'super_admin';
  const canDisperse = isAdmin || role === 'dispersor';

  const tabs = [
    { to: '/inicio', label: 'Inicio', icon: 'ri-home-5-line', activeIcon: 'ri-home-5-fill' },
    ...(isAdmin || role === 'operador'
      ? [{ to: '/negocios', label: 'Negocios', icon: 'ri-briefcase-4-line', activeIcon: 'ri-briefcase-4-fill' }]
      : []),
    ...(canDisperse
      ? [{ to: '/dispersiones', label: 'Dispersar', icon: 'ri-send-plane-2-line', activeIcon: 'ri-send-plane-2-fill' }]
      : []),
    { to: '/clientes', label: 'Clientes', icon: 'ri-team-line', activeIcon: 'ri-team-fill' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-t border-border z-40 flex items-center justify-around px-2 shadow-lg safe-area-pb">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              isActive
                ? 'text-primary font-bold scale-105'
                : 'text-muted-foreground hover:text-foreground font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`${isActive ? tab.activeIcon : tab.icon} text-lg mb-0.5`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Button for Full Menu Drawer */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex flex-col items-center justify-center flex-1 py-1 text-muted-foreground hover:text-foreground font-medium transition-all"
      >
        <i className="ri-menu-4-line text-lg mb-0.5" />
        <span className="text-[10px] tracking-tight">Más</span>
      </button>
    </nav>
  );
};
