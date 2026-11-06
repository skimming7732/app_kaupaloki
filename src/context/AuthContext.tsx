import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nombre?: string;
  role: 'super_admin' | 'administrador' | 'operador' | 'dispersor' | 'client';
  rol?: string;
  pais: string;
  operator_code?: string;
  codigo?: string;
  authorized_currencies: string[];
  two_factor_enabled?: boolean;
  two_factor_secret?: string;
  two_factor_backup_codes?: string[];
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
  set2faVerified: (val: boolean) => void;
  verify2FASession: () => void;
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
  const [is2faVerified, setIs2faVerified] = useState<boolean>(() => {
    return sessionStorage.getItem('kaupaloki_2fa_verified') === 'true';
  });
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

  const fetchProfile = async (email: string, authUser: any) => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL;

      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (dbProfile) {
        let finalRole: any = dbProfile.role || 'operador';
        if (isSuper) finalRole = 'super_admin';
        else if (finalRole === 'dispersador' || finalRole === 'dispersor') finalRole = 'dispersor';
        else if (finalRole === 'administrador' || finalRole === 'admin') finalRole = 'administrador';
        else if (finalRole === 'cliente' || finalRole === 'client') finalRole = 'client';
        else finalRole = 'operador';

        const readableRole =
          finalRole === 'super_admin'
            ? 'SUPER ADMIN'
            : finalRole === 'administrador'
            ? 'ADMINISTRADOR'
            : finalRole === 'dispersor'
            ? 'DISPERSOR'
            : finalRole === 'client'
            ? 'CLIENTE'
            : 'OPERADOR';

        const normalizedProfile: UserProfile = {
          ...dbProfile,
          full_name: dbProfile.full_name || cleanEmail.split('@')[0],
          nombre: dbProfile.full_name || cleanEmail.split('@')[0],
          role: finalRole,
          rol: readableRole,
          codigo: dbProfile.operator_code || '',
          authorized_currencies: Array.isArray(dbProfile.authorized_currencies) ? dbProfile.authorized_currencies : [],
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
      setUser(session.user);
      await fetchProfile(session.user.email, session.user);
    }
  };

  const set2faVerified = (val: boolean) => {
    setIs2faVerified(val);
    if (val) {
      sessionStorage.setItem('kaupaloki_2fa_verified', 'true');
    } else {
      sessionStorage.removeItem('kaupaloki_2fa_verified');
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('kaupaloki_2fa_verified');
    localStorage.removeItem('kaupaloki_user_profile');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIs2faVerified(false);
    window.location.replace('/login');
  };

  useEffect(() => {
    syncThemeToDOM(theme);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        setUser(session.user);
        await fetchProfile(session.user.email, session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        setUser(session.user);
        await fetchProfile(session.user.email, session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIs2faVerified(false);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const verify2FASession = () => {
    set2faVerified(true);
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
        set2faVerified,
        verify2FASession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
