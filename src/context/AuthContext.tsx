import { roleLabels, type StaffRole } from '../utils/roles';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clearTwoFactorVerification, connectTwoFactorTabs, getTwoFactorSessionKey } from '../utils/twoFactorTabs';
import { normalizeBiometricCredentials, type BiometricCredentialRecord } from '../utils/biometricAuth';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nombre?: string;
  role: StaffRole | 'client';
  rol?: string;
  pais: string;
  operator_code?: string;
  codigo?: string;
  authorized_currencies: string[];
  two_factor_enabled?: boolean;
  two_factor_secret?: string;
  two_factor_backup_codes?: string[];
  biometric_credentials?: BiometricCredentialRecord[];
  onboarding_completed?: boolean;
  status?: string;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  is2faVerified: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  verify2FASession: () => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const SUPER_ADMIN_EMAIL = 'desarrollor@jeroallsolutions.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('kaupaloki_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [sessionIdentity, setSessionIdentity] = useState<string>();
  const [verifiedIdentity, setVerifiedIdentity] = useState<string>();
  const is2faVerified = sessionIdentity !== undefined && verifiedIdentity === sessionIdentity;
  const activeSession = useRef<string | undefined>(undefined);
  const loadedUserId = useRef<string | undefined>(undefined);
  const verification = useRef<ReturnType<typeof connectTwoFactorTabs> | undefined>(undefined);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('kaupaloki_theme') as 'dark' | 'light') || 'dark';
  });

  const syncThemeToDOM = (t: 'dark' | 'light') => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kaupaloki_theme', t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    syncThemeToDOM(next);
  };

  const fetchProfile = async (email: string, authUser: any, isCurrent = () => true) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL;

      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!isCurrent()) return;
      if (error) throw error;

      if (dbProfile) {
        if (dbProfile.status && ['invitado', 'invited'].includes(String(dbProfile.status).toLowerCase())) {
          const { data: activated, error: activationError } = await supabase.rpc('activar_perfil_invitado');
          if (activationError) throw activationError;
          if (!isCurrent()) return;
          if (activated) dbProfile.status = 'activo';
        }

        let finalRole: any = dbProfile.role || 'operador';
        if (isSuper || finalRole === 'super_admin') finalRole = 'super_admin';
        else if (finalRole === 'dispersador' || finalRole === 'dispersor') finalRole = 'dispersor';
        else if (finalRole === 'administrador' || finalRole === 'admin') finalRole = 'administrador';
        else if (finalRole === 'cliente' || finalRole === 'client') finalRole = 'client';
        else if (!['operador', 'comercial', 'supervisor'].includes(finalRole)) finalRole = 'client';

        const readableRole = finalRole === 'client' ? 'CLIENTE' : roleLabels[finalRole as StaffRole].toUpperCase();

        const normalizedProfile: UserProfile = {
          ...dbProfile,
          full_name: dbProfile.full_name || cleanEmail.split('@')[0],
          nombre: dbProfile.full_name || cleanEmail.split('@')[0],
          role: finalRole,
          rol: readableRole,
          codigo: dbProfile.operator_code || '',
          authorized_currencies: Array.isArray(dbProfile.authorized_currencies) ? dbProfile.authorized_currencies : [],
          biometric_credentials: normalizeBiometricCredentials(dbProfile.biometric_credentials),
        };

        setProfile(normalizedProfile);
        try {
          localStorage.setItem('kaupaloki_user_profile', JSON.stringify(normalizedProfile));
        } catch (_) {}
      } else {
        const fallbackRole = isSuper ? 'super_admin' : 'operador';
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: cleanEmail,
          full_name: cleanEmail.split('@')[0],
          nombre: cleanEmail.split('@')[0],
          role: fallbackRole,
          rol: isSuper ? 'SUPER ADMIN' : 'OPERADOR',
          pais: 'COL',
          authorized_currencies: ['USD', 'USDT', 'COP'],
          two_factor_enabled: false,
        };
        setProfile(fallbackProfile);
        try {
          localStorage.setItem('kaupaloki_user_profile', JSON.stringify(fallbackProfile));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      const identity = getTwoFactorSessionKey(session) ?? session.access_token;
      if (identity !== activeSession.current) return;
      setUser(session.user);
      await fetchProfile(session.user.email, session.user, () => activeSession.current === identity);
    }
  };

  const logout = async () => {
    verification.current?.close();
    verification.current = undefined;
    activeSession.current = undefined;
    loadedUserId.current = undefined;
    clearTwoFactorVerification();
    localStorage.removeItem('kaupaloki_user_profile');
    setSessionIdentity(undefined);
    setVerifiedIdentity(undefined);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.replace('/login');
  };

  useEffect(() => {
    syncThemeToDOM(theme);

    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      if (!session?.user?.email) {
        verification.current?.close();
        verification.current = undefined;
        activeSession.current = undefined;
        loadedUserId.current = undefined;
        clearTwoFactorVerification();
        setSessionIdentity(undefined);
        setVerifiedIdentity(undefined);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const key = getTwoFactorSessionKey(session);
      const identity = key ?? session.access_token;
      if (identity === activeSession.current && event !== 'USER_UPDATED') return;

      if (identity !== activeSession.current) {
        verification.current?.close();
        activeSession.current = identity;
        const connection = connectTwoFactorTabs(key, () => {
          if (mounted && activeSession.current === identity) setVerifiedIdentity(identity);
        });
        verification.current = connection;
        setSessionIdentity(identity);
        setVerifiedIdentity(connection.verified() ? identity : undefined);
      }
      // Recovery can issue a new session for the same user. Keep that form mounted
      // while the verification state switches to the new session.
      const needsProfile = loadedUserId.current !== session.user.id;
      if (!needsProfile && event !== 'USER_UPDATED') return;
      if (needsProfile) {
        setLoading(true);
        setProfile((current) => current?.id === session.user.id ? current : null);
      }
      setUser(session.user);

      // Supabase auth callbacks hold the session lock. Query the profile after releasing it.
      const isCurrent = () => mounted && activeSession.current === identity;
      setTimeout(() => {
        if (!isCurrent()) return;
        void Promise.all([
          fetchProfile(session.user.email!, session.user, isCurrent),
          verification.current?.ready,
        ]).then(() => {
          if (isCurrent()) {
            loadedUserId.current = session.user.id;
            setLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      verification.current?.close();
      verification.current = undefined;
      activeSession.current = undefined;
      loadedUserId.current = undefined;
    };
  }, []);

  const verify2FASession = () => {
    const connection = verification.current;
    if (!sessionIdentity || sessionIdentity !== activeSession.current || !connection) return false;
    connection.verify();
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        is2faVerified,
        theme,
        toggleTheme,
        logout,
        refreshProfile,
        verify2FASession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
