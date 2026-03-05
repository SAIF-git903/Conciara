/**
 * API client for v2 UI only. Uses same backend; on 401 redirects to /v2/signin.
 */

import axios from 'axios';
import { getApiBaseUrl } from './api';

const v2Api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

v2Api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

v2Api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/v2/signin';
    }
    return Promise.reject(error);
  }
);

export default v2Api;
