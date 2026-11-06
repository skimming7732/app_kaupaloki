import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAirtable } from '../context/AirtableContext';

export const InicioView: React.FC = () => {
  const { user } = useAuth();
  const { data } = useAirtable();
  const navigate = useNavigate();

  const totalNegocios = data.negocios.length;
  const totalClientes = data.clientes.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-6">
      {/* Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br from-primary/10 via-card to-card border border-border shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <i className="ri-shield-check-line" />
              <span>Plataforma Operativa Kaupaloki</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Bienvenido, {user?.nombre || user?.email?.split('@')[0] || 'Operador'}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              Panel central de operaciones cambiarias, dispersiones masivas y control de activos en custodia.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate('/negocios')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
            >
              <i className="ri-exchange-dollar-line text-lg" />
              <span>Ir a Negocios</span>
            </button>
            <button
              onClick={() => navigate('/clientes')}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <i className="ri-group-line text-lg" />
              <span>Ir a Clientes</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Summary Pill Row */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/negocios')}
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-1">Negocios Registrados</span>
            <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
              {totalNegocios}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <i className="ri-arrow-right-line text-lg group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/clientes')}
          className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div>
            <span className="text-xs text-muted-foreground font-medium block mb-1">Clientes Activos</span>
            <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
              {totalClientes}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <i className="ri-arrow-right-line text-lg group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
