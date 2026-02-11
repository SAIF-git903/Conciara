/**
 * User Service
 * Handles user CRUD operations and authentication-related user queries
 */

import { pool } from '../db/connection.js';
import { hashPassword } from './authService.js';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'viewer';
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'viewer';
  isActive?: boolean;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  const role = input.role || 'manager';

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, passwordHash, input.fullName || null, role]
  );

  return mapRowToUser(result.rows[0]);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const result = await pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * Get all users (with pagination)
 */
export async function getAllUsers(
  limit: number = 50,
  offset: number = 0
): Promise<User[]> {
  const result = await pool.query(
    `SELECT * FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows.map(mapRowToUser);
}

/**
 * Update user
 */
export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }

  if (input.password !== undefined) {
    const passwordHash = await hashPassword(input.password);
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(passwordHash);
  }

  if (input.fullName !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(input.fullName || null);
  }

  if (input.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }

  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }

  if (updates.length === 0) {
    // No updates, just return the user
    const user = await getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE users
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return mapRowToUser(result.rows[0]);
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(id: number): Promise<void> {
  await pool.query(
    `UPDATE users SET last_login = NOW() WHERE id = $1`,
    [id]
  );
}

/**
 * Delete user
 */
export async function deleteUser(id: number): Promise<void> {
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
}

/**
 * Assign a user to a website (domain)
 */
export async function assignUserToWebsite(
  userId: number,
  websiteId: number,
  role?: 'admin' | 'manager' | 'viewer'
): Promise<void> {
  const userRole = role || 'manager';
  
  await pool.query(
    `INSERT INTO user_tenants (user_id, website_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, website_id) 
     DO UPDATE SET role = EXCLUDED.role`,
    [userId, websiteId, userRole]
  );
}

/**
 * Remove user assignment from a website
 */
export async function removeUserFromWebsite(userId: number, websiteId: number): Promise<void> {
  await pool.query(
    `DELETE FROM user_tenants WHERE user_id = $1 AND website_id = $2`,
    [userId, websiteId]
  );
}

/**
 * Get all websites assigned to a user
 */
export async function getUserWebsites(userId: number): Promise<Array<{
  websiteId: number;
  websiteName: string;
  domain: string;
  role: string;
}>> {
  const result = await pool.query(
    `SELECT 
      ut.website_id as website_id,
      w.name as website_name,
      w.domain,
      ut.role
     FROM user_tenants ut
     JOIN websites w ON ut.website_id = w.id
     WHERE ut.user_id = $1
     ORDER BY w.name`,
    [userId]
  );

  return result.rows.map(row => ({
    websiteId: row.website_id,
    websiteName: row.website_name,
    domain: row.domain,
    role: row.role,
  }));
}

/**
 * Get all website IDs assigned to a user
 */
export async function getUserWebsiteIds(userId: number): Promise<number[]> {
  const result = await pool.query(
    `SELECT website_id FROM user_tenants WHERE user_id = $1`,
    [userId]
  );

  return result.rows.map(row => row.website_id);
}

/**
 * Check if user has access to a website
 */
export async function userHasWebsiteAccess(userId: number, websiteId: number): Promise<boolean> {
  // Admins have access to all websites
  const user = await getUserById(userId);
  if (user && user.role === 'admin') {
    return true;
  }

  // Check if user is assigned to this website
  const result = await pool.query(
    `SELECT 1 FROM user_tenants WHERE user_id = $1 AND website_id = $2`,
    [userId, websiteId]
  );

  return result.rows.length > 0;
}

/**
 * Map database row to User object
 */
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    isActive: row.is_active,
    lastLogin: row.last_login ? new Date(row.last_login) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
