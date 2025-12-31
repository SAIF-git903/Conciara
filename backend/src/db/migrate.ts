import { pool } from './connection.js';

export async function migrate() {
  try {
    // Enable pgvector extension (optional - will continue if not available)
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension enabled');
    } catch (vectorError: any) {
      console.warn('⚠️  pgvector extension not available. Vector embeddings will be disabled.');
      console.warn('   To enable: Install pgvector for PostgreSQL 15');
      console.warn('   Error:', vectorError.message);
    }

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

    // Check if vector extension is available
    const vectorCheck = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
    `);
    const hasVector = vectorCheck.rows[0]?.has_vector || false;
    
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

    // Create skins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS skins (
        id SERIAL PRIMARY KEY,
        website_id INT REFERENCES websites(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        theme_config JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(website_id, name)
      );
    `);

    // Create ab_variations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ab_variations (
        id SERIAL PRIMARY KEY,
        skin_id INT REFERENCES skins(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        variation_config JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(skin_id, name)
      );
    `);

    // Update dialog_trees to link to ab_variation
    await pool.query(`
      ALTER TABLE dialog_trees 
      ADD COLUMN IF NOT EXISTS ab_variation_id INT REFERENCES ab_variations(id) ON DELETE CASCADE;
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

    // Create conversation_sessions table for tracking chat sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
        current_node_id INT REFERENCES dialog_nodes(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create conversation_history table for logging conversations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_history (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        tree_id INT REFERENCES dialog_trees(id) ON DELETE CASCADE,
        node_id INT REFERENCES dialog_nodes(id) ON DELETE SET NULL,
        user_message TEXT,
        bot_response TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_dialog_nodes_tree_id ON dialog_nodes(tree_id);
      CREATE INDEX IF NOT EXISTS idx_dialog_nodes_parent_id ON dialog_nodes(parent_id);
      CREATE INDEX IF NOT EXISTS idx_preprompts_tree_id ON preprompts(tree_id);
      CREATE INDEX IF NOT EXISTS idx_websites_customer_type_id ON websites(customer_type_id);
      CREATE INDEX IF NOT EXISTS idx_skins_website_id ON skins(website_id);
      CREATE INDEX IF NOT EXISTS idx_ab_variations_skin_id ON ab_variations(skin_id);
      CREATE INDEX IF NOT EXISTS idx_dialog_trees_ab_variation_id ON dialog_trees(ab_variation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_sessions_tree_id ON conversation_sessions(tree_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_history_tree_id ON conversation_history(tree_id);
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('migrate.ts')) {
  migrate()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

