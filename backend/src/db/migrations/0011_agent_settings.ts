/**
 * Migration 0011: agent settings (model, pre_prompt, logo_url) for onboarding.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS model VARCHAR(64),
      ADD COLUMN IF NOT EXISTS pre_prompt TEXT,
      ADD COLUMN IF NOT EXISTS logo_url VARCHAR(2048);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agents
      DROP COLUMN IF EXISTS model,
      DROP COLUMN IF EXISTS pre_prompt,
      DROP COLUMN IF EXISTS logo_url;
  `);
}
