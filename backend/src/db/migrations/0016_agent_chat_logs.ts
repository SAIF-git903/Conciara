/**
 * Migration 0016: Agent chat logs (v2) – store sessions and messages per agent.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_chat_sessions (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      session_id VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(agent_id, session_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES agent_chat_sessions(id) ON DELETE CASCADE,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_agent_id ON agent_chat_sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_updated_at ON agent_chat_sessions(agent_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_session_id ON agent_chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_agent_chat_messages_agent_id ON agent_chat_messages(agent_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS agent_chat_messages;`);
  await pool.query(`DROP TABLE IF EXISTS agent_chat_sessions;`);
}
