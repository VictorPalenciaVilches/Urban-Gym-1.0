import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi, membersApi } from '../api/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription_status?: string;
  subscription_plan?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!storedUser || !accessToken) {
        setLoading(false);
        return;
      }

      // Si el token expiró, refrescarlo primero
      if (isTokenExpired(accessToken)) {
        if (refreshToken && !isTokenExpired(refreshToken)) {
          try {
            const { data } = await authApi.refresh(refreshToken);
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
          } catch {
            localStorage.clear();
            setLoading(false);
            return;
          }
        } else {
          localStorage.clear();
          setLoading(false);
          return;
        }
      }

      // Consultar rol actual desde la BD (por si el admin lo cambió)
      try {
        const { data: me } = await membersApi.getMe();
        const updatedUser: User = {
          ...JSON.parse(storedUser),
          role: me.roles?.name || me.role || 'member',
          subscription_status: me.subscription_status,
          subscription_plan: me.subscription_plan,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch {
        setUser(JSON.parse(storedUser));
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const userData: User = {
      ...data.member,
      role: data.member.roles?.name || 'member',
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
