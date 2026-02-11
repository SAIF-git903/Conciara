import pg from 'pg';
import dotenv from 'dotenv';
import { migrate } from './migrate.js';

dotenv.config();

const { Client } = pg;

function getDatabaseUrl(): string {
  // If DATABASE_URL is set, use it directly
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Otherwise, build from individual variables
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'dialog_trees';
  
  if (!user) {
    const systemUser = process.env.USER || 'saif';
    return `postgresql://${systemUser}@localhost:5432/${database}`;
  }
  
  // Construct connection string
  if (password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  } else {
    return `postgresql://${encodeURIComponent(user)}@${host}:${port}/${database}`;
  }
}

async function setupDatabase() {
  // Get database URL from env variables
  const dbUrl = getDatabaseUrl();
  
  // Parse the DATABASE_URL properly
  // Format: postgresql://[user[:password]@]host[:port][/database]
  // Use a simpler approach: replace the database name in the URL
  let adminUrl: string;
  
  // Check if URL has a database name and replace it with 'postgres'
  if (dbUrl.includes('/') && dbUrl.split('/').length > 3) {
    // Has database name - replace it with 'postgres'
    const parts = dbUrl.split('/');
    parts[parts.length - 1] = 'postgres';
    adminUrl = parts.join('/');
  } else {
    // No database name - append '/postgres'
    adminUrl = dbUrl.endsWith('/') ? `${dbUrl}postgres` : `${dbUrl}/postgres`;
  }
  
  // Extract username for logging
  const userMatch = adminUrl.match(/postgresql:\/\/([^:@]+)/);
  const username = userMatch ? userMatch[1] : 'postgres';
  console.log(`🔌 Connecting as user: ${username}`);
  
  // Use connection string directly - pg library handles password encoding properly
  const adminClient = new Client({ connectionString: adminUrl });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Extract database name from original DATABASE_URL
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
      console.error('   - On Windows: Check Services or run: pg_ctl start');
      console.error('   - On macOS: brew services start postgresql@15');
      console.error('   - On Linux: sudo systemctl start postgresql');
    } else if (error.code === '28P01' || error.message?.includes('password')) {
      console.error('\n💡 Authentication failed. Check your DATABASE_URL in .env file');
      console.error('   Format: postgresql://username:password@localhost:5432/database');
      console.error('   If no password, use: postgresql://username@localhost:5432/database');
      console.error(`   Current DATABASE_URL: ${process.env.DATABASE_URL ? '***set***' : 'not set'}`);
    } else {
      console.error('\n💡 Common issues:');
      console.error('   1. PostgreSQL is not running');
      console.error('   2. DATABASE_URL format is incorrect');
      console.error('   3. Username/password is wrong');
      console.error('   4. Database user does not have permission to create databases');
    }
    process.exit(1);
  }
}

setupDatabase();

