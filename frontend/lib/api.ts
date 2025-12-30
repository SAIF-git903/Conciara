import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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
  getAll: async (): Promise<DialogTree[]> => {
    const response = await api.get('/dialog-tree');
    return response.data;
  },
  getById: async (id: number): Promise<DialogTree> => {
    const response = await api.get(`/dialog-tree/${id}`);
    return response.data;
  },
  create: async (name: string, description?: string): Promise<DialogTree> => {
    const response = await api.post('/dialog-tree', { name, description });
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

