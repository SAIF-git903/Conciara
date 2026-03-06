/**
 * Migration 0015: agent widget_config (chat UI / skin config for v2).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT NULL;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents DROP COLUMN IF EXISTS widget_config;
  `);
}
