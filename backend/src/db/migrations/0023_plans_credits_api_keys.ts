/**
 * Migration 0023: Plans, WorkspaceSubscription, WorkspaceCredits, WorkspaceApiKey, credits_used on messages.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name VARCHAR(64) UNIQUE NOT NULL,
      display_name VARCHAR(128) NOT NULL,
      price_monthly DOUBLE PRECISION NOT NULL,
      price_yearly DOUBLE PRECISION NOT NULL,
      message_credits INTEGER NOT NULL,
      max_agents INTEGER NOT NULL,
      max_members INTEGER NOT NULL,
      max_training_bytes BIGINT NOT NULL,
      api_access BOOLEAN NOT NULL DEFAULT false,
      stripe_price_id_monthly VARCHAR(255),
      stripe_price_id_yearly VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_subscriptions (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      status VARCHAR(32) NOT NULL,
      billing_cycle VARCHAR(16) NOT NULL,
      current_period_start TIMESTAMP NOT NULL,
      current_period_end TIMESTAMP NOT NULL,
      cancel_at_period_end BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_credits (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
      included_credits INTEGER NOT NULL,
      bonus_credits INTEGER DEFAULT 0 NOT NULL,
      used_credits INTEGER DEFAULT 0 NOT NULL,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_api_keys (
      id TEXT PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) NOT NULL UNIQUE,
      key_prefix VARCHAR(32) NOT NULL,
      last_used_at TIMESTAMP,
      created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      revoked_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_workspace_id ON workspace_api_keys(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_api_keys_key_hash ON workspace_api_keys(key_hash);
  `);

  await pool.query(`
    ALTER TABLE agent_chat_messages
      ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0 NOT NULL;
  `);
}

export async function down(): Promise<void> {
  await pool.query(`ALTER TABLE agent_chat_messages DROP COLUMN IF EXISTS credits_used;`);
  await pool.query(`DROP TABLE IF EXISTS workspace_api_keys;`);
  await pool.query(`DROP TABLE IF EXISTS workspace_credits;`);
  await pool.query(`DROP TABLE IF EXISTS workspace_subscriptions;`);
  await pool.query(`DROP TABLE IF EXISTS plans;`);
}
