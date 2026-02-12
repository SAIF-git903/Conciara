/**
 * Migration 0006: Media and Products
 * Creates node_media and products tables
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Create node_media table for storing media files (images/videos) associated with dialog nodes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS node_media (
      id SERIAL PRIMARY KEY,
      node_id INT REFERENCES dialog_nodes(id) ON DELETE CASCADE,
      media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
      s3_key VARCHAR(500) NOT NULL,
      s3_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      file_size BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create products table (e.g. for Coke / beverage catalog per website)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      website_id INT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      unit VARCHAR(50),
      is_available BOOLEAN DEFAULT true,
      attributes JSONB DEFAULT '{}'::jsonb,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_node_media_node_id ON node_media(node_id);
    CREATE INDEX IF NOT EXISTS idx_node_media_type ON node_media(media_type);
    CREATE INDEX IF NOT EXISTS idx_products_website_id ON products(website_id);
    CREATE INDEX IF NOT EXISTS idx_products_website_available ON products(website_id, is_available) WHERE is_available = true;
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(website_id, category);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS products CASCADE;');
  await pool.query('DROP TABLE IF EXISTS node_media CASCADE;');
}
