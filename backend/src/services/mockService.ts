// Mock service for development when database is not available
import { DialogTree, DialogNode, Preprompt } from './dialogService.js';

let mockTrees: DialogTree[] = [];
let mockNodes: DialogNode[] = [];
let mockPreprompts: Preprompt[] = [];
let nextTreeId = 1;
let nextNodeId = 1;
let nextPrepromptId = 1;

export const mockService = {
  getAllDialogTrees: async (): Promise<DialogTree[]> => {
    return [...mockTrees];
  },

  getDialogTreeById: async (id: number): Promise<DialogTree | null> => {
    return mockTrees.find(t => t.id === id) || null;
  },

  createDialogTree: async (name: string, description?: string): Promise<DialogTree> => {
    const tree: DialogTree = {
      id: nextTreeId++,
      name,
      description: description || null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockTrees.push(tree);
    return tree;
  },

  updateDialogTree: async (id: number, name: string, description?: string): Promise<DialogTree> => {
    const tree = mockTrees.find(t => t.id === id);
    if (!tree) throw new Error('Tree not found');
    tree.name = name;
    tree.description = description || null;
    tree.updated_at = new Date();
    return tree;
  },

  deleteDialogTree: async (id: number): Promise<void> => {
    mockTrees = mockTrees.filter(t => t.id !== id);
    mockNodes = mockNodes.filter(n => n.tree_id !== id);
    mockPreprompts = mockPreprompts.filter(p => p.tree_id !== id);
  },

  getNodesByTreeId: async (treeId: number): Promise<DialogNode[]> => {
    return mockNodes.filter(n => n.tree_id === treeId);
  },

  getNodeById: async (id: number): Promise<DialogNode | null> => {
    return mockNodes.find(n => n.id === id) || null;
  },

  createDialogNode: async (
    treeId: number,
    parentId: number | null,
    userInput: string | null,
    botResponse: string | null
  ): Promise<DialogNode> => {
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
    mockNodes.push(node);
    return node;
  },

  updateDialogNode: async (
    id: number,
    userInput: string | null,
    botResponse: string | null
  ): Promise<DialogNode> => {
    const node = mockNodes.find(n => n.id === id);
    if (!node) throw new Error('Node not found');
    node.user_input = userInput;
    node.bot_response = botResponse;
    node.updated_at = new Date();
    return node;
  },

  deleteDialogNode: async (id: number): Promise<void> => {
    // Also delete children
    const deleteRecursive = (nodeId: number) => {
      mockNodes = mockNodes.filter(n => {
        if (n.id === nodeId) return false;
        if (n.parent_id === nodeId) {
          deleteRecursive(n.id);
          return false;
        }
        return true;
      });
    };
    deleteRecursive(id);
  },

  getPrepromptByTreeId: async (treeId: number): Promise<Preprompt | null> => {
    return mockPreprompts.find(p => p.tree_id === treeId) || null;
  },

  createOrUpdatePreprompt: async (treeId: number, content: string): Promise<Preprompt> => {
    const existing = mockPreprompts.find(p => p.tree_id === treeId);
    if (existing) {
      existing.content = content;
      existing.updated_at = new Date();
      return existing;
    } else {
      const preprompt: Preprompt = {
        id: nextPrepromptId++,
        tree_id: treeId,
        content,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockPreprompts.push(preprompt);
      return preprompt;
    }
  },

  deletePreprompt: async (id: number): Promise<void> => {
    mockPreprompts = mockPreprompts.filter(p => p.id !== id);
  },
};

