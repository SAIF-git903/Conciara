/**
 * Migration 0001: Initial Schema
 * Creates core tables: dialog_trees, dialog_nodes, customer_types, websites
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Enable pgvector extension (optional - will continue if not available)
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('    ✅ pgvector extension enabled');
  } catch (vectorError: any) {
    console.warn('    ⚠️  pgvector extension not available. Vector embeddings will be disabled.');
    console.warn('       To enable: Install pgvector for PostgreSQL 15');
  }

  // Check if vector extension is available
  const vectorCheck = await pool.query(`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
  `);
  const hasVector = vectorCheck.rows[0]?.has_vector || false;

  // Create customer_types table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_types (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create websites table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS websites (
      id SERIAL PRIMARY KEY,
      customer_type_id INT REFERENCES customer_types(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(customer_type_id, name)
    );
  `);

  // Add domain column if it doesn't exist
  await pool.query(`
    ALTER TABLE websites 
    ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
  `);
  
  // Add domain index for fast lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain) WHERE domain IS NOT NULL;
  `);

  // Add is_active for enabling/disabling widget per domain
  await pool.query(`
    ALTER TABLE websites ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  `);

  // Create dialog_trees table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dialog_trees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Create dialog_nodes table
  const vectorType = hasVector ? 'VECTOR(1536)' : 'TEXT';
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dialog_nodes (
      id SERIAL PRIMARY KEY,
      tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
      parent_id INT REFERENCES dialog_nodes(id) ON DELETE CASCADE,
      user_input TEXT,
      bot_response TEXT,
      vector_embedding ${vectorType},
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_dialog_nodes_tree_id ON dialog_nodes(tree_id);
    CREATE INDEX IF NOT EXISTS idx_dialog_nodes_parent_id ON dialog_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_websites_customer_type_id ON websites(customer_type_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS dialog_nodes CASCADE;');
  await pool.query('DROP TABLE IF EXISTS dialog_trees CASCADE;');
  await pool.query('DROP TABLE IF EXISTS websites CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_types CASCADE;');
}
