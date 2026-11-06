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
import { GastosView } from './views/GastosView';
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
import { AddGastoModal } from './components/modals/AddGastoModal';
import { AddUserModal } from './components/modals/AddUserModal';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('super_admin' | 'administrador' | 'operador' | 'dispersor')[];
}> = ({ children, allowedRoles }) => {
  const { profile } = useAuth();
  const role = profile?.role || 'operador';

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/inicio" replace />;
  }
  return <>{children}</>;
};

const AppLayout: React.FC<{
  children: React.ReactNode;
  activeModal: string | null;
  setActiveModal: (m: string | null) => void;
}> = ({ children, activeModal, setActiveModal }) => {
  const { user, is2faVerified, loading } = useAuth();
  const location = useLocation();

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

  if (!is2faVerified && location.pathname !== '/2fa') {
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

      {/* Global Modals */}
      <AddNegocioModal isOpen={activeModal === 'add-negocio'} onClose={() => setActiveModal(null)} />
      <AddClienteModal isOpen={activeModal === 'add-cliente'} onClose={() => setActiveModal(null)} />
      <AddDispersionModal isOpen={activeModal === 'add-dispersion'} onClose={() => setActiveModal(null)} />
      <AddEfectivoModal isOpen={activeModal === 'add-efectivo'} onClose={() => setActiveModal(null)} />
      <AddGastoModal isOpen={activeModal === 'add-gasto'} onClose={() => setActiveModal(null)} />
      <AddUserModal isOpen={activeModal === 'add-user'} onClose={() => setActiveModal(null)} />
    </div>
  );
};

export const App: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const renderWithLayout = (
    component: React.ReactNode,
    allowedRoles?: ('super_admin' | 'administrador' | 'operador' | 'dispersor')[]
  ) => (
    <AppLayout activeModal={activeModal} setActiveModal={setActiveModal}>
      <ProtectedRoute allowedRoles={allowedRoles}>{component}</ProtectedRoute>
    </AppLayout>
  );

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
            <Route path="/" element={renderWithLayout(<InicioView />)} />
            <Route path="/inicio" element={renderWithLayout(<InicioView />)} />
            <Route
              path="/dashboard"
              element={renderWithLayout(<DashboardView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/negocios"
              element={renderWithLayout(
                <NegociosView onOpenAddNegocio={() => setActiveModal('add-negocio')} />,
                ['super_admin', 'administrador', 'operador']
              )}
            />
            <Route
              path="/clientes"
              element={renderWithLayout(
                <ClientesView onOpenAddCliente={() => setActiveModal('add-cliente')} />
              )}
            />
            <Route
              path="/dispersiones"
              element={renderWithLayout(
                <DispersionesView onOpenAddDispersion={() => setActiveModal('add-dispersion')} />,
                ['super_admin', 'administrador', 'dispersor']
              )}
            />
            <Route
              path="/efectivo"
              element={renderWithLayout(
                <EfectivoView
                  onOpenAddMovimiento={() => setActiveModal('add-efectivo')}
                  onOpenAddGasto={() => setActiveModal('add-gasto')}
                />,
                ['super_admin', 'administrador']
              )}
            />
            <Route
              path="/gastos"
              element={renderWithLayout(
                <GastosView onOpenAddGasto={() => setActiveModal('add-gasto')} />,
                ['super_admin', 'administrador']
              )}
            />
            <Route
              path="/activos"
              element={renderWithLayout(<ActivosLiquidosView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/activos-liquidos"
              element={renderWithLayout(<ActivosLiquidosView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/activos-digitales"
              element={renderWithLayout(<ActivosDigitalesView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/divisas"
              element={renderWithLayout(<DivisasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/usuarios"
              element={renderWithLayout(<UsuariosView />, ['super_admin', 'administrador'])}
            />
            <Route path="/perfil" element={renderWithLayout(<PerfilView />)} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </AirtableProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
