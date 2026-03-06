/**
 * Migration 0017: agent role for conversational behavior (general | support | sales).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'general';
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents DROP COLUMN IF EXISTS role;
  `);
}
