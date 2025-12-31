import pg from 'pg';
import dotenv from 'dotenv';
import { migrate } from './migrate.js';

dotenv.config();

const { Client } = pg;

async function setupDatabase() {
  // Get the current system user (Homebrew PostgreSQL uses this as default)
  const systemUser = process.env.USER || 'saif';
  
  // Parse DATABASE_URL or construct default
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    dbUrl = `postgresql://${systemUser}@localhost:5432/dialog_trees`;
    console.log(`ℹ️  DATABASE_URL not set, using default: ${dbUrl}`);
  }
  
  // Extract username from DATABASE_URL, default to system user
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+)(?::([^@]+))?@/);
  let username = systemUser;
  let password = '';
  
  if (urlMatch) {
    username = urlMatch[1];
    if (urlMatch[2]) {
      password = `:${urlMatch[2]}`;
    }
  }
  
  // Connect to 'postgres' database to create our database
  const adminUrl = `postgresql://${username}${password}@localhost:5432/postgres`;
  
  console.log(`🔌 Connecting as user: ${username}`);
  
  const adminClient = new Client({
    connectionString: adminUrl,
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Extract database name from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dialog_trees';
    const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'dialog_trees';

    console.log(`📦 Creating database '${dbName}' if it doesn't exist...`);
    
    // Check if database exists
    const dbCheck = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      // Create database
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`ℹ️  Database '${dbName}' already exists`);
    }

    await adminClient.end();

    // Now connect to the new database and run migrations
    console.log(`🔧 Running migrations on '${dbName}'...`);
    await migrate();
    
    // Check if vector extension is enabled (after migration)
    const { pool } = await import('./connection.js');
    let hasVector = false;
    try {
      const vectorCheck = await pool.query(`
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as has_vector;
      `);
      hasVector = vectorCheck.rows[0]?.has_vector || false;
    } catch (e) {
      // Ignore errors
    }
    
    console.log('\n🎉 Database setup complete!');
    console.log('✅ All tables created successfully');
    if (hasVector) {
      console.log('✅ pgvector extension enabled');
    } else {
      console.log('⚠️  pgvector extension not available (vector embeddings disabled)');
    }
    console.log('\n📝 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Your app will now use PostgreSQL instead of mock mode');
    console.log('   3. All data will persist in the database');
    
  } catch (error: any) {
    console.error('❌ Error setting up database:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   - On macOS: brew services start postgresql@15');
      console.error('   - Or check your PostgreSQL installation');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check your DATABASE_URL in .env file');
      console.error('   Current format: postgresql://username:password@localhost:5432/database');
    }
    process.exit(1);
  }
}

setupDatabase();

