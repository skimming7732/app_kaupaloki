import { supervisorCanRead, type StaffRole } from './utils/roles';
import { CapitalSociosView, SociosInversionistasView } from './views/CapitalSociosView';
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

// Views
import { InicioView } from './views/InicioView';
import { DashboardView } from './views/DashboardView';
import { EstadisticasView } from './views/EstadisticasView';
import { NegociosView } from './views/NegociosView';
import { ClientesView } from './views/ClientesView';
import { ClienteDetalleView } from './views/ClienteDetalleView';
import { DispersionesView } from './views/DispersionesView';
import { EfectivoView } from './views/EfectivoView';
import { GastosView } from './views/GastosView';
import { TokensView } from './views/TokensView';
import { ActivosLiquidosView } from './views/ActivosLiquidosView';
import { ActivosDigitalesView } from './views/ActivosDigitalesView';
import { DivisasView } from './views/DivisasView';
import { InstitucionesView } from './views/InstitucionesView';
import { UsuariosView } from './views/UsuariosView';
import { PerfilView } from './views/PerfilView';
import { TwoFactorView } from './views/TwoFactorView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { ClientPublicView } from './views/ClientPublicView';
import { ComprasUsdtView } from './views/ComprasUsdtView';
import { VentasUsdtView } from './views/VentasUsdtView';
import { ComisionistasView } from './views/ComisionistasView';
import { TransferenciasInternasView } from './views/TransferenciasInternasView';

// Modals
import { AddNegocioModal } from './components/modals/AddNegocioModal';
import { AddClienteModal } from './components/modals/AddClienteModal';
import { AddDispersionModal } from './components/modals/AddDispersionModal';
import { AddGastoModal } from './components/modals/AddGastoModal';
import { AddUserModal } from './components/modals/AddUserModal';
import { AiAssistantBubble } from './components/ai/AiAssistantBubble';

