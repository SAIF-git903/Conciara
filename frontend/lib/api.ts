/**
 * API client. On 401 redirects to /signin.
 */

import axios from 'axios';

/** Single source for API base URL: set NEXT_PUBLIC_API_URL in .env (e.g. .env.local). Fallback only for local dev. */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.replace(/\/+$/, '');
}

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
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default api;
