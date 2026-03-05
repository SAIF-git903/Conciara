/**
 * RAG for agents: retrieve relevant document chunks by semantic (or keyword) similarity.
 */

import { pool } from '../db/connection.js';
import { generateEmbedding } from './embeddingService.js';

let hasVectorExtension: boolean | null = null;

async function checkVectorExtension(): Promise<boolean> {
  if (hasVectorExtension !== null) return hasVectorExtension;
  try {
    const result = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    hasVectorExtension = result.rows[0]?.has_vector ?? false;
    return hasVectorExtension ?? false;
  } catch {
    hasVectorExtension = false;
    return false;
  }
}

export interface RetrievedChunk {
  id: number;
  content: string;
  documentId: number;
  chunkIndex: number;
  similarity?: number;
}

const DEFAULT_TOP_K = 10;
const MIN_SIMILARITY = 0.5;

/**
 * Retrieve top-k chunks for an agent that are most relevant to the query.
 * Uses vector similarity when embeddings exist; otherwise keyword fallback.
 */
export async function retrieveChunks(
  agentId: number,
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievedChunk[]> {
  const trimmed = query?.trim();
  if (!trimmed) return [];

  const hasVector = await checkVectorExtension();
  const queryEmbedding = await generateEmbedding(trimmed);

  if (hasVector && queryEmbedding) {
    const embeddingValue = `[${queryEmbedding.join(',')}]`;
    const rows = await pool.query(
      `SELECT c.id, c.content, c.document_id, c.chunk_index,
              (1 - (c.embedding <=> $2::vector)) AS similarity
       FROM agent_document_chunks c
       INNER JOIN agent_documents d ON d.id = c.document_id AND d.status = 'ready'
       WHERE c.agent_id = $1 AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $2::vector
       LIMIT $3`,
      [agentId, embeddingValue, topK]
    );
    return (rows.rows as any[])
      .filter((r) => (r.similarity ?? 0) >= MIN_SIMILARITY)
      .map((r) => ({
        id: r.id,
        content: r.content,
        documentId: r.document_id,
        chunkIndex: r.chunk_index,
        similarity: r.similarity,
      }));
  }

  // Keyword fallback: chunks that contain any significant word from the query
  const words = trimmed
    .split(/\s+/)
    .map((w) => w.replace(/\W/g, '').toLowerCase())
    .filter((w) => w.length > 2);
  if (words.length === 0) {
    const rows = await pool.query(
      `SELECT c.id, c.content, c.document_id, c.chunk_index
       FROM agent_document_chunks c
       INNER JOIN agent_documents d ON d.id = c.document_id AND d.status = 'ready'
       WHERE c.agent_id = $1
       ORDER BY c.document_id, c.chunk_index
       LIMIT $2`,
      [agentId, topK]
    );
    return rows.rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      documentId: r.document_id,
      chunkIndex: r.chunk_index,
    }));
  }

  const params: (number | string)[] = [agentId, ...words, topK];
  const limitParam = params.length;
  const rows = await pool.query(
    `SELECT c.id, c.content, c.document_id, c.chunk_index
     FROM agent_document_chunks c
     INNER JOIN agent_documents d ON d.id = c.document_id AND d.status = 'ready'
     WHERE c.agent_id = $1 AND (${words.map((_, i) => `c.content ILIKE '%' || $${i + 2} || '%'`).join(' OR ')})
     ORDER BY c.document_id, c.chunk_index
     LIMIT $${limitParam}`,
    params
  );
  return rows.rows.map((r: any) => ({
    id: r.id,
    content: r.content,
    documentId: r.document_id,
    chunkIndex: r.chunk_index,
  }));
}
