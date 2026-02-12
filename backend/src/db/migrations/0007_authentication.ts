/**
 * Migration 0007: Authentication System
 * Creates users, api_keys, user_sessions, and user_tenants tables
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Create users table for authentication
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(50) NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'viewer')),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create api_keys table for programmatic access
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

  // Create user_sessions table for refresh tokens (optional)
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

  // Create user_tenants table for multi-tenant access control
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_tenants (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      customer_type_id INT REFERENCES customer_types(id) ON DELETE CASCADE,
      website_id INT REFERENCES websites(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'viewer')),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, website_id)
    );
  `);

  // Create indexes for authentication tables
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_tenants_website_id ON user_tenants(website_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS user_tenants CASCADE;');
  await pool.query('DROP TABLE IF EXISTS user_sessions CASCADE;');
  await pool.query('DROP TABLE IF EXISTS api_keys CASCADE;');
  await pool.query('DROP TABLE IF EXISTS users CASCADE;');
}
