/**
 * Migration 0003: Preprompts and Conversations
 * Creates preprompts, conversation_sessions, and conversation_history tables
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Create preprompts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS preprompts (
      id SERIAL PRIMARY KEY,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create conversation_sessions table for tracking chat sessions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_sessions (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL UNIQUE,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      current_node_id INT REFERENCES dialog_nodes(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create conversation_history table for logging conversations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_history (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      node_id INT REFERENCES dialog_nodes(id) ON DELETE SET NULL,
      user_message TEXT,
      bot_response TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_preprompts_tree_id ON preprompts(tree_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_sessions_tree_id ON conversation_sessions(tree_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_history_tree_id ON conversation_history(tree_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS conversation_history CASCADE;');
  await pool.query('DROP TABLE IF EXISTS conversation_sessions CASCADE;');
  await pool.query('DROP TABLE IF EXISTS preprompts CASCADE;');
}
