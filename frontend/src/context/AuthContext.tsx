import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setTokens, clearTokens } from '../api/client';

export type Role = 'admin' | 'operator' | 'viewer';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('vms_user');
    if (cached) setUser(JSON.parse(cached));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setTokens(res.data.accessToken, res.data.refreshToken);
    localStorage.setItem('vms_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem('vms_user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
