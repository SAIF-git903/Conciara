/**
 * Migration 0004: User Memory System
 * Creates user_profiles and user_memory tables, adds user_id to conversation_sessions
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Check if vector extension is available
  const vectorCheck = await pool.query(`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
  `);
  const hasVector = vectorCheck.rows[0]?.has_vector || false;

  // Create user_profiles table for storing user information
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create user_memory table for storing user context/knowledge with vector embeddings
  const userMemoryVectorType = hasVector ? 'VECTOR(1536)' : 'TEXT';
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_memory (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      memory_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      vector_embedding ${userMemoryVectorType},
      relevance_score FLOAT DEFAULT 1.0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT memory_type_check CHECK (memory_type IN ('profile', 'preference', 'constraint', 'conversation', 'fact', 'knowledge'))
    );
  `);

  // Add user_id to conversation_sessions
  await pool.query(`
    ALTER TABLE conversation_sessions 
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_memory_type ON user_memory(memory_type);
    CREATE INDEX IF NOT EXISTS idx_user_memory_user_type ON user_memory(user_id, memory_type);
    CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('ALTER TABLE conversation_sessions DROP COLUMN IF EXISTS user_id;');
  await pool.query('DROP TABLE IF EXISTS user_memory CASCADE;');
  await pool.query('DROP TABLE IF EXISTS user_profiles CASCADE;');
}
