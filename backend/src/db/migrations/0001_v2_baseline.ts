/**
 * Migration 0001: v2 baseline
 * Creates pgvector (optional), users, api_keys, user_sessions.
 * Required for v2 (workspaces/agents depend on users).
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
  } catch {
    // pgvector optional
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'viewer', 'owner', 'member')),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      key_hash VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      session_token VARCHAR(255) NOT NULL UNIQUE,
      refresh_token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
  await pool.query('DROP TABLE IF EXISTS api_keys CASCADE;');
  await pool.query('DROP TABLE IF EXISTS users CASCADE;');
}
