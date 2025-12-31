import { pool } from '../db/connection.js';
import { generateEmbedding } from './embeddingService.js';

// Check if we should use mock mode (when DATABASE_URL is not set or database is unavailable)
let useMockMode = false;

// Test database connection
async function testConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

// Initialize connection test
testConnection().then(connected => {
  useMockMode = !connected;
  if (useMockMode) {
    console.log('⚠️  Database not available. Using in-memory mock mode for development.');
    console.log('   Data will not persist. Set up PostgreSQL for production use.');
  }
});

export interface DialogTree {
  id: number;
  name: string;
  description: string | null;
  ab_variation_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface DialogNode {
  id: number;
  tree_id: number;
  parent_id: number | null;
  user_input: string | null;
  bot_response: string | null;
  vector_embedding: number[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Preprompt {
  id: number;
  tree_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
}

// Import mock service
import { mockService } from './mockService.js';

// Helper to use mock or real service
async function useService<T>(
  realFn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  if (useMockMode) {
    return mockFn();
  }
  try {
    return await realFn();
  } catch (error: any) {
    // If database error, fall back to mock mode
    if (error?.code === '42P01' || error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      console.warn('Database unavailable, switching to mock mode');
      useMockMode = true;
      return mockFn();
    }
    throw error;
  }
}

// Dialog Tree operations
export async function getAllDialogTrees(abVariationId?: number): Promise<DialogTree[]> {
  return useService(
    async () => {
      let query = 'SELECT * FROM dialog_trees';
      const params: any[] = [];
      
      if (abVariationId !== undefined && abVariationId !== null) {
        query += ' WHERE ab_variation_id = $1';
        params.push(abVariationId);
      }
      // If abVariationId is undefined, return all trees (for backward compatibility)
      
      query += ' ORDER BY updated_at DESC';
      
      const result = await pool.query(query, params);
      console.log(`[getAllDialogTrees] abVariationId: ${abVariationId}, found ${result.rows.length} trees`);
      return result.rows;
    },
    () => mockService.getAllDialogTrees()
  );
}

export async function getDialogTreeById(id: number): Promise<DialogTree | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM dialog_trees WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockService.getDialogTreeById(id)
  );
}

export async function createDialogTree(
  name: string,
  description?: string,
  abVariationId?: number
): Promise<DialogTree> {
  return useService(
    async () => {
      const result = await pool.query(
        'INSERT INTO dialog_trees (name, description, ab_variation_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description || null, abVariationId || null]
      );
      return result.rows[0];
    },
    () => mockService.createDialogTree(name, description)
  );
}

export async function updateDialogTree(
  id: number,
  name: string,
  description?: string
): Promise<DialogTree> {
  return useService(
    async () => {
      const result = await pool.query(
        'UPDATE dialog_trees SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [name, description || null, id]
      );
      return result.rows[0];
    },
    () => mockService.updateDialogTree(id, name, description)
  );
}

export async function deleteDialogTree(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM dialog_trees WHERE id = $1', [id]);
    },
    async () => {
      await mockService.deleteDialogTree(id);
    }
  ) as Promise<void>;
}

// Dialog Node operations
export async function getNodesByTreeId(treeId: number): Promise<DialogNode[]> {
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM dialog_nodes WHERE tree_id = $1 ORDER BY created_at ASC',
        [treeId]
      );
      return result.rows;
    },
    () => mockService.getNodesByTreeId(treeId)
  );
}

export async function getNodeById(id: number): Promise<DialogNode | null> {
  return useService(
    async () => {
      const result = await pool.query('SELECT * FROM dialog_nodes WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    () => mockService.getNodeById(id)
  );
}

export async function createDialogNode(
  treeId: number,
  parentId: number | null,
  userInput: string | null,
  botResponse: string | null,
  generateEmbeddingForNode: boolean = true
): Promise<DialogNode> {
  return useService(
    async () => {
      let embedding: number[] | null = null;
      
      if (generateEmbeddingForNode && (userInput || botResponse)) {
        const textToEmbed = `${userInput || ''} ${botResponse || ''}`.trim();
        if (textToEmbed) {
          embedding = await generateEmbedding(textToEmbed);
        }
      }

      const result = await pool.query(
        `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response, vector_embedding)
         VALUES ($1, $2, $3, $4, $5::vector) RETURNING *`,
        [treeId, parentId, userInput, botResponse, embedding ? `[${embedding.join(',')}]` : null]
      );
      return result.rows[0];
    },
    () => mockService.createDialogNode(treeId, parentId, userInput, botResponse)
  );
}

export async function updateDialogNode(
  id: number,
  userInput: string | null,
  botResponse: string | null,
  generateEmbeddingForNode: boolean = true
): Promise<DialogNode> {
  return useService(
    async () => {
      let embedding: number[] | null = null;
      
      if (generateEmbeddingForNode && (userInput || botResponse)) {
        const textToEmbed = `${userInput || ''} ${botResponse || ''}`.trim();
        if (textToEmbed) {
          embedding = await generateEmbedding(textToEmbed);
        }
      }

      const result = await pool.query(
        `UPDATE dialog_nodes 
         SET user_input = $1, bot_response = $2, vector_embedding = $3::vector, updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [
          userInput,
          botResponse,
          embedding ? `[${embedding.join(',')}]` : null,
          id
        ]
      );
      return result.rows[0];
    },
    () => mockService.updateDialogNode(id, userInput, botResponse)
  );
}

export async function deleteDialogNode(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM dialog_nodes WHERE id = $1', [id]);
    },
    async () => {
      await mockService.deleteDialogNode(id);
    }
  ) as Promise<void>;
}

// Preprompt operations
export async function getPrepromptByTreeId(treeId: number): Promise<Preprompt | null> {
  return useService(
    async () => {
      const result = await pool.query(
        'SELECT * FROM preprompts WHERE tree_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [treeId]
      );
      return result.rows[0] || null;
    },
    () => mockService.getPrepromptByTreeId(treeId)
  );
}

export async function createOrUpdatePreprompt(
  treeId: number,
  content: string
): Promise<Preprompt> {
  return useService(
    async () => {
      // Check if preprompt exists directly in database
      const existingResult = await pool.query(
        'SELECT * FROM preprompts WHERE tree_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [treeId]
      );
      const existing = existingResult.rows[0];
      
      if (existing) {
        const result = await pool.query(
          'UPDATE preprompts SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [content, existing.id]
        );
        return result.rows[0];
      } else {
        const result = await pool.query(
          'INSERT INTO preprompts (tree_id, content) VALUES ($1, $2) RETURNING *',
          [treeId, content]
        );
        return result.rows[0];
      }
    },
    () => mockService.createOrUpdatePreprompt(treeId, content)
  );
}

export async function deletePreprompt(id: number): Promise<void> {
  return useService(
    async () => {
      await pool.query('DELETE FROM preprompts WHERE id = $1', [id]);
    },
    async () => {
      await mockService.deletePreprompt(id);
    }
  ) as Promise<void>;
}

