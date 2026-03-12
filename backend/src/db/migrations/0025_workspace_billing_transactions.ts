/**
 * Migration 0025: Billing history per workspace (Paddle transactions).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_billing_transactions (
      id VARCHAR(255) PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      paddle_transaction_id VARCHAR(255) NOT NULL,
      amount_cents INTEGER,
      currency_code VARCHAR(10),
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(workspace_id, paddle_transaction_id)
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_billing_transactions_workspace_id
    ON workspace_billing_transactions(workspace_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_billing_transactions_created_at
    ON workspace_billing_transactions(created_at DESC);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS workspace_billing_transactions;`);
}
