import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Build connection string from DATABASE_URL or individual DB_* variables
function getConnectionString(): string {
  // If DATABASE_URL is set, use it directly
  console.log('DATABASE_URL is set', process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Otherwise, build from individual variables
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME;
  
  if (!user || !database) {
    console.error('❌ ERROR: Database configuration is missing.');
    console.error('');
    console.error('   Please set either:');
    console.error('   - DATABASE_URL=postgresql://user:password@host:port/database');
    console.error('   OR individual variables:');
    console.error('   - DB_USER=username');
    console.error('   - DB_PASSWORD=password');
    console.error('   - DB_HOST=localhost');
    console.error('   - DB_PORT=5432');
    console.error('   - DB_NAME=database_name');
    console.error('');
    console.error('   To set up the database, run:');
    console.error('   npm run setup-db');
    console.error('');
    process.exit(1);
  }
  
  // Construct connection string
  if (password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  } else {
    return `postgresql://${encodeURIComponent(user)}@${host}:${port}/${database}`;
  }
}

const connectionString = getConnectionString();

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Connected to PostgreSQL database');
  })
  .catch((err) => {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    console.error('');
    console.error('   Please ensure:');
    console.error('   1. PostgreSQL is running');
    console.error('   2. DATABASE_URL is correct in your .env file');
    console.error('   3. Database exists (run: npm run setup-db)');
    console.error('');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  console.error('   Make sure PostgreSQL is running and DATABASE_URL is correct');
  // Don't exit in development to allow the server to keep running
  if (process.env.NODE_ENV === 'production') {
    process.exit(-1);
  }
});

