/**
 * Migration 0019: add trained_link_count to agent_documents for Website crawl.
 * Used to detect when links were added or removed since last train.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agent_documents
      ADD COLUMN IF NOT EXISTS trained_link_count INTEGER DEFAULT NULL;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agent_documents DROP COLUMN IF EXISTS trained_link_count;
  `);
}
