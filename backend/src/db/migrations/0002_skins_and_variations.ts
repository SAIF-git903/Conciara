/**
 * Migration 0002: Skins and A/B Variations
 * Creates skins and ab_variations tables, links dialog_trees to variations
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Create skins table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skins (
      id SERIAL PRIMARY KEY,
      website_id INT REFERENCES websites(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      theme_config JSONB,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(website_id, name)
    );
  `);
  
  // Add is_active column if it doesn't exist (for existing databases)
  await pool.query(`
    ALTER TABLE skins 
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
  `);
  
  // Create index for active skin lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_skins_website_active 
    ON skins(website_id, is_active) 
    WHERE is_active = true;
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

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_skins_website_id ON skins(website_id);
    CREATE INDEX IF NOT EXISTS idx_ab_variations_skin_id ON ab_variations(skin_id);
    CREATE INDEX IF NOT EXISTS idx_dialog_trees_ab_variation_id ON dialog_trees(ab_variation_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('ALTER TABLE dialog_trees DROP COLUMN IF EXISTS ab_variation_id;');
  await pool.query('DROP TABLE IF EXISTS ab_variations CASCADE;');
  await pool.query('DROP TABLE IF EXISTS skins CASCADE;');
}
