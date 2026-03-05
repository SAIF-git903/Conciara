/**
 * Migration 0012: Agent documents and chunks for file-based training (RAG).
 * Documents: metadata per uploaded file. Chunks: text + vector embedding for retrieval.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  const vectorCheck = await pool.query(`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
  `);
  const hasVector = vectorCheck.rows[0]?.has_vector || false;
  const embeddingType = hasVector ? 'VECTOR(1536)' : 'TEXT';

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_documents (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      file_name VARCHAR(512) NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      error_message TEXT,
      chunk_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT agent_documents_status_check CHECK (status IN ('pending', 'processing', 'ready', 'failed'))
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_document_chunks (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES agent_documents(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      embedding ${embeddingType},
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_documents_agent_id ON agent_documents(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_documents_workspace_id ON agent_documents(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_agent_documents_status ON agent_documents(status);
    CREATE INDEX IF NOT EXISTS idx_agent_document_chunks_document_id ON agent_document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_agent_document_chunks_agent_id ON agent_document_chunks(agent_id);
  `);

  // Optional: add ivfflat index for fast similarity search after table has many rows:
  // CREATE INDEX idx_agent_document_chunks_embedding ON agent_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS agent_document_chunks;`);
  await pool.query(`DROP TABLE IF EXISTS agent_documents;`);
}
