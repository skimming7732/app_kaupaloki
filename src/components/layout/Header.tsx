import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onExportCsv?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenModal?: (modalId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title: propTitle,
  subtitle: propSubtitle,
  onExportCsv,
  onToggleMobileMenu,
  onOpenModal,
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
    switch (location.pathname.split('/').slice(0, 2).join('/')) {
      case '/inicio':
        title = 'Inicio';
        subtitle = 'Plataforma operativa Kaupaloki';
        break;
      case '/panel-control':
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
      case '/comisionistas':
        title = 'Comisionistas';
        subtitle = 'Liquidación y porcentaje de comisiones sobre clientes';
        break;
      case '/dispersiones':
        title = 'Dispersiones';
        subtitle = 'Pagos bancarios y transferencias';
        break;
      case '/compras-usdt':
        title = 'Compras USDT';
        subtitle = 'Adquisición de Tether en divisas internacionales';
        break;
      case '/ventas-usdt':
        title = 'Ventas USDT';
        subtitle = 'Liquidación y monetización de Tether a cuentas bancarias y caja';
        break;
      case '/transferencias-internas':
        title = 'Transferencias Internas';
        subtitle = 'Movimientos entre activos líquidos y digitales';
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
      case '/capital':
        title = 'Capital';
        subtitle = 'Capital, rendimientos y liquidaciones';
        break;
      case '/socios-inversionistas':
        title = 'Socios & Inversionistas';
        subtitle = 'Fichas y movimientos por persona';
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
        subtitle = 'Resumen general y estado de tu cuenta';
        break;
      case '/perfil/datos':
        title = 'Datos Personales';
        subtitle = 'Actualización de datos y confirmación de seguridad';
        break;
      case '/perfil/seguridad':
        title = 'Seguridad & Accesos';
        subtitle = 'Gestión de contraseña y autenticación 2FA';
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
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center md:hidden transition-colors flex-shrink-0"
            title="Abrir menú"
          >
            <i className="ri-menu-2-line text-base" />
          </button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-tight">{title}</h1>
          {subtitle && <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate max-w-[180px] sm:max-w-none">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Export CSV button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            title="Exportar a CSV"
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors flex-shrink-0"
          >
            <i className="ri-download-2-line text-sm" />
          </button>
        )}

        {/* 1. Rol de Usuario */}
        <div className="hidden sm:inline-flex items-center px-3 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] font-extrabold tracking-wider uppercase shadow-sm select-none">
          {rolDisplay}
        </div>

        {/* 2. Theme Toggle (Dark / Light) */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Cambiar tema claro / oscuro"
          className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors flex-shrink-0"
        >
          {theme === 'dark' ? (
            <i className="ri-sun-line text-sm text-amber-400" />
          ) : (
            <i className="ri-moon-line text-sm text-blue-500" />
          )}
        </button>

        {/* 3. User Trigger Button: Icono + Nombre + Flecha (misma altura h-9 que dark/light) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-9 flex items-center gap-2 px-2.5 rounded-xl border border-border bg-card hover:bg-muted/70 transition-all shadow-sm focus:outline-none flex-shrink-0"
          >
            <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 flex-shrink-0">
              {initial}
            </div>
            <span className="text-xs font-bold text-foreground truncate max-w-[130px] hidden sm:inline-block leading-none">
              {fullName}
            </span>
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
                  to="/perfil/seguridad"
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
