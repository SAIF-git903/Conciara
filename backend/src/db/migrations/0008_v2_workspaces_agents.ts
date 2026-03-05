/**
 * Migration 0008: v2 Workspaces and Agents
 * Owner/member model: workspaces, workspace_members, agents, agent_members.
 * Extends users.role to allow 'owner' and 'member'.
 */

import { pool } from '../connection.js';

export async function up(): Promise<void> {
  // Extend users.role to allow 'owner' and 'member' (keep admin/manager/viewer for v1)
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
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'manager', 'viewer', 'owner', 'member'))
  `);

  // Workspaces: each has one owner (the user who signed up / created it)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      plan VARCHAR(50) NOT NULL DEFAULT 'free',
      owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Workspace members: owner (creator) or invited member
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      id SERIAL PRIMARY KEY,
      workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(workspace_id, user_id)
    );
  `);

  // Agents: belong to a workspace
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Agent-level members: when member is invited to a single agent only
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_members (
      id SERIAL PRIMARY KEY,
      agent_id INT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(agent_id, user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_agent_members_agent_id ON agent_members(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_members_user_id ON agent_members(user_id);
  `);
}

export async function down(): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS agent_members CASCADE;');
  await pool.query('DROP TABLE IF EXISTS agents CASCADE;');
  await pool.query('DROP TABLE IF EXISTS workspace_members CASCADE;');
  await pool.query('DROP TABLE IF EXISTS workspaces CASCADE;');
  const constraintResult = await pool.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND conname = 'users_role_check'
    LIMIT 1
  `);
  if (constraintResult.rows[0]) {
    await pool.query(`ALTER TABLE users DROP CONSTRAINT users_role_check`);
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'manager', 'viewer'))
    `);
  }
}
