import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onExportCsv?: () => void;
  onOpenModal?: (modalId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title: propTitle,
  subtitle: propSubtitle,
  primaryActionLabel,
  onPrimaryAction,
  onExportCsv,
  onOpenModal,
}) => {
  const { profile, user, theme, toggleTheme } = useAuth();
  const location = useLocation();

  // Dynamic route metadata
  let title = propTitle;
  let subtitle = propSubtitle;
  let actionLabel = primaryActionLabel;
  let onAction = onPrimaryAction;

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
        actionLabel = 'Registrar Negocio';
        onAction = () => onOpenModal && onOpenModal('add-negocio');
        break;
      case '/clientes':
        title = 'Clientes';
        subtitle = 'Gestión y estado de cuentas de clientes';
        actionLabel = 'Nuevo Cliente';
        onAction = () => onOpenModal && onOpenModal('add-cliente');
        break;
      case '/dispersiones':
        title = 'Dispersiones';
        subtitle = 'Pagos bancarios y transferencias';
        actionLabel = 'Nueva Dispersión';
        onAction = () => onOpenModal && onOpenModal('add-dispersion');
        break;
      case '/efectivo':
        title = 'Efectivo';
        subtitle = 'Efectivo Dosquebradas y pagos físicos';
        break;
      case '/gastos':
        title = 'Gastos';
        subtitle = 'Control contable de egresos y costos operativos';
        actionLabel = 'Registrar Gasto';
        onAction = () => onOpenModal && onOpenModal('add-gasto');
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

  const name = profile?.nombre || user?.nombre || user?.email?.split('@')[0] || 'Operador';
  const initial = name.charAt(0).toUpperCase();

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

        {/* Primary Action Button (Header right) */}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-95 flex items-center gap-1.5 transition-all"
          >
            <i className="ri-add-line text-sm" />
            <span>{actionLabel}</span>
          </button>
        )}

        {/* Theme Toggle */}
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

        {/* Profile Pill */}
        <Link
          to="/perfil"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors shadow-sm"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
            {initial}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-bold text-foreground block leading-tight">{name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              {profile?.rol || 'Operador'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};
