/**
 * Migration 0021: Workspace invites (for users who don't have an account yet).
 * Stores pending invite by email; they sign up via link with token.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_invites (
      id SERIAL PRIMARY KEY,
      workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      token VARCHAR(64) NOT NULL UNIQUE,
      invited_by_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON workspace_invites(workspace_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS workspace_invites CASCADE;');
}
