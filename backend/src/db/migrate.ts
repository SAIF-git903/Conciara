/**
 * Migration Entry Point
 * Uses the new versioned migration system
 */

import { 
  runMigrations, 
  showMigrationStatus, 
  rollbackLastMigration, 
  initMigrationsTable 
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
    
    // Check if any of our tables exist
    const tablesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('dialog_trees', 'users', 'websites')
      );
    `);
    
    return tablesCheck.rows[0].exists;
  } catch (error) {
    return false;
  }
}

/**
 * Mark all existing migrations as executed (for legacy databases)
 */
async function markExistingMigrationsAsExecuted(): Promise<void> {
  const migrations = [
    '0001', '0002', '0003', '0004', '0005', '0006', '0007'
  ];
  
  for (const version of migrations) {
    // Check if corresponding tables exist
    const shouldMark = await shouldMarkMigration(version);
    if (shouldMark) {
      await pool.query(
        `INSERT INTO migrations (version, name) 
         VALUES ($1, $2) 
         ON CONFLICT (version) DO NOTHING`,
        [version, `legacy_migration_${version}`]
      );
      console.log(`   ✅ Marked migration ${version} as executed`);
    }
  }
}

/**
 * Check if a migration should be marked as executed based on table existence
 */
async function shouldMarkMigration(version: string): Promise<boolean> {
  const tableChecks: Record<string, string[]> = {
    '0001': ['dialog_trees', 'dialog_nodes', 'customer_types', 'websites'],
    '0002': ['skins', 'ab_variations'],
    '0003': ['preprompts', 'conversation_sessions', 'conversation_history'],
    '0004': ['user_profiles', 'user_memory'],
    '0005': ['traces', 'trace_events', 'conversation_trees'],
    '0006': ['node_media', 'products'],
    '0007': ['users', 'api_keys', 'user_sessions', 'user_tenants'],
  };
  
  const tables = tableChecks[version] || [];
  if (tables.length === 0) return false;
  
  // Check if at least one table from this migration exists
  const placeholders = tables.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${placeholders})
    );
  `, tables);
  
  return result.rows[0].exists;
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

