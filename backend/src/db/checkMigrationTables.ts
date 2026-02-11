/**
 * Check Migration Tables
 * Utility to inspect and clean up migration tracking tables
 */

import { pool } from './connection.js';

async function checkMigrationTables() {
  try {
    console.log('🔍 Checking migration tables...\n');

    // Check for migrations table (new system)
    const migrationsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    // Check for _migration table (old system?)
    const underscoreMigrationCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_migration'
      );
    `);

    console.log('Migration Tables Status:');
    console.log('─────────────────────────');
    console.log(`migrations (new system): ${migrationsCheck.rows[0].exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`_migration (old system?): ${underscoreMigrationCheck.rows[0].exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log('');

    if (migrationsCheck.rows[0].exists) {
      const migrationsData = await pool.query(`
        SELECT version, name, executed_at 
        FROM migrations 
        ORDER BY version ASC
      `);
      console.log(`📊 migrations table has ${migrationsData.rows.length} records:`);
      if (migrationsData.rows.length > 0) {
        migrationsData.rows.forEach((row: any) => {
          console.log(`   ${row.version} - ${row.name} (${new Date(row.executed_at).toISOString().split('T')[0]})`);
        });
      }
      console.log('');
    }

    if (underscoreMigrationCheck.rows[0].exists) {
      // Check structure of _migration table
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '_migration'
        ORDER BY ordinal_position;
      `);
      
      console.log(`📊 _migration table structure:`);
      structure.rows.forEach((row: any) => {
        console.log(`   ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
      console.log('');

      // Try to get data (might fail if structure is different)
      try {
        const underscoreData = await pool.query(`
          SELECT * FROM _migration LIMIT 10
        `);
        console.log(`📊 _migration table has ${underscoreData.rows.length} records (showing first 10):`);
        if (underscoreData.rows.length > 0) {
          console.log(JSON.stringify(underscoreData.rows, null, 2));
        }
        console.log('');
      } catch (error: any) {
        console.log(`⚠️  Could not read _migration table data: ${error.message}\n`);
      }
    }

    // Recommendations
    console.log('💡 Recommendations:');
    console.log('───────────────────');
    
    if (migrationsCheck.rows[0].exists && underscoreMigrationCheck.rows[0].exists) {
      console.log('⚠️  Both tables exist!');
      console.log('');
      console.log('The new migration system uses the "migrations" table.');
      console.log('The "_migration" table appears to be from an old system.');
      console.log('');
      console.log('✅ RECOMMENDATION: Keep "migrations" table, drop "_migration" table');
      console.log('');
      console.log('To clean up, run:');
      console.log('  DROP TABLE IF EXISTS _migration CASCADE;');
      console.log('');
      console.log('Or use the cleanup script: npm run migrate:cleanup');
    } else if (migrationsCheck.rows[0].exists) {
      console.log('✅ Only "migrations" table exists - this is correct!');
    } else if (underscoreMigrationCheck.rows[0].exists) {
      console.log('⚠️  Only "_migration" table exists');
      console.log('   This appears to be from an old migration system.');
      console.log('   The new system will create "migrations" table when you run migrations.');
      console.log('   You can safely drop "_migration" after verifying it\'s not needed.');
    } else {
      console.log('ℹ️  No migration tracking tables found.');
      console.log('   The system will create "migrations" table on first migration run.');
    }

  } catch (error: any) {
    console.error('❌ Error checking migration tables:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('checkMigrationTables.ts')) {
  checkMigrationTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkMigrationTables };
