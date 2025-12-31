import { pool } from '../db/connection.js';
import { generateEmbedding } from './embeddingService.js';

// Check if vector extension is available
let hasVectorExtension: boolean | null = null;

async function checkVectorExtension(): Promise<boolean> {
  if (hasVectorExtension !== null) {
    return hasVectorExtension;
  }
  try {
    const result = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    hasVectorExtension = result.rows[0]?.has_vector || false;
    return hasVectorExtension as boolean;
  } catch (error) {
    hasVectorExtension = false;
    return false;
  }
}

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


// Dialog Tree operations
export async function getAllDialogTrees(abVariationId?: number): Promise<DialogTree[]> {
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
}

export async function getDialogTreeById(id: number): Promise<DialogTree | null> {
  const result = await pool.query('SELECT * FROM dialog_trees WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createDialogTree(
  name: string,
  description?: string,
  abVariationId?: number
): Promise<DialogTree> {
  const result = await pool.query(
    'INSERT INTO dialog_trees (name, description, ab_variation_id) VALUES ($1, $2, $3) RETURNING *',
    [name, description || null, abVariationId || null]
  );
  return result.rows[0];
}

export async function updateDialogTree(
  id: number,
  name: string,
  description?: string
): Promise<DialogTree> {
  const result = await pool.query(
    'UPDATE dialog_trees SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, description || null, id]
  );
  if (result.rows.length === 0) {
    throw new Error('Dialog tree not found');
  }
  return result.rows[0];
}

export async function deleteDialogTree(id: number): Promise<void> {
  await pool.query('DELETE FROM dialog_trees WHERE id = $1', [id]);
}

// Dialog Node operations
export async function getNodesByTreeId(treeId: number): Promise<DialogNode[]> {
  const result = await pool.query(
    'SELECT * FROM dialog_nodes WHERE tree_id = $1 ORDER BY created_at ASC',
    [treeId]
  );
  return result.rows;
}

export async function getNodeById(id: number): Promise<DialogNode | null> {
  const result = await pool.query('SELECT * FROM dialog_nodes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createDialogNode(
  treeId: number,
  parentId: number | null,
  userInput: string | null,
  botResponse: string | null,
  generateEmbeddingForNode: boolean = true
): Promise<DialogNode> {
  let embedding: number[] | null = null;
  
  if (generateEmbeddingForNode && (userInput || botResponse)) {
    const textToEmbed = `${userInput || ''} ${botResponse || ''}`.trim();
    if (textToEmbed) {
      embedding = await generateEmbedding(textToEmbed);
    }
  }

  // Check if vector extension is available
  const hasVector = await checkVectorExtension();
  
  // Format embedding based on whether vector type exists
  let embeddingValue: string | null = null;
  if (embedding) {
    if (hasVector) {
      embeddingValue = `[${embedding.join(',')}]`;
    } else {
      embeddingValue = JSON.stringify(embedding);
    }
  }

  // Build query based on vector extension availability
  const query = hasVector
    ? `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response, vector_embedding)
       VALUES ($1, $2, $3, $4, $5::vector) RETURNING *`
    : `INSERT INTO dialog_nodes (tree_id, parent_id, user_input, bot_response, vector_embedding)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`;

  const result = await pool.query(query, [
    treeId,
    parentId,
    userInput,
    botResponse,
    embeddingValue
  ]);
  return result.rows[0];
}

export async function updateDialogNode(
  id: number,
  userInput: string | null,
  botResponse: string | null,
  generateEmbeddingForNode: boolean = true
): Promise<DialogNode> {
  let embedding: number[] | null = null;
  
  if (generateEmbeddingForNode && (userInput || botResponse)) {
    const textToEmbed = `${userInput || ''} ${botResponse || ''}`.trim();
    if (textToEmbed) {
      embedding = await generateEmbedding(textToEmbed);
    }
  }

  // Check if vector extension is available
  const hasVector = await checkVectorExtension();
  
  // Format embedding based on whether vector type exists
  let embeddingValue: string | null = null;
  if (embedding) {
    if (hasVector) {
      embeddingValue = `[${embedding.join(',')}]`;
    } else {
      embeddingValue = JSON.stringify(embedding);
    }
  }

  // Build query based on vector extension availability
  const query = hasVector
    ? `UPDATE dialog_nodes 
       SET user_input = $1, bot_response = $2, vector_embedding = $3::vector, updated_at = NOW()
       WHERE id = $4 RETURNING *`
    : `UPDATE dialog_nodes 
       SET user_input = $1, bot_response = $2, vector_embedding = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`;

  const result = await pool.query(query, [
    userInput,
    botResponse,
    embeddingValue,
    id
  ]);
  
  if (result.rows.length === 0) {
    throw new Error('Dialog node not found');
  }
  return result.rows[0];
}

export async function deleteDialogNode(id: number): Promise<void> {
  await pool.query('DELETE FROM dialog_nodes WHERE id = $1', [id]);
}

// Preprompt operations
export async function getPrepromptByTreeId(treeId: number): Promise<Preprompt | null> {
  const result = await pool.query(
    'SELECT * FROM preprompts WHERE tree_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [treeId]
  );
  return result.rows[0] || null;
}

export async function createOrUpdatePreprompt(
  treeId: number,
  content: string
): Promise<Preprompt> {
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
}

export async function deletePreprompt(id: number): Promise<void> {
  await pool.query('DELETE FROM preprompts WHERE id = $1', [id]);
}

