/**
 * Migration 0014: Agent Q&A for exact question–answer pairs.
 * agent_qa: manual Q&A entries. agent_qa_usage: per-use events for "times asked" and charts.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  const vectorCheck = await pool.query(`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
  `);
  const hasVector = vectorCheck.rows[0]?.has_vector || false;
  const embeddingType = hasVector ? 'VECTOR(1536)' : 'TEXT';

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_qa (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      times_asked INTEGER NOT NULL DEFAULT 0,
      last_asked_at TIMESTAMP,
      question_embedding ${embeddingType},
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_qa_usage (
      id SERIAL PRIMARY KEY,
      qa_id INTEGER NOT NULL REFERENCES agent_qa(id) ON DELETE CASCADE,
      asked_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_qa_agent_id ON agent_qa(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_qa_workspace_id ON agent_qa(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_agent_qa_usage_qa_id ON agent_qa_usage(qa_id);
    CREATE INDEX IF NOT EXISTS idx_agent_qa_usage_asked_at ON agent_qa_usage(qa_id, asked_at);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS agent_qa_usage;`);
  await pool.query(`DROP TABLE IF EXISTS agent_qa;`);
}
