import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://conversatreeapi.geniusai.biz/api';
console.log(API_BASE_URL, 'API');
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface User {
  id: number;
  email: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  websites?: Array<{
    websiteId: number;
    websiteName: string;
    domain: string;
    role: string;
  }>;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName?: string;
  role?: 'manager' | 'viewer';
  websiteId?: number;
  websiteIds?: number[];
}

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export const userApi = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id: number): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (input: CreateUserInput): Promise<User> => {
    const response = await api.post('/users', input);
    return response.data;
  },

  update: async (id: number, updates: Partial<CreateUserInput>): Promise<User> => {
    const response = await api.put(`/users/${id}`, updates);
    return response.data;
  },

  updateWebsites: async (id: number, websiteIds: number[]): Promise<{ websites: User['websites'] }> => {
    const response = await api.put(`/users/${id}/websites`, { websiteIds });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
