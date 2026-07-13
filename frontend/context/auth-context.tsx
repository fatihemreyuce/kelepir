'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, SessionUser } from '@/lib/auth-api';
import { ApiError } from '@/lib/api';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setUser({ ...res.user, createdAt: new Date(0).toISOString() });
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (email: string, password: string) => {
    const res = await authApi.register({ email, password });
    setUser({ ...res.user, createdAt: new Date(0).toISOString() });
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
