/**
 * Idempotent script to add website_crawls extended columns if missing.
 * Run with: npx tsx src/db/ensureCrawlColumns.ts
 * Use the same .env (and DATABASE_URL) as your running app.
 */

import { pool } from './connection.js';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE website_crawls
        ADD COLUMN IF NOT EXISTS pages_crawled INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS crawled_pages JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS products JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS support_links JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS nav_links JSONB NOT NULL DEFAULT '[]';
    `);
    console.log('✅ website_crawls columns ensured.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
