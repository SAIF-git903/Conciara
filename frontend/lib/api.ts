import axios from 'axios';

/** Single source for API base URL: set NEXT_PUBLIC_API_URL in .env (e.g. .env.local). Fallback only for local dev. */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  return url.replace(/\/+$/, '');
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export interface DialogTree {
  id: number;
  name: string;
  description: string | null;
  ab_variation_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerType {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: number;
  customer_type_id: number;
  name: string;
  description: string | null;
  domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Skin {
  id: number;
  website_id: number;
  name: string;
  description: string | null;
  theme_config: any;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ABVariation {
  id: number;
  skin_id: number;
  name: string;
  description: string | null;
  variation_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DialogNode {
  id: number;
  tree_id: number;
  parent_id: number | null;
  user_input: string | null;
  bot_response: string | null;
  vector_embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: number;
  node_id: number;
  media_type: 'image' | 'video';
  s3_key: string;
  s3_url: string;
  presigned_url?: string;
  file_name: string;
  content_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface Preprompt {
  id: number;
  tree_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

// Dialog Tree API
export const dialogTreeApi = {
  getAll: async (abVariationId?: number): Promise<DialogTree[]> => {
    // Always include ab_variation_id in params, even if undefined (backend will handle it)
    const params: any = {};
    if (abVariationId !== undefined && abVariationId !== null) {
      params.ab_variation_id = abVariationId;
    }
    const response = await api.get('/dialog-tree', { params });
    return response.data || [];
  },
  getById: async (id: number): Promise<DialogTree> => {
    const response = await api.get(`/dialog-tree/${id}`);
    return response.data;
  },
  create: async (name: string, description?: string, abVariationId?: number): Promise<DialogTree> => {
    const response = await api.post('/dialog-tree', { name, description, ab_variation_id: abVariationId });
    return response.data;
  },
  update: async (id: number, name: string, description?: string): Promise<DialogTree> => {
    const response = await api.put(`/dialog-tree/${id}`, { name, description });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/dialog-tree/${id}`);
  },
};

// Dialog Node API
export const dialogNodeApi = {
  getByTreeId: async (treeId: number): Promise<DialogNode[]> => {
    const response = await api.get(`/dialog-node/tree/${treeId}`);
    return response.data;
  },
  getById: async (id: number): Promise<DialogNode> => {
    const response = await api.get(`/dialog-node/${id}`);
    return response.data;
  },
  create: async (
    treeId: number,
    parentId: number | null,
    userInput: string | null,
    botResponse: string | null,
    generateEmbedding: boolean = true,
  ): Promise<DialogNode> => {
    const response = await api.post('/dialog-node', {
      tree_id: treeId,
      parent_id: parentId,
      user_input: userInput,
      bot_response: botResponse,
      generate_embedding: generateEmbedding,
    });
    return response.data;
  },
  update: async (
    id: number,
    userInput: string | null,
    botResponse: string | null,
    generateEmbedding: boolean = true,
  ): Promise<DialogNode> => {
    const response = await api.put(`/dialog-node/${id}`, {
      user_input: userInput,
      bot_response: botResponse,
      generate_embedding: generateEmbedding,
    });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/dialog-node/${id}`);
  },
};

// Preprompt API
export const prepromptApi = {
  getByTreeId: async (treeId: number): Promise<Preprompt | null> => {
    const response = await api.get(`/preprompt/tree/${treeId}`);
    return response.data;
  },
  createOrUpdate: async (treeId: number, content: string): Promise<Preprompt> => {
    const response = await api.post('/preprompt', {
      tree_id: treeId,
      content,
    });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/preprompt/${id}`);
  },
};

// Customer Type API
export const customerTypeApi = {
  getAll: async (): Promise<CustomerType[]> => {
    const response = await api.get('/customer-type');
    return response.data;
  },
  getById: async (id: number): Promise<CustomerType> => {
    const response = await api.get(`/customer-type/${id}`);
    return response.data;
  },
  create: async (name: string, description?: string): Promise<CustomerType> => {
    const response = await api.post('/customer-type', { name, description });
    return response.data;
  },
  update: async (id: number, name: string, description?: string): Promise<CustomerType> => {
    const response = await api.put(`/customer-type/${id}`, { name, description });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/customer-type/${id}`);
  },
};

// Website API
export const websiteApi = {
  getByIds: async (ids: number[]): Promise<Website[]> => {
    if (!ids || ids.length === 0) {
      return [];
    }
    const idsParam = ids.join(',');
    const response = await api.get(`/website/by-ids?ids=${idsParam}`);
    return response.data;
  },
  getByCustomerType: async (customerTypeId: number): Promise<Website[]> => {
    const response = await api.get(`/website/customer-type/${customerTypeId}`);
    return response.data;
  },
  getById: async (id: number): Promise<Website> => {
    const response = await api.get(`/website/${id}`);
    return response.data;
  },
  create: async (customerTypeId: number, name: string, description?: string, domain?: string, editorUserId?: number): Promise<Website> => {
    const payload: any = { customer_type_id: customerTypeId, name, description, domain };
    if (editorUserId) {
      payload.editor_user_id = editorUserId;
    }
    const response = await api.post('/website', payload);
    return response.data;
  },
  update: async (id: number, name: string, description?: string, domain?: string, is_active?: boolean): Promise<Website> => {
    const response = await api.put(`/website/${id}`, { name, description, domain, is_active });
    return response.data;
  },
  setActive: async (id: number, is_active: boolean): Promise<Website> => {
    const response = await api.patch(`/website/${id}`, { is_active });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/website/${id}`);
  },
};

// Skin API
export const skinApi = {
  getByWebsite: async (websiteId: number): Promise<Skin[]> => {
    const response = await api.get(`/skin/website/${websiteId}`);
    return response.data;
  },
  getById: async (id: number): Promise<Skin> => {
    const response = await api.get(`/skin/${id}`);
    return response.data;
  },
  create: async (websiteId: number, name: string, description?: string, themeConfig?: any): Promise<Skin> => {
    const response = await api.post('/skin', { website_id: websiteId, name, description, theme_config: themeConfig });
    return response.data;
  },
  update: async (id: number, name: string, description?: string, themeConfig?: any): Promise<Skin> => {
    const response = await api.put(`/skin/${id}`, { name, description, theme_config: themeConfig });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/skin/${id}`);
  },
};

// A/B Variation API
export const abVariationApi = {
  getBySkin: async (skinId: number): Promise<ABVariation[]> => {
    const response = await api.get(`/ab-variation/skin/${skinId}`);
    return response.data;
  },
  getById: async (id: number): Promise<ABVariation> => {
    const response = await api.get(`/ab-variation/${id}`);
    return response.data;
  },
  create: async (skinId: number, name: string, description?: string, variationConfig?: any, isActive?: boolean): Promise<ABVariation> => {
    const response = await api.post('/ab-variation', {
      skin_id: skinId,
      name,
      description,
      variation_config: variationConfig,
      is_active: isActive,
    });
    return response.data;
  },
  update: async (id: number, name: string, description?: string, variationConfig?: any, isActive?: boolean): Promise<ABVariation> => {
    const response = await api.put(`/ab-variation/${id}`, { name, description, variation_config: variationConfig, is_active: isActive });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/ab-variation/${id}`);
  },
};

// Media API
export const mediaApi = {
  upload: async (nodeId: number, file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    // Omit Content-Type so axios sets multipart/form-data with boundary (required for file upload)
    const response = await api.post(`/media/node/${nodeId}`, formData, {
      headers: {
        'Content-Type': undefined,
      } as Record<string, string | undefined>,
    });
    return response.data;
  },
  getByNodeId: async (nodeId: number): Promise<MediaItem[]> => {
    const response = await api.get(`/media/node/${nodeId}`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/media/${id}`);
  },
};
