/**
 * API client. On 401 tries refresh token; redirects to /signin only if refresh fails.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

/** Single source for API base URL: set NEXT_PUBLIC_API_URL in .env (e.g. .env.local). Fallback only for local dev. */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.replace(/\/+$/, '');
}

/** Origin for Socket.IO (no /api path). */
export function getSocketUrl(): string {
  const base = getApiBaseUrl();
  return base.replace(/\/api\/?$/, '') || base;
}

function clearAuthAndRedirect(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('auth_user');
  window.location.href = '/signin';
}

/** Callback when tokens are refreshed (so AuthContext can update state). */
let onTokenRefreshed: ((token: string, refreshToken: string) => void) | null = null;

export function setTokenRefreshCallback(cb: ((token: string, refreshToken: string) => void) | null): void {
  onTokenRefreshed = cb;
}

/** Single in-flight refresh promise so concurrent 401s share one refresh. */
let refreshPromise: Promise<string | null> | null = null;

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const is401 = error.response?.status === 401;
    const isRefreshRoute =
      originalRequest?.url?.includes('/auth/refresh') ?? false;

    if (is401 && typeof window !== 'undefined' && originalRequest && !originalRequest._retry && !isRefreshRoute) {
      const refreshToken = localStorage.getItem('auth_refresh_token');
      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = (async (): Promise<string | null> => {
          try {
            const { data } = await axios.post<{ token: string; refreshToken: string }>(
              `${getApiBaseUrl()}/auth/refresh`,
              { refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('auth_refresh_token', data.refreshToken);
            onTokenRefreshed?.(data.token, data.refreshToken);
            return data.token;
          } catch {
            clearAuthAndRedirect();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api.request(originalRequest);
      }
      return Promise.reject(error);
    }

    if (is401 && typeof window !== 'undefined') {
      clearAuthAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default api;
