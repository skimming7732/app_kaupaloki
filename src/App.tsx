import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AirtableProvider } from './context/AirtableContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Views
import { InicioView } from './views/InicioView';
import { DashboardView } from './views/DashboardView';
import { NegociosView } from './views/NegociosView';
import { ClientesView } from './views/ClientesView';
import { DispersionesView } from './views/DispersionesView';
import { EfectivoView } from './views/EfectivoView';
import { ActivosLiquidosView } from './views/ActivosLiquidosView';
import { ActivosDigitalesView } from './views/ActivosDigitalesView';
import { DivisasView } from './views/DivisasView';
import { UsuariosView } from './views/UsuariosView';
import { PerfilView } from './views/PerfilView';
import { TwoFactorView } from './views/TwoFactorView';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { ClientPublicView } from './views/ClientPublicView';

// Modals
import { AddNegocioModal } from './components/modals/AddNegocioModal';
import { AddClienteModal } from './components/modals/AddClienteModal';
import { AddDispersionModal } from './components/modals/AddDispersionModal';
import { AddEfectivoModal } from './components/modals/AddEfectivoModal';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, is2FAVerified, loading } = useAuth();
  const location = useLocation();

  const [activeModal, setActiveModal] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black animate-pulse">
            K
          </div>
          <span className="text-xs text-muted-foreground font-semibold">Cargando Kaupaloki...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated or 2FA is pending, redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!is2FAVerified && location.pathname !== '/2fa') {
    return <Navigate to="/2fa" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenModal={(modalId) => setActiveModal(modalId)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Modals triggered from Header button */}
      <AddNegocioModal isOpen={activeModal === 'add-negocio'} onClose={() => setActiveModal(null)} />
      <AddClienteModal isOpen={activeModal === 'add-cliente'} onClose={() => setActiveModal(null)} />
      <AddDispersionModal isOpen={activeModal === 'add-dispersion'} onClose={() => setActiveModal(null)} />
      <AddEfectivoModal isOpen={activeModal === 'add-efectivo'} onClose={() => setActiveModal(null)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AirtableProvider>
          <Routes>
            {/* Public and standalone routes */}
            <Route path="/login" element={<LoginView />} />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="/2fa" element={<TwoFactorView />} />
            <Route path="/cliente/:id" element={<ClientPublicView />} />
            <Route path="/cliente" element={<ClientPublicView />} />

            {/* Authenticated Dashboard App Layout routes */}
            <Route path="/" element={<AppLayout><InicioView /></AppLayout>} />
            <Route path="/inicio" element={<AppLayout><InicioView /></AppLayout>} />
            <Route path="/dashboard" element={<AppLayout><DashboardView /></AppLayout>} />
            <Route path="/negocios" element={<AppLayout><NegociosView /></AppLayout>} />
            <Route path="/clientes" element={<AppLayout><ClientesView /></AppLayout>} />
            <Route path="/dispersiones" element={<AppLayout><DispersionesView /></AppLayout>} />
            <Route path="/efectivo" element={<AppLayout><EfectivoView /></AppLayout>} />
            <Route path="/activos" element={<AppLayout><ActivosLiquidosView /></AppLayout>} />
            <Route path="/activos-liquidos" element={<AppLayout><ActivosLiquidosView /></AppLayout>} />
            <Route path="/activos-digitales" element={<AppLayout><ActivosDigitalesView /></AppLayout>} />
            <Route path="/divisas" element={<AppLayout><DivisasView /></AppLayout>} />
            <Route path="/usuarios" element={<AppLayout><UsuariosView /></AppLayout>} />
            <Route path="/perfil" element={<AppLayout><PerfilView /></AppLayout>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </AirtableProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
