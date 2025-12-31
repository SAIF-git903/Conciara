// Mock service for development when database is not available
import { DialogTree, DialogNode, Preprompt } from './dialogService.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const MOCK_DATA_FILE = join(process.cwd(), 'mock-dialog-data.json');

interface MockDialogData {
  trees: DialogTree[];
  nodes: DialogNode[];
  preprompts: Preprompt[];
}

function loadMockDialogData(): MockDialogData {
  if (existsSync(MOCK_DATA_FILE)) {
    try {
      const data = readFileSync(MOCK_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        trees: parsed.trees?.map((t: any) => ({
          ...t,
          created_at: new Date(t.created_at),
          updated_at: new Date(t.updated_at),
        })) || [],
        nodes: parsed.nodes?.map((n: any) => ({
          ...n,
          created_at: new Date(n.created_at),
          updated_at: new Date(n.updated_at),
        })) || [],
        preprompts: parsed.prompts?.map((p: any) => ({
          ...p,
          created_at: new Date(p.created_at),
          updated_at: new Date(p.updated_at),
        })) || [],
      };
    } catch (error) {
      console.error('Error loading mock dialog data:', error);
    }
  }
  
  const defaultData: MockDialogData = {
    trees: [],
    nodes: [],
    preprompts: [],
  };
  
  saveMockDialogData(defaultData);
  return defaultData;
}

function saveMockDialogData(data: MockDialogData): void {
  try {
    writeFileSync(MOCK_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving mock dialog data:', error);
  }
}

let mockData = loadMockDialogData();
let nextTreeId = Math.max(1, ...mockData.trees.map(t => t.id), 0) + 1;
let nextNodeId = Math.max(1, ...mockData.nodes.map(n => n.id), 0) + 1;
let nextPrepromptId = Math.max(1, ...mockData.preprompts.map(p => p.id), 0) + 1;

export const mockService = {
  getAllDialogTrees: async (): Promise<DialogTree[]> => {
    mockData = loadMockDialogData();
    return [...mockData.trees];
  },

  getDialogTreeById: async (id: number): Promise<DialogTree | null> => {
    mockData = loadMockDialogData();
    return mockData.trees.find(t => t.id === id) || null;
  },

  createDialogTree: async (name: string, description?: string, abVariationId?: number): Promise<DialogTree> => {
    mockData = loadMockDialogData();
    const tree: DialogTree = {
      id: nextTreeId++,
      name,
      description: description || null,
      ab_variation_id: abVariationId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.trees.push(tree);
    saveMockDialogData(mockData);
    return tree;
  },

  updateDialogTree: async (id: number, name: string, description?: string): Promise<DialogTree> => {
    mockData = loadMockDialogData();
    const tree = mockData.trees.find(t => t.id === id);
    if (!tree) throw new Error('Tree not found');
    tree.name = name;
    tree.description = description || null;
    tree.updated_at = new Date();
    saveMockDialogData(mockData);
    return tree;
  },

  deleteDialogTree: async (id: number): Promise<void> => {
    mockData = loadMockDialogData();
    mockData.trees = mockData.trees.filter(t => t.id !== id);
    mockData.nodes = mockData.nodes.filter(n => n.tree_id !== id);
    mockData.preprompts = mockData.preprompts.filter(p => p.tree_id !== id);
    saveMockDialogData(mockData);
  },

  getNodesByTreeId: async (treeId: number): Promise<DialogNode[]> => {
    mockData = loadMockDialogData();
    return mockData.nodes.filter(n => n.tree_id === treeId);
  },

  getNodeById: async (id: number): Promise<DialogNode | null> => {
    mockData = loadMockDialogData();
    return mockData.nodes.find(n => n.id === id) || null;
  },

  createDialogNode: async (
    treeId: number,
    parentId: number | null,
    userInput: string | null,
    botResponse: string | null
  ): Promise<DialogNode> => {
    mockData = loadMockDialogData();
    const node: DialogNode = {
      id: nextNodeId++,
      tree_id: treeId,
      parent_id: parentId,
      user_input: userInput,
      bot_response: botResponse,
      vector_embedding: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockData.nodes.push(node);
    saveMockDialogData(mockData);
    return node;
  },

  updateDialogNode: async (
    id: number,
    userInput: string | null,
    botResponse: string | null
  ): Promise<DialogNode> => {
    mockData = loadMockDialogData();
    const node = mockData.nodes.find(n => n.id === id);
    if (!node) throw new Error('Node not found');
    node.user_input = userInput;
    node.bot_response = botResponse;
    node.updated_at = new Date();
    saveMockDialogData(mockData);
    return node;
  },

  deleteDialogNode: async (id: number): Promise<void> => {
    mockData = loadMockDialogData();
    // Also delete children
    const deleteRecursive = (nodeId: number) => {
      mockData.nodes = mockData.nodes.filter(n => {
        if (n.id === nodeId) return false;
        if (n.parent_id === nodeId) {
          deleteRecursive(n.id);
          return false;
        }
        return true;
      });
    };
    deleteRecursive(id);
    saveMockDialogData(mockData);
  },

  getPrepromptByTreeId: async (treeId: number): Promise<Preprompt | null> => {
    mockData = loadMockDialogData();
    return mockData.preprompts.find(p => p.tree_id === treeId) || null;
  },

  createOrUpdatePreprompt: async (treeId: number, content: string): Promise<Preprompt> => {
    mockData = loadMockDialogData();
    const existing = mockData.preprompts.find(p => p.tree_id === treeId);
    if (existing) {
      existing.content = content;
      existing.updated_at = new Date();
      saveMockDialogData(mockData);
      return existing;
    } else {
      const preprompt: Preprompt = {
        id: nextPrepromptId++,
        tree_id: treeId,
        content,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockData.preprompts.push(preprompt);
      saveMockDialogData(mockData);
      return preprompt;
    }
  },

  deletePreprompt: async (id: number): Promise<void> => {
    mockData = loadMockDialogData();
    mockData.preprompts = mockData.preprompts.filter(p => p.id !== id);
    saveMockDialogData(mockData);
  },
};

