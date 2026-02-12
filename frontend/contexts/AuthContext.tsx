'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';

const API_BASE_URL = getApiBaseUrl();

export interface UserWebsite {
  websiteId: number;
  websiteName: string;
  domain: string;
  role: string;
}

export interface User {
  id: number;
  email: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  websites?: UserWebsite[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isViewer: boolean;
  selectedDomainId: number | null;
  setSelectedDomainId: (domainId: number | null) => void;
  availableDomains: Array<{ id: number; name: string; domain: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomainId, setSelectedDomainIdState] = useState<number | null>(null);
  const [availableDomains, setAvailableDomains] = useState<Array<{ id: number; name: string; domain: string }>>([]);
  const router = useRouter();

  // Load selected domain from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_domain_id');
      if (stored) {
        setSelectedDomainIdState(parseInt(stored));
      }
    }
  }, []);

  // Update available domains when user changes
  useEffect(() => {
    if (!user) {
      setAvailableDomains([]);
      return;
    }

    const loadDomains = async () => {
      if (user.role === 'admin') {
        // Load all websites for admin
        try {
          const { customerTypeApi, websiteApi } = await import('@/lib/api');
          const customerTypes = await customerTypeApi.getAll();
          const websites: Array<{ id: number; name: string; domain: string }> = [];

          for (const ct of customerTypes) {
            const ws = await websiteApi.getByCustomerType(ct.id);
            websites.push(
              ...ws.map((w) => ({
                id: w.id,
                name: w.name,
                domain: w.domain || w.name,
              })),
            );
          }

          setAvailableDomains(websites);

          // Validate and auto-select domain
          const currentSelected = selectedDomainId;
          if (websites.length > 0) {
            // Check if current selection is still valid
            const isValid = currentSelected && websites.find((w) => w.id === currentSelected);

            if (!isValid) {
              // Try to restore from localStorage
              const stored = localStorage.getItem('selected_domain_id');
              const storedId = stored ? parseInt(stored) : null;
              const storedIsValid = storedId && websites.find((w) => w.id === storedId);

              if (storedIsValid) {
                setSelectedDomainIdState(storedId);
              } else {
                // Select first domain
                setSelectedDomainIdState(websites[0].id);
                localStorage.setItem('selected_domain_id', websites[0].id.toString());
              }
            }
          } else {
            // No domains available
            setSelectedDomainIdState(null);
            localStorage.removeItem('selected_domain_id');
          }
        } catch (error) {
          console.error('Failed to load domains:', error);
        }
      } else if (user.websites && user.websites.length > 0) {
        // For editors/viewers, use their assigned websites
        const domains = user.websites.map((w) => ({
          id: w.websiteId,
          name: w.websiteName,
          domain: w.domain || w.websiteName,
        }));
        setAvailableDomains(domains);

        const currentSelected = selectedDomainId;

        // Auto-select if only one domain
        if (domains.length === 1) {
          if (currentSelected !== domains[0].id) {
            setSelectedDomainIdState(domains[0].id);
            localStorage.setItem('selected_domain_id', domains[0].id.toString());
          }
        } else if (domains.length > 1) {
          // Validate current selection
          const isValid = currentSelected && domains.find((d) => d.id === currentSelected);

          if (!isValid) {
            // Try to restore from localStorage
            const stored = localStorage.getItem('selected_domain_id');
            const storedId = stored ? parseInt(stored) : null;
            const storedIsValid = storedId && domains.find((d) => d.id === storedId);

            if (storedIsValid) {
              setSelectedDomainIdState(storedId);
            } else {
              // Select first domain
              setSelectedDomainIdState(domains[0].id);
              localStorage.setItem('selected_domain_id', domains[0].id.toString());
            }
          }
        } else {
          // No domains available
          setSelectedDomainIdState(null);
          localStorage.removeItem('selected_domain_id');
        }
      } else {
        setAvailableDomains([]);
      }
    };

    loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setSelectedDomainId = useCallback((domainId: number | null) => {
    setSelectedDomainIdState(domainId);
    if (domainId) {
      localStorage.setItem('selected_domain_id', domainId.toString());
    } else {
      localStorage.removeItem('selected_domain_id');
    }
  }, []);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setLoading(false);
  }, []);

  // Set axios default auth header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email,
          password,
        });

        const { token: newToken, refreshToken, user: userData } = response.data;

        // Store token and user
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_refresh_token', refreshToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));

        setToken(newToken);
        setUser(userData);

        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        // Redirect to home
        router.push('/');
      } catch (error: any) {
        const message = error.response?.data?.error || 'Login failed';
        throw new Error(message);
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    // Clear storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('selected_domain_id');

    // Clear state
    setToken(null);
    setUser(null);
    setSelectedDomainIdState(null);
    setAvailableDomains([]);

    // Remove axios header
    delete axios.defaults.headers.common['Authorization'];

    // Redirect to login
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      const userData = response.data.user;

      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      // If unauthorized, logout
      if (error.response?.status === 401) {
        logout();
      }
    }
  }, [token, logout]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshUser,
        isAdmin,
        isManager,
        isViewer,
        selectedDomainId,
        setSelectedDomainId,
        availableDomains,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
