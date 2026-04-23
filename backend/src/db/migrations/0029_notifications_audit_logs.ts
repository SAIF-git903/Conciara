/**
 * Migration 0029: in-app notifications, notification preferences, and audit logs.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user_created
      ON notifications (workspace_id, user_id, created_at DESC);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_workspace_user_read
      ON notifications (workspace_id, user_id, is_read);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_notification_preferences_workspace_user_event
        UNIQUE (workspace_id, user_id, event_type)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_preferences_workspace_user
      ON notification_preferences (workspace_id, user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      metadata JSONB,
      outcome TEXT NOT NULL DEFAULT 'success',
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created
      ON audit_logs (workspace_id, created_at DESC);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
      ON audit_logs (actor_user_id, created_at DESC);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs (action);
  `);
}

export async function down(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS audit_logs;`);
  await pool.query(`DROP TABLE IF EXISTS notification_preferences;`);
  await pool.query(`DROP TABLE IF EXISTS notifications;`);
}

