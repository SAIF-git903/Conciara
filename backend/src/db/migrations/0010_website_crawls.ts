/**
 * Migration 0010: website_crawls for onboarding Link step.
 * Stores crawled site metadata and training-ready content; linked to workspace, optionally to agent.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS website_crawls (
      id SERIAL PRIMARY KEY,
      workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
      url VARCHAR(2048) NOT NULL,
      title VARCHAR(1024),
      description TEXT,
      logo_url VARCHAR(2048),
      use_case VARCHAR(64) NOT NULL DEFAULT 'general',
      training_content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_website_crawls_workspace_id ON website_crawls(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_website_crawls_agent_id ON website_crawls(agent_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS website_crawls CASCADE;');
}
