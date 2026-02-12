# Database Migrations

This directory contains versioned database migrations for ConversaTree.

## Migration File Format

Migration files follow the naming pattern: `XXXX_description.ts`

- `XXXX` - 4-digit sequential version number (e.g., 0001, 0002, 0003)
- `description` - Short description of what the migration does (e.g., `initial_schema`, `add_user_memory`)

Example: `0001_initial_schema.ts`

## Migration Structure

Each migration file must export two functions:

```typescript
export async function up(): Promise<void> {
  // Code to apply the migration
}

export async function down(): Promise<void> {
  // Code to rollback the migration (optional but recommended)
}
```

## Running Migrations

### Run all pending migrations
```bash
npm run migrate
```

### Check migration status
```bash
npm run migrate:status
```

### Rollback last migration
```bash
npm run migrate:rollback
```

## Creating New Migrations

1. Create a new file in this directory following the naming pattern
2. Use the next sequential version number
3. Export `up()` and optionally `down()` functions
4. Test the migration locally before committing

Example:
```typescript
// 0008_add_new_feature.ts
import { pool } from '../connection.js';

export async function up(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS new_feature (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS new_feature CASCADE;');
}
```

## Migration Tracking

Migrations are tracked in the `migrations` table:
- `version` - Migration version number
- `name` - Migration name (from filename)
- `executed_at` - Timestamp when migration was run

## Best Practices

1. **Always test migrations** on a development database first
2. **Write rollback functions** (`down()`) for all migrations
3. **Use transactions** - The migration runner wraps each migration in a transaction
4. **Keep migrations small** - One logical change per migration
5. **Never modify existing migrations** - Create a new migration instead
6. **Use IF NOT EXISTS** for idempotent migrations when possible

## Legacy Database Support

If you're upgrading from the old migration system, the new system will:
1. Detect existing tables
2. Initialize the migrations tracking table
3. Mark all existing migrations as executed
4. Only run new migrations going forward
