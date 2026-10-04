/**
 * Migration 0030: add temperature column to agents table.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      DROP COLUMN IF EXISTS temperature;
  `);
}
