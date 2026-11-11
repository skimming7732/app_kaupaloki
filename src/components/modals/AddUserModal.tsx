import { requiresCurrencies as roleRequiresCurrencies, type StaffRole } from '../../utils/roles';
import { useAuth } from '../../context/AuthContext';
import { prepareSuccessSound } from '../../utils/confirmationSound';
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EDGE_SYNC_URL = 'https://tjuqludeduydarwzhbor.supabase.co/functions/v1/airtable-sync';

const PAISES_DISPONIBLES = [
  { code: 'COL', name: 'Colombia' },
  { code: 'VEN', name: 'Venezuela' },
  { code: 'PAN', name: 'Panamá' },
  { code: 'USA', name: 'Estados Unidos' },
  { code: 'CHL', name: 'Chile' },
  { code: 'PER', name: 'Perú' },
  { code: 'MEX', name: 'México' },
  { code: 'ESP', name: 'España' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'ARG', name: 'Argentina' },
];

const ROLES_OPTIONS: {
  id: StaffRole;
  title: string;
  badge: string;
  desc: string;
  icon: string;
  colorClass: string;
}[] = [
  {
    id: 'operador',
    title: 'Operador',
    badge: 'Requiere Divisas',
    desc: 'Registra negocios y dispersiones con divisas asignadas.',
    icon: 'ri-briefcase-4-line',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  { id: 'comercial', title: 'Comercial', badge: 'Negocios', desc: 'Registra negocios y consulta clientes con divisas asignadas.', icon: 'ri-briefcase-4-line', colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { id: 'supervisor', title: 'Supervisor', badge: 'Supervisión', desc: 'Supervisa operaciones, edita registros autorizados y gestiona eliminaciones.', icon: 'ri-eye-line', colorClass: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  { id: 'auditor', title: 'Auditor', badge: 'Solo lectura', desc: 'Auditoría integral en todas las vistas y reportes. Sin permisos de edición ni eliminación.', icon: 'ri-file-search-line', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  {
    id: 'dispersor',
    title: 'Dispersor',
    badge: 'Dispersión',
    desc: 'Gestiona dispersiones en COP y consulta clientes.',
    icon: 'ri-send-plane-2-line',
    colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'administrador',
    title: 'Administrador',
    badge: 'Gestión',
    desc: 'Control de finanzas, activos, divisas y gastos.',
    icon: 'ri-shield-check-line',
    colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'super_admin',
    title: 'Super Admin',
    badge: 'Total',
    desc: 'Control global, gestión de usuarios y seguridad.',
    icon: 'ri-shield-star-line',
    colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
];

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const { data, refreshUsers } = useData();
  const { profile } = useAuth();

  // Wizard steps: 1 = Datos, 2 = Roles, 3 = Divisas (si rol es operador)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pais, setPais] = useState('COL');
  const [rol, setRol] = useState<StaffRole>('comercial');
  const [divisasAutorizadas, setDivisasAutorizadas] = useState<string[]>([]);
  const [allCurrencies, setAllCurrencies] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !['administrador', 'super_admin'].includes(profile?.role || '')) return null;

  const requiresCurrencies = roleRequiresCurrencies(rol);
  const roleCurrencies = rol === 'dispersor' ? data.divisas.filter((currency) => currency.codigo === 'COP') : data.divisas;
  const totalSteps = requiresCurrencies ? 3 : 2;

  const handleReset = () => {
    setStep(1);
    setNombre('');
    setEmail('');
    setPais('COL');
    setRol('comercial');
    setDivisasAutorizadas([]);
    setAllCurrencies(false);
    setError(null);
    setSuccess(false);
    setActionLink(null);
    setCopied(false);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const toggleDivisa = (code: string) => {
    setAllCurrencies(false);
    if (divisasAutorizadas.includes(code)) {
      setDivisasAutorizadas(divisasAutorizadas.filter((c) => c !== code));
    } else {
      setDivisasAutorizadas([...divisasAutorizadas, code]);
    }
  };

  const selectAllDivisas = () => {
    const all = roleCurrencies.map((d) => d.codigo);
    setDivisasAutorizadas(all);
    setAllCurrencies(rol !== 'dispersor');
  };

  const clearAllDivisas = () => {
    setDivisasAutorizadas([]);
    setAllCurrencies(false);
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nombre.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (requiresCurrencies) {
      setStep(3);
    } else {
      executeInviteUser([]);
    }
  };

  const handleSubmitStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allCurrencies && divisasAutorizadas.length === 0) {
      setError('Por favor selecciona al menos una divisa');
      return;
    }
    executeInviteUser(rol === 'dispersor' ? ['COP'] : allCurrencies ? [] : divisasAutorizadas);
  };

  const executeInviteUser = async (currenciesToAssign: string[]) => {
    setLoading(true);
    setError(null);

    const finishSound = prepareSuccessSound();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Inicia sesión para invitar usuarios.');
      const payload = {
        action: 'prepare_invited_user',
        email: email.trim().toLowerCase(),
        fullName: nombre.trim(),
        role: rol,
        pais,
        authorizedCurrencies: currenciesToAssign,
      };

      const res = await fetch(EDGE_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok || resJson.error) {
        throw new Error(resJson.error || 'Error al invitar al usuario');
      }

      finishSound(true);
      setSuccess(true);
      if (resJson.actionLink) {
        setActionLink(resJson.actionLink);
      }
      await refreshUsers();

      if (!resJson.actionLink) {
        setTimeout(() => {
          handleClose();
        }, 1800);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la invitación');
    } finally {
      finishSound(false);
      setLoading(false);
    }
  };

  const handleCopyActionLink = () => {
    if (!actionLink) return;
    navigator.clipboard.writeText(actionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border shadow-2xl p-6 md:p-7 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
              <i className="ri-user-add-line text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Invitar Nuevo Usuario</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  Paso {step} de {totalSteps}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 1 && 'Ingresa los datos personales del usuario a invitar'}
                {step === 2 && 'Define el rol de acceso y privilegios en el sistema'}
                {step === 3 && 'Selecciona las divisas autorizadas para este usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
            <i className="ri-error-warning-line text-base shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Screen */}
        {success ? (
          <div className="py-6 text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center text-2xl font-bold">
              <i className="ri-checkbox-circle-line" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">¡Invitación Registrada con Éxito!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                El usuario <strong className="text-foreground">{email}</strong> fue configurado con rol{' '}
                <strong className="text-foreground uppercase">{rol}</strong>.
              </p>
            </div>

            {actionLink && (
              <div className="p-3.5 rounded-2xl bg-muted/60 border border-border text-left space-y-2 mt-4 max-w-md mx-auto">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Enlace directo de acceso / invitación:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={actionLink}
                    className="flex-1 text-xs font-mono bg-card px-3 py-2 rounded-xl border border-border text-foreground select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyActionLink}
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shrink-0 transition-opacity"
                  >
                    <i className={copied ? "ri-check-line text-emerald-300" : "ri-file-copy-line"} />
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Puedes copiar este enlace y enviárselo directamente al usuario por WhatsApp o correo.
                </p>
              </div>
            )}

            <div className="pt-3 flex justify-center">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <form onSubmit={handleSubmitStep1} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    País de Operación
                  </label>
                  <select
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                  >
                    {PAISES_DISPONIBLES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/25 flex items-center gap-2 transition-all"
                  >
                    <span>Continuar a Roles (Paso 2)</span>
                    <i className="ri-arrow-right-line" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Role Selection */}
            {step === 2 && (
              <form onSubmit={handleSubmitStep2} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Selecciona el Rol para {nombre || email}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ROLES_OPTIONS.filter((option) => option.id !== 'super_admin' || profile?.role === 'super_admin').map((opt) => {
                      const isSelected = rol === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => { setRol(opt.id); if (opt.id === 'dispersor') { setDivisasAutorizadas(['COP']); setAllCurrencies(false); } }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm'
                              : 'bg-card border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold border ${opt.colorClass}`}>
                                <i className={opt.icon} />
                              </div>
                              <span className="text-xs font-bold text-foreground">{opt.title}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-muted text-muted-foreground border border-border">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    <i className="ri-arrow-left-line" />
                    <span>Volver al Paso 1</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2 transition-all"
                  >
                    {loading && <i className="ri-loader-4-line animate-spin" />}
                    <span>
                      {requiresCurrencies ? 'Continuar a Divisas (Paso 3) →' : 'Finalizar e Invitar Usuario →'}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Authorized Currencies (Operador only) */}
            {step === 3 && (
              <form onSubmit={handleSubmitStep3} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Divisas Permitidas para {nombre || email}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {rol === 'dispersor' ? 'Las dispersiones se realizan únicamente en COP.' : 'Selecciona las divisas de los negocios. Para dispersar, el Operador también necesita COP o Todas.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllDivisas}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Todas
                    </button>
                    <span className="text-muted-foreground text-xs">·</span>
                    <button
                      type="button"
                      onClick={clearAllDivisas}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                {/* Currency Chips Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                  {roleCurrencies.map((d) => {
                    const isSelected = divisasAutorizadas.includes(d.codigo);
                    return (
                      <button
                        key={d.id || d.codigo}
                        type="button"
                        onClick={() => toggleDivisa(d.codigo)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                            : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <span className="text-sm font-black">{d.codigo}</span>
                        <span className="text-[10px] opacity-80 truncate max-w-full font-medium">{d.nombre}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-muted-foreground text-center">
                  Seleccionadas: <strong className="text-foreground">{divisasAutorizadas.length}</strong> de {roleCurrencies.length} divisas
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                  >
                    <i className="ri-arrow-left-line" />
                    <span>Volver a Roles</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!allCurrencies && divisasAutorizadas.length === 0)}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2 transition-all"
                  >
                    {loading && <i className="ri-loader-4-line animate-spin" />}
                    <span>Finalizar e Invitar Usuario</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
