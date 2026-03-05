/**
 * Migration 0013: Add content column to agent_documents for storing extracted text before training.
 * Upload stores text here; Train runs chunk+embed from content.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE agent_documents
    ADD COLUMN IF NOT EXISTS content TEXT;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE agent_documents
    DROP COLUMN IF EXISTS content;
  `);
}
