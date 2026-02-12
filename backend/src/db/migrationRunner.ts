/**
 * Migration Runner
 * Tracks and executes database migrations with versioning
 */

import { pool } from './connection.js';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Migration {
  version: string;
  name: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

export interface MigrationRecord {
  version: string;
  name: string;
  executed_at: Date;
}

/**
 * Initialize the migrations tracking table
 */
export async function initMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      version VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);

  // Create index for faster lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_migrations_executed_at 
    ON migrations(executed_at DESC);
  `);
}

/**
 * Get all executed migrations
 */
export async function getExecutedMigrations(): Promise<MigrationRecord[]> {
  const result = await pool.query(`
    SELECT version, name, executed_at 
    FROM migrations 
    ORDER BY version ASC
  `);
  return result.rows;
}

/**
 * Record a migration as executed
 */
export async function recordMigration(version: string, name: string): Promise<void> {
  await pool.query(
    `INSERT INTO migrations (version, name) VALUES ($1, $2)`,
    [version, name]
  );
}

/**
 * Remove a migration record (for rollback)
 */
export async function removeMigrationRecord(version: string): Promise<void> {
  await pool.query(`DELETE FROM migrations WHERE version = $1`, [version]);
}

/**
 * Check if a migration has been executed
 */
export async function isMigrationExecuted(version: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM migrations WHERE version = $1`,
    [version]
  );
  return result.rows.length > 0;
}

/**
 * Get the latest migration version
 */
export async function getLatestMigrationVersion(): Promise<string | null> {
  const result = await pool.query(`
    SELECT version 
    FROM migrations 
    ORDER BY version DESC 
    LIMIT 1
  `);
  return result.rows[0]?.version || null;
}

/**
 * Load all migration files from the migrations directory
 */
export async function loadMigrations(): Promise<Migration[]> {
  const migrationsDir = join(__dirname, 'migrations');
  
  let files: string[];
  try {
    files = await readdir(migrationsDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Migrations directory doesn't exist yet
      console.warn('⚠️  Migrations directory not found. Creating it...');
      return [];
    }
    throw error;
  }
  
  // Filter and sort migration files (format: 0001_description.ts)
  const migrationFiles = files
    .filter(file => file.endsWith('.ts') && /^\d{4}_/.test(file))
    .sort();

  const migrations: Migration[] = [];

  for (const file of migrationFiles) {
    try {
      // Use relative import path (works with tsx/TypeScript)
      const filePath = `./migrations/${file}`;
      const migration = await import(filePath);
      
      // Extract version from filename (e.g., "0001_initial_schema.ts" -> "0001")
      const version = file.match(/^(\d{4})_/)?.[1];
      if (!version) {
        throw new Error(`Invalid migration filename format: ${file}`);
      }

      if (!migration.up || typeof migration.up !== 'function') {
        throw new Error(`Migration ${file} must export an 'up' function`);
      }

      migrations.push({
        version,
        name: file.replace(/^\d{4}_/, '').replace(/\.ts$/, ''),
        up: migration.up,
        down: migration.down,
      });
    } catch (error: any) {
      console.error(`Error loading migration ${file}:`, error.message);
      throw error;
    }
  }

  return migrations;
}

/**
 * Run pending migrations
 */
export async function runMigrations(targetVersion?: string): Promise<void> {
  await initMigrationsTable();

  const migrations = await loadMigrations();
  const executed = await getExecutedMigrations();
  const executedVersions = new Set(executed.map(m => m.version));

  // Filter to pending migrations
  const pendingMigrations = migrations.filter(m => !executedVersions.has(m.version));

  if (pendingMigrations.length === 0) {
    console.log('✅ No pending migrations');
    return;
  }

  // If target version specified, only run up to that version
  let migrationsToRun = pendingMigrations;
  if (targetVersion) {
    migrationsToRun = pendingMigrations.filter(m => m.version <= targetVersion);
    if (migrationsToRun.length === 0) {
      console.log(`✅ No migrations to run up to version ${targetVersion}`);
      return;
    }
  }

  console.log(`📦 Running ${migrationsToRun.length} migration(s)...\n`);

  for (const migration of migrationsToRun) {
    try {
      console.log(`  [${migration.version}] ${migration.name}...`);
      await pool.query('BEGIN');
      
      try {
        await migration.up();
        await recordMigration(migration.version, migration.name);
        await pool.query('COMMIT');
        console.log(`  ✅ Migration ${migration.version} completed\n`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      console.error(`  ❌ Migration ${migration.version} failed:`, error.message);
      throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${error.message}`);
    }
  }

  console.log('✅ All migrations completed successfully');
}

/**
 * Rollback the last migration
 */
export async function rollbackLastMigration(): Promise<void> {
  await initMigrationsTable();

  const migrations = await loadMigrations();
  const executed = await getExecutedMigrations();

  if (executed.length === 0) {
    console.log('✅ No migrations to rollback');
    return;
  }

  // Get the last executed migration
  const lastExecuted = executed[executed.length - 1];
  const migration = migrations.find(m => m.version === lastExecuted.version);

  if (!migration) {
    throw new Error(`Migration file for version ${lastExecuted.version} not found`);
  }

  if (!migration.down) {
    throw new Error(`Migration ${lastExecuted.version} does not have a rollback function`);
  }

  try {
    console.log(`🔄 Rolling back migration ${lastExecuted.version} (${lastExecuted.name})...`);
    await pool.query('BEGIN');
    
    try {
      await migration.down();
      await removeMigrationRecord(lastExecuted.version);
      await pool.query('COMMIT');
      console.log(`✅ Rollback completed\n`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error(`❌ Rollback failed:`, error.message);
    throw error;
  }
}

/**
 * Show migration status
 */
export async function showMigrationStatus(): Promise<void> {
  await initMigrationsTable();

  const migrations = await loadMigrations();
  const executed = await getExecutedMigrations();
  const executedVersions = new Set(executed.map(m => m.version));

  console.log('\n📊 Migration Status\n');
  console.log('Version | Name                    | Status    | Executed At');
  console.log('--------|-------------------------|-----------|-------------------');

  for (const migration of migrations) {
    const isExecuted = executedVersions.has(migration.version);
    const record = executed.find(m => m.version === migration.version);
    const status = isExecuted ? '✅ Applied' : '⏳ Pending';
    const executedAt = record?.executed_at 
      ? new Date(record.executed_at).toISOString().split('T')[0]
      : '-';

    console.log(
      `${migration.version.padEnd(7)} | ${migration.name.padEnd(23)} | ${status.padEnd(9)} | ${executedAt}`
    );
  }

  const pendingCount = migrations.filter(m => !executedVersions.has(m.version)).length;
  console.log(`\nTotal: ${migrations.length} migrations, ${executed.length} applied, ${pendingCount} pending\n`);
}
