import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onExportCsv?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  primaryActionLabel,
  onPrimaryAction,
  onExportCsv,
}) => {
  const { profile, theme, toggleTheme } = useAuth();
  const name = profile?.full_name || profile?.email?.split('@')[0] || 'Usuario';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 32px',
      background: 'transparent',
      borderBottom: '1px solid var(--border-main)',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Export CSV button */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            title="Exportar tabla a CSV"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              border: '1px solid var(--border-main)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-nav)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        )}

        {/* ONLY ONE PRIMARY ACTION BUTTON NEXT TO CSV */}
        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--brand-primary)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(67, 24, 255, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>{primaryActionLabel}</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Cambiar tema claro / oscuro"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-main)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-nav)',
          }}
        >
          {theme === 'dark' ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* User Profile Pill */}
        <Link
          to="/perfil"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '4px 12px 4px 6px',
            borderRadius: '24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-main)',
            textDecoration: 'none',
            boxShadow: 'var(--shadow-nav)',
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFB547 0%, #FF8500 100%)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {initial}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {name}
            </div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
              {profile?.role === 'super_admin' ? '⭐ Super Admin' : (profile?.role === 'administrador' ? '🛡️ Admin' : (profile?.role === 'dispersor' ? '💸 Dispersor' : '💼 Operador'))}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
};
