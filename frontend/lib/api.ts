import axios from 'axios';

// Use proxy in production (Vercel), direct URL in development
const getApiBaseUrl = () => {
  // Server-side or during build
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }
  
  // Client-side: use proxy on production, direct URL on localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }
  
  // Production: use the proxy to avoid mixed content issues
  return '/api/proxy';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    console.log('[dialogTreeApi.getAll] Calling with abVariationId:', abVariationId, 'params:', params);
    const response = await api.get('/dialog-tree', { params });
    console.log('[dialogTreeApi.getAll] Received', response.data?.length || 0, 'trees:', response.data?.map((t: any) => t.name));
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
    generateEmbedding: boolean = true
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
    generateEmbedding: boolean = true
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
  getByCustomerType: async (customerTypeId: number): Promise<Website[]> => {
    const response = await api.get(`/website/customer-type/${customerTypeId}`);
    return response.data;
  },
  getById: async (id: number): Promise<Website> => {
    const response = await api.get(`/website/${id}`);
    return response.data;
  },
  create: async (customerTypeId: number, name: string, description?: string, domain?: string): Promise<Website> => {
    const response = await api.post('/website', { customer_type_id: customerTypeId, name, description, domain });
    return response.data;
  },
  update: async (id: number, name: string, description?: string, domain?: string): Promise<Website> => {
    const response = await api.put(`/website/${id}`, { name, description, domain });
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
    const response = await api.post('/ab-variation', { skin_id: skinId, name, description, variation_config: variationConfig, is_active: isActive });
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

