import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const PublicHeader = () => {
  const { theme, toggleTheme } = useAuth();
  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Kaupaloki"
            className="theme-logo-dark"
            style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
          <img
            src="/logo-blue.png"
            alt="Kaupaloki"
            className="theme-logo-light"
            style={{ height: '32px', maxHeight: '32px', width: 'auto', maxWidth: '160px', objectFit: 'contain' }}
          />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          title="Cambiar tema claro / oscuro"
          aria-label="Cambiar tema claro / oscuro"
          className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm transition-colors"
        >
          {theme === 'dark' ? (
            <i className="ri-sun-line text-sm text-amber-400" />
          ) : (
            <i className="ri-moon-line text-sm text-blue-500" />
          )}
        </button>
      </header>
  );
};
