/**
 * Migration 0022: agent integrations (Slack, etc.) stored as JSON per agent.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT NULL;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents DROP COLUMN IF EXISTS integrations;
  `);
}
