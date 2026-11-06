import React, { useState } from 'react';
import { useAirtable } from '../../context/AirtableContext';
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
  id: 'operador' | 'dispersor' | 'administrador' | 'super_admin';
  title: string;
  badge: string;
  desc: string;
  icon: string;
  colorClass: string;
}[] = [
  {
    id: 'operador',
    title: 'Operador',
    badge: '2 Pasos',
    desc: 'Inicio, Negocios y Clientes con divisas asignadas.',
    icon: 'ri-briefcase-4-line',
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'dispersor',
    title: 'Dispersor',
    badge: 'Dispersión',
    desc: 'Pagos bancarios, transferencias y clientes.',
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
  const { data, syncWithAirtable } = useAirtable();

  // Step state: 1 (basic info) or 2 (authorized currencies for Operador)
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pais, setPais] = useState('COL');
  const [rol, setRol] = useState<'operador' | 'dispersor' | 'administrador' | 'super_admin'>('operador');
  const [divisasAutorizadas, setDivisasAutorizadas] = useState<string[]>(['USD', 'COP', 'USDT']);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setNombre('');
    setEmail('');
    setPais('COL');
    setRol('operador');
    setDivisasAutorizadas(['USD', 'COP', 'USDT']);
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const toggleDivisa = (code: string) => {
    if (divisasAutorizadas.includes(code)) {
      setDivisasAutorizadas(divisasAutorizadas.filter((c) => c !== code));
    } else {
      setDivisasAutorizadas([...divisasAutorizadas, code]);
    }
  };

  const selectAllDivisas = () => {
    const all = data.divisas.map((d) => d.codigo);
    setDivisasAutorizadas(all);
  };

  const clearAllDivisas = () => {
    setDivisasAutorizadas([]);
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nombre.trim()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }
    setError(null);

    // If role is Operador, proceed to Step 2 for currencies
    if (rol === 'operador') {
      setStep(2);
    } else {
      // Direct submission for Dispersor, Admin, Super Admin
      executeInviteUser(data.divisas.map((d) => d.codigo));
    }
  };

  const handleSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (divisasAutorizadas.length === 0) {
      setError('Debes seleccionar al menos una divisa autorizada para el operador');
      return;
    }
    setError(null);
    executeInviteUser(divisasAutorizadas);
  };

  const executeInviteUser = async (currenciesToAssign: string[]) => {
    setLoading(true);
    setError(null);

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

      setSuccess(true);
      await syncWithAirtable(true);

      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar la invitación');
    } finally {
      setLoading(false);
    }
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
                {rol === 'operador' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    Paso {step} de 2
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {step === 1
                  ? 'Configura la identidad, país y rol del nuevo colaborador'
                  : 'Asigna las divisas autorizadas que podrá operar'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Success message */}
        {success ? (
          <div className="py-8 text-center text-emerald-500 animate-fade-in">
            <i className="ri-checkbox-circle-line text-5xl mb-3 block" />
            <h4 className="font-bold text-base text-foreground">¡Usuario Invitado Exitosamente!</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Se ha creado el registro con estado <strong className="text-amber-500 font-semibold">Invitado</strong> y se ha enviado el correo con las credenciales de acceso.
            </p>
          </div>
        ) : (
          <>
            {/* Error message */}
            {error && (
              <div className="p-3 mb-4 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center gap-2">
                <i className="ri-error-warning-line text-sm" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Basic Information & Role */}
            {step === 1 && (
              <form onSubmit={handleSubmitStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    País de Operación
                  </label>
                  <select
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {PAISES_DISPONIBLES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4 Cajitas para Selección de Rol */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Selecciona el Rol *
                    </label>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {rol === 'operador' && 'Requiere autorizar divisas'}
                      {rol === 'dispersor' && 'Pagos y transferencias'}
                      {rol === 'administrador' && 'Acceso a todo el sistema'}
                      {rol === 'super_admin' && 'Control global'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ROLES_OPTIONS.map((r) => {
                      const isSelected = rol === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRol(r.id)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                              : 'border-border bg-card hover:bg-muted/50 hover:border-border/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-colors ${
                                isSelected ? 'bg-primary text-white shadow-sm' : r.colorClass
                              }`}
                            >
                              <i className={r.icon} />
                            </div>
                            {isSelected ? (
                              <i className="ri-checkbox-circle-fill text-primary text-lg" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-muted-foreground/40" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? 'text-primary' : 'text-foreground'
                                }`}
                              >
                                {r.title}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-muted text-muted-foreground border border-border">
                                {r.badge}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground leading-tight mt-1 block">
                              {r.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/25 flex items-center gap-2 transition-all"
                  >
                    {loading && <i className="ri-loader-4-line animate-spin" />}
                    <span>{rol === 'operador' ? 'Continuar a Divisas (Paso 2) →' : 'Invitar Usuario →'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Authorized Currencies (Operador only) */}
            {step === 2 && (
              <form onSubmit={handleSubmitStep2} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Divisas Permitidas para {nombre || email}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      El operador únicamente podrá registrar y visualizar negocios con estas divisas.
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
                  {data.divisas.map((d) => {
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
                  Seleccionadas: <strong className="text-foreground">{divisasAutorizadas.length}</strong> de {data.divisas.length} divisas
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
                    disabled={loading || divisasAutorizadas.length === 0}
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
