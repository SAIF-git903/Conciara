/**
 * Migration 0028: Agent actions (custom API, web search, leads, buttons, etc.).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_actions (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      type VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      config JSONB,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_actions_agent_id ON agent_actions(agent_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_actions_workspace_id ON agent_actions(workspace_id);`);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS agent_actions;`);
}
