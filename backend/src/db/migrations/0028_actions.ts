/**
 * Migration 0028: chatbot actions (custom actions, custom buttons, and upcoming integrations).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionType') THEN
        CREATE TYPE "ActionType" AS ENUM (
          'CUSTOM_ACTION',
          'CUSTOM_BUTTONS',
          'WEB_SEARCH',
          'COLLECT_LEADS',
          'ESCALATE_HUMAN',
          'SLACK',
          'CALENDLY',
          'STRIPE',
          'SHOPIFY',
          'SALESFORCE'
        );
      END IF;
    END$$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chatbot_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      type "ActionType" NOT NULL,
      name TEXT NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_actions_chatbot_type_name_unique
      ON actions (chatbot_id, type, name);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_actions_chatbot_id
      ON actions (chatbot_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_actions_chatbot_enabled
      ON actions (chatbot_id, is_enabled);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS actions;`);
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActionType') THEN
        DROP TYPE "ActionType";
      END IF;
    END$$;
  `);
}
