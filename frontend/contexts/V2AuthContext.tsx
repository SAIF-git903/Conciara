'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import v2Api from '@/lib/v2-api';

export type V2UserRole = 'owner' | 'member';

export interface V2Workspace {
  id: number;
  name: string;
  plan: string;
  role: V2UserRole;
}

export interface V2User {
  id: number;
  email: string;
  fullName?: string;
  role: V2UserRole;
  /** v2: workspaces the user belongs to (owner or member) */
  workspaces?: V2Workspace[];
  /** v1 legacy */
  websites?: Array<{ websiteId: number; websiteName: string; domain: string; role: string }>;
}

interface V2AuthContextType {
  user: V2User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  /** Accept a workspace invite (create account and join). Used when signing up via invite link. */
  acceptInvite: (token: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const V2AuthContext = createContext<V2AuthContextType | undefined>(undefined);

const AUTH_TOKEN = 'auth_token';
const AUTH_REFRESH = 'auth_refresh_token';
const AUTH_USER = 'auth_user';

export function V2AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<V2User | null>(null);
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

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await v2Api.post<{
        token: string;
        refreshToken: string;
        user: V2User;
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
          router.push('/v2/choose-workspace');
        } else {
          router.push('/v2/dashboard');
        }
      } else {
        router.push('/v2/onboarding');
      }
    },
    [router]
  );

  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const { data } = await v2Api.post<{
        token: string;
        refreshToken: string;
        user: V2User;
      }>('/auth/signup', { email, password, fullName: fullName || undefined });

      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      router.push('/v2/onboarding');
    },
    [router]
  );

  const acceptInvite = useCallback(
    async (inviteToken: string, password: string, fullName?: string) => {
      const { data } = await v2Api.post<{
        token: string;
        refreshToken: string;
        user: V2User;
      }>('/auth/invite/accept', { token: inviteToken, password, fullName: fullName || undefined });

      localStorage.setItem(AUTH_TOKEN, data.token);
      localStorage.setItem(AUTH_REFRESH, data.refreshToken);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      const wsList = data.user.workspaces ?? [];
      if (wsList.length > 1) {
        router.push('/v2/choose-workspace');
      } else {
        router.push('/v2/dashboard');
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_REFRESH) : null;
    try {
      if (token && refreshToken) {
        await v2Api.post('/auth/logout', { refreshToken }, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // Ignore; clear local state anyway
    }
    localStorage.removeItem(AUTH_TOKEN);
    localStorage.removeItem(AUTH_REFRESH);
    localStorage.removeItem(AUTH_USER);
    setToken(null);
    setUser(null);
    router.push('/v2/signin');
  }, [router, token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await v2Api.get<{ user: V2User }>('/auth/me');
      setUser(data.user);
      localStorage.setItem(AUTH_USER, JSON.stringify(data.user));
    } catch {
      logout();
    }
  }, [token, logout]);

  return (
    <V2AuthContext.Provider
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
    </V2AuthContext.Provider>
  );
}

export function useV2Auth() {
  const ctx = useContext(V2AuthContext);
  if (ctx === undefined) {
    throw new Error('useV2Auth must be used within V2AuthProvider');
  }
  return ctx;
}
