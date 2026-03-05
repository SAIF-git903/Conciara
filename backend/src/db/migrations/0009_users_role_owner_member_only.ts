/**
 * Migration 0009: Restrict users.role to only 'owner' and 'member'.
 * Migrates existing admin/manager -> owner, viewer -> member.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  const constraintResult = await pool.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%'
    LIMIT 1
  `);
  const constraintName = constraintResult.rows[0]?.conname;
  if (constraintName) {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT "${constraintName}"`);
  }

  await pool.query(`
    UPDATE users SET role = 'owner' WHERE role IN ('admin', 'manager');
    UPDATE users SET role = 'member' WHERE role IN ('viewer');
  `);

  await pool.query(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('owner', 'member'));
  `);

  await pool.query(`
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member';
  `);

  // user_tenants.role: restrict to owner/member (if table exists)
  const tableCheck = await pool.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants' LIMIT 1
  `);
  if (tableCheck.rows.length > 0) {
    const utConstraint = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.user_tenants'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%' LIMIT 1
    `);
    if (utConstraint.rows[0]?.conname) {
      await pool.query(`ALTER TABLE user_tenants DROP CONSTRAINT "${utConstraint.rows[0].conname}"`);
    }
    await pool.query(`UPDATE user_tenants SET role = 'owner' WHERE role IN ('admin', 'manager')`);
    await pool.query(`UPDATE user_tenants SET role = 'member' WHERE role = 'viewer'`);
    await pool.query(`
      ALTER TABLE user_tenants ADD CONSTRAINT user_tenants_role_check CHECK (role IN ('owner', 'member'));
    `);
  }
}

export async function down(): Promise<void> {
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await pool.query(`
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'manager', 'viewer', 'owner', 'member'));
  `);
  await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'manager'`);
  const tableCheck = await pool.query(`
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tenants' LIMIT 1
  `);
  if (tableCheck.rows.length > 0) {
    await pool.query(`ALTER TABLE user_tenants DROP CONSTRAINT IF EXISTS user_tenants_role_check`);
    await pool.query(`
      ALTER TABLE user_tenants ADD CONSTRAINT user_tenants_role_check
        CHECK (role IN ('admin', 'manager', 'viewer'));
    `);
  }
}