function PageLoading({ authSurface = false }: { authSurface?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-foreground ${authSurface ? 'auth-surface' : 'min-h-screen bg-background'}`}>
      <div role="status" className="flex flex-col items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center motion-safe:animate-pulse">
          <img src="/iso-type-white.png" alt="" className="theme-logo-dark" />
          <img src="/iso-type-blue.png" alt="" className="theme-logo-light" />
        </div>
        <span className="text-xs text-muted-foreground font-semibold">
          {authSurface ? 'Cargando...' : 'Cargando Kaupaloki...'}
        </span>
      </div>
    </div>
  );
}

const RequireAuthFor2FA: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoading authSurface />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
}> = ({ children, allowedRoles }) => {
  const { profile } = useAuth();
  const role = profile?.role || 'operador';

  const { pathname } = useLocation();
  if (role === 'supervisor') return supervisorCanRead(pathname) ? <>{children}</> : <Navigate to="/inicio" replace />;
  if (allowedRoles && (role === 'client' || !allowedRoles.includes(role))) {
    return <Navigate to="/inicio" replace />;
  }
  return <>{children}</>;
};


const ClienteDetailRouteHandler: React.FC<{
  renderWithLayout: (
    component: React.ReactNode,
    allowedRoles?: StaffRole[]
  ) => React.ReactNode;
}> = ({ renderWithLayout }) => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to={`/cliente/${id || ''}`} replace />;
  }

  return <>{renderWithLayout(<ClienteDetalleView />, ['super_admin', 'administrador', 'operador', 'dispersor', 'comercial', 'supervisor'])}</>;
};

const AppLayout: React.FC<{
  children: React.ReactNode;
  activeModal: string | null;
  setActiveModal: (m: string | null) => void;
}> = ({ children, activeModal, setActiveModal }) => {
  const { user, is2faVerified, loading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return <PageLoading />;
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
      <Sidebar isMobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenModal={(modalId) => setActiveModal(modalId)}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* App-Style Mobile Bottom Navigation */}
      <MobileBottomNav onOpenMore={() => setMobileMenuOpen(true)} />

      {/* Global Modals */}
      <AddNegocioModal isOpen={activeModal === 'add-negocio'} onClose={() => setActiveModal(null)} />
      <AddClienteModal isOpen={activeModal === 'add-cliente'} onClose={() => setActiveModal(null)} />
      <AddDispersionModal isOpen={activeModal === 'add-dispersion'} onClose={() => setActiveModal(null)} />
      <AddGastoModal isOpen={activeModal === 'add-gasto' || activeModal === 'add-gasto-efectivo'} isCashContext={activeModal === 'add-gasto-efectivo'} onClose={() => setActiveModal(null)} />
      <AddUserModal isOpen={activeModal === 'add-user'} onClose={() => setActiveModal(null)} />

      {/* AI Financial Auditor Assistant (Only visible to Admin & Super Admin) */}
      <AiAssistantBubble />
    </div>
  );
};

export const App: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Auto-intercept password recovery tokens wherever they land (including old email links)
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (
      (hash.includes('type=recovery') || search.includes('type=recovery')) &&
      !window.location.pathname.startsWith('/reset-password')
    ) {
      window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
    }
  }, []);

  const renderWithLayout = (
    component: React.ReactNode,
    allowedRoles?: StaffRole[]
  ) => (
    <AppLayout activeModal={activeModal} setActiveModal={setActiveModal}>
      <ProtectedRoute allowedRoles={allowedRoles}>{component}</ProtectedRoute>
    </AppLayout>
  );

  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <Routes>
            {/* Public and standalone routes */}
            <Route path="/login" element={<LoginView />} />
            <Route path="/reset-password" element={<ResetPasswordView />} />
            <Route path="/recuperar-password" element={<Navigate to="/reset-password" replace />} />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="/2fa" element={<RequireAuthFor2FA><TwoFactorView /></RequireAuthFor2FA>} />
            <Route path="/cliente/:id" element={<ClientPublicView />} />
            <Route path="/cliente" element={<ClientPublicView />} />

            {/* Authenticated Dashboard App Layout routes */}
            <Route path="/" element={renderWithLayout(<InicioView />)} />
            <Route path="/inicio" element={renderWithLayout(<InicioView />)} />
            <Route
              path="/panel-control"
              element={renderWithLayout(<DashboardView />, ['super_admin', 'administrador'])}
            />
            <Route path="/dashboard" element={<Navigate to="/panel-control" replace />} />
            <Route
              path="/negocios"
              element={renderWithLayout(
                <NegociosView onOpenAddNegocio={() => setActiveModal('add-negocio')} />,
                ['super_admin', 'administrador', 'operador', 'comercial']
              )}
            />
            <Route
              path="/clientes"
              element={renderWithLayout(
                <ClientesView onOpenAddCliente={() => setActiveModal('add-cliente')} />
              )}
            />
            <Route
              path="/clientes/:id"
              element={<ClienteDetailRouteHandler renderWithLayout={renderWithLayout} />}
            />
            <Route
              path="/comisionistas"
              element={renderWithLayout(<ComisionistasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/dispersiones"
              element={renderWithLayout(
                <DispersionesView onOpenAddDispersion={() => setActiveModal('add-dispersion')} />,
                ['super_admin', 'administrador', 'dispersor', 'operador']
              )}
            />
            <Route
              path="/compras-usdt"
              element={renderWithLayout(<ComprasUsdtView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/ventas-usdt"
              element={renderWithLayout(<VentasUsdtView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/transferencias-internas"
              element={renderWithLayout(<TransferenciasInternasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/efectivo"
              element={renderWithLayout(
                <EfectivoView
                  onOpenAddGasto={() => setActiveModal('add-gasto-efectivo')}
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
              path="/activos-liquidos/:assetId?"
              element={renderWithLayout(<ActivosLiquidosView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/activos-digitales/:assetId?"
              element={renderWithLayout(<ActivosDigitalesView />, ['super_admin', 'administrador'])}
            />
            <Route path="/tokens" element={renderWithLayout(<TokensView />, ['super_admin', 'administrador'])} />
            <Route path="/capital" element={renderWithLayout(<CapitalSociosView />, ['super_admin', 'administrador'])} />
            <Route path="/capital-socios" element={<Navigate to="/capital" replace />} />
            <Route path="/socios-inversionistas/:socioId?" element={renderWithLayout(<SociosInversionistasView />, ['super_admin', 'administrador'])} />
            <Route
              path="/divisas/:codigo?"
              element={renderWithLayout(<DivisasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/divisa/:codigo"
              element={renderWithLayout(<DivisasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/divsa/:codigo"
              element={renderWithLayout(<DivisasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/estadisticas"
              element={renderWithLayout(<EstadisticasView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/instituciones"
              element={renderWithLayout(<InstitucionesView />, ['super_admin', 'administrador'])}
            />
            <Route
              path="/usuarios"
              element={renderWithLayout(<UsuariosView />, ['super_admin', 'administrador'])}
            />
            <Route path="/perfil" element={renderWithLayout(<PerfilView />)} />
            <Route path="/perfil/datos" element={renderWithLayout(<PerfilView />)} />
            <Route path="/perfil/seguridad" element={renderWithLayout(<PerfilView />)} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
