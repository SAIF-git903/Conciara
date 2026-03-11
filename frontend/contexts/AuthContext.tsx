'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { setTokenRefreshCallback } from '@/lib/api';

export type UserRole = 'owner' | 'member';

export interface Workspace {
  id: number;
  name: string;
  plan: string;
  role: UserRole;
}

export interface User {
  id: number;
  email: string;
  fullName?: string;
  role: UserRole;
  workspaces?: Workspace[];
  websites?: Array<{ websiteId: number; websiteName: string; domain: string; role: string }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  acceptInvite: (token: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN = 'auth_token';
const AUTH_REFRESH = 'auth_refresh_token';
const AUTH_USER = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN) : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER) : null;
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(AUTH_TOKEN);
        localStorage.removeItem(AUTH_REFRESH);
        localStorage.removeItem(AUTH_USER);
      }
    }
    setLoading(false);
  }, []);

  // When api refreshes tokens (after 401), update state so UI and logout use the new token
  useEffect(() => {
    setTokenRefreshCallback((newToken, newRefreshToken) => {
      setToken(newToken);
      localStorage.setItem(AUTH_TOKEN, newToken);
      localStorage.setItem(AUTH_REFRESH, newRefreshToken);
    });
    return () => setTokenRefreshCallback(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<{
        token: string;
        refreshToken: string;
        user: User;
      }>('/auth/login', { email, password });

      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      const wsList = data.user.workspaces ?? [];
      const hasWorkspaces = wsList.length > 0;
      if (hasWorkspaces) {
        if (wsList.length > 1) {
          router.push('/choose-workspace');
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/onboarding');
      }
    },
    [router]
  );

  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const { data } = await api.post<{
        token: string;
        refreshToken: string;
        user: User;
      }>('/auth/signup', { email, password, fullName: fullName || undefined });

      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      router.push('/onboarding');
    },
    [router]
  );

  const acceptInvite = useCallback(
    async (inviteToken: string, password: string, fullName?: string) => {
      const { data } = await api.post<{
        token: string;
        refreshToken: string;
        user: User;
      }>('/auth/invite/accept', { token: inviteToken, password, fullName: fullName || undefined });

      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      const wsList = data.user.workspaces ?? [];
      if (wsList.length > 1) {
        router.push('/choose-workspace');
      } else {
        router.push('/dashboard');
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_REFRESH) : null;
    try {
      if (token && refreshToken) {
        await api.post('/auth/logout', { refreshToken }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // Ignore; clear local state anyway
    }
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(AUTH_REFRESH);
    localStorage.removeItem(AUTH_USER);
    setToken(null);
    setUser(null);
    router.push('/signin');
  }, [router, token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
    } catch {
      logout();
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        acceptInvite,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
