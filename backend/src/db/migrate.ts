/**
 * Migration Entry Point
 * Uses the new versioned migration system
 */

import {
  runMigrations,
  showMigrationStatus,
  rollbackLastMigration,
  initMigrationsTable,
  loadMigrations,
} from './migrationRunner.js';
import { pool } from './connection.js';

/**
 * Main migration function - runs all pending migrations
 */
export async function migrate() {
  try {
    // Check if this is an existing database (has tables but no migrations table)
    const hasTables = await checkExistingDatabase();
    
    if (hasTables) {
      console.log('⚠️  Detected existing database without migration tracking');
      console.log('   Initializing migration system...\n');
      
      // Initialize migrations table
      await initMigrationsTable();
      
      // Mark all migrations as executed (since tables already exist)
      await markExistingMigrationsAsExecuted();
      
      console.log('✅ Migration system initialized for existing database\n');
    }
    
    // Run pending migrations
    await runMigrations();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Check if database has existing tables (legacy database)
 */
async function checkExistingDatabase(): Promise<boolean> {
  try {
    // Check if migrations table exists
    const migrationsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (migrationsCheck.rows[0].exists) {
      return false; // Migration system already initialized
    }
    
    // Check if any v2 tables exist
    const tablesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'workspaces', 'agents')
      );
    `);

    return tablesCheck.rows[0].exists;
  } catch (error) {
    return false;
  }
}

/**
 * Mark all current v2 migrations as executed (for existing DBs that already have the schema).
 */
async function markExistingMigrationsAsExecuted(): Promise<void> {
  const migrations = await loadMigrations();
  for (const m of migrations) {
    await pool.query(
      `INSERT INTO migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
      [m.version, m.name]
    );
    console.log(`   ✅ Marked migration ${m.version} (${m.name}) as executed`);
  }
}

// CLI interface for migration commands
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('migrate.ts')) {
  const command = process.argv[2] || 'up';
  
  (async () => {
    try {
      switch (command) {
        case 'up':
        case 'migrate':
          await migrate();
          break;
          
        case 'status':
          await showMigrationStatus();
          break;
          
        case 'rollback':
          await rollbackLastMigration();
          break;
          
        case 'help':
          console.log('\n📦 Migration Commands:\n');
          console.log('  npm run migrate          Run pending migrations');
          console.log('  npm run migrate status   Show migration status');
          console.log('  npm run migrate rollback Rollback last migration');
          console.log('  npm run migrate help     Show this help\n');
          break;
          
        default:
          console.error(`Unknown command: ${command}`);
          console.log('Run "npm run migrate help" for available commands');
          process.exit(1);
      }
      
      process.exit(0);
    } catch (error: any) {
      console.error('Migration error:', error.message);
      process.exit(1);
    }
  })();
}

