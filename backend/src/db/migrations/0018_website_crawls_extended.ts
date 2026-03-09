/**
 * Migration 0018: extend website_crawls with pages_crawled and JSON columns
 * for crawled pages list, products, support links, nav links.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    ALTER TABLE website_crawls
      ADD COLUMN IF NOT EXISTS pages_crawled INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS crawled_pages JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS products JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS support_links JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS nav_links JSONB NOT NULL DEFAULT '[]';
  `);
}

export async function down(): Promise<void> {
  await pool.query(`
    ALTER TABLE website_crawls
      DROP COLUMN IF EXISTS pages_crawled,
      DROP COLUMN IF EXISTS crawled_pages,
      DROP COLUMN IF EXISTS products,
      DROP COLUMN IF EXISTS support_links,
      DROP COLUMN IF EXISTS nav_links;
  `);
}