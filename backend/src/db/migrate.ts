import { pool } from './connection.js';

export async function migrate() {
  try {
    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');

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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dialog_nodes (
        id SERIAL PRIMARY KEY,
        tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
        parent_id INT REFERENCES dialog_nodes(id) ON DELETE CASCADE,
        user_input TEXT,
        bot_response TEXT,
        vector_embedding VECTOR(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create preprompts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS preprompts (
        id SERIAL PRIMARY KEY,
        tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dialog_nodes_tree_id ON dialog_nodes(tree_id);
      CREATE INDEX IF NOT EXISTS idx_dialog_nodes_parent_id ON dialog_nodes(parent_id);
      CREATE INDEX IF NOT EXISTS idx_preprompts_tree_id ON preprompts(tree_id);
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}


