import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onExportCsv?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title: propTitle,
  subtitle: propSubtitle,
  onExportCsv,
}) => {
  const { profile, user, theme, toggleTheme, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Dynamic route metadata
  let title = propTitle;
  let subtitle = propSubtitle;

  if (!title) {
    switch (location.pathname) {
      case '/inicio':
        title = 'Inicio';
        subtitle = 'Plataforma operativa Kaupaloki';
        break;
      case '/dashboard':
        title = 'Panel de Control';
        subtitle = 'Liquidación y métricas en tiempo real';
        break;
      case '/negocios':
        title = 'Negocios';
        subtitle = 'Conversiones y operaciones cambiarias';
        break;
      case '/clientes':
        title = 'Clientes';
        subtitle = 'Gestión y estado de cuentas de clientes';
        break;
      case '/dispersiones':
        title = 'Dispersiones';
        subtitle = 'Pagos bancarios y transferencias';
        break;
      case '/efectivo':
        title = 'Efectivo';
        subtitle = 'Efectivo Dosquebradas y pagos físicos';
        break;
      case '/gastos':
        title = 'Gastos';
        subtitle = 'Control contable de egresos y costos operativos';
        break;
      case '/activos':
      case '/activos-liquidos':
        title = 'Activos Líquidos';
        subtitle = 'Saldos consolidados en instituciones y caja';
        break;
      case '/activos-digitales':
        title = 'Activos Digitales';
        subtitle = 'Custodia en USDT y wallets corporativas';
        break;
      case '/divisas':
        title = 'Divisas';
        subtitle = 'Monedas habilitadas y saldo en custodia';
        break;
      case '/usuarios':
        title = 'Usuarios & Accesos';
        subtitle = 'Control de roles, operadores y permisos';
        break;
      case '/perfil':
        title = 'Mi Perfil';
        subtitle = 'Configuración de cuenta y seguridad 2FA';
        break;
      default:
        title = 'Kaupaloki';
        subtitle = 'Plataforma de finanzas';
    }
  }

  const fullName =
    profile?.full_name ||
    profile?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuario';
  const email = user?.email || profile?.email || '';
  const initial = fullName.charAt(0).toUpperCase();
  const operatorCode = profile?.operator_code || profile?.codigo || '';
  const pais = profile?.pais || 'COL';
  const rolDisplay =
    profile?.rol ||
    (profile?.role === 'super_admin'
      ? 'SUPER ADMIN'
      : profile?.role === 'administrador'
      ? 'ADMINISTRADOR'
      : profile?.role === 'dispersor'
      ? 'DISPERSOR'
      : 'OPERADOR');

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-black text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Export CSV button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            title="Exportar a CSV"
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors"
          >
            <i className="ri-download-2-line text-sm" />
          </button>
        )}

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Cambiar tema claro / oscuro"
          className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors"
        >
          {theme === 'dark' ? (
            <i className="ri-sun-line text-sm text-amber-400" />
          ) : (
            <i className="ri-moon-line text-sm text-blue-500" />
          )}
        </button>

        {/* Profile with Dropdown Submenu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/70 transition-all shadow-sm focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
              {initial}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-foreground block leading-tight">{fullName}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                {rolDisplay}
              </span>
            </div>
            <i className={`ri-arrow-down-s-line text-muted-foreground text-xs transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Submenu Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-2xl p-3 z-50 animate-fade-in">
              {/* Profile Header Details */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border mb-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center border border-primary/20">
                    {initial}
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-bold text-xs text-foreground block truncate">{fullName}</span>
                    <span className="text-[11px] text-muted-foreground block truncate">{email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20 text-[10px]">
                    {rolDisplay}
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {operatorCode || pais}
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-1">
                <Link
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <i className="ri-user-settings-line text-sm text-primary" />
                  <span>Mi Perfil</span>
                </Link>

                <Link
                  to="/2fa"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <i className="ri-shield-keyhole-line text-sm text-emerald-500" />
                  <span>Seguridad & 2FA</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-border" />

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <i className="ri-logout-box-r-line text-sm" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
