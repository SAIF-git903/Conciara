import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  WARNING: DATABASE_URL not set. Database operations will fail.');
  console.warn('   Please set DATABASE_URL in your .env file');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  console.error('   Make sure PostgreSQL is running and DATABASE_URL is correct');
  // Don't exit in development to allow the server to keep running
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

