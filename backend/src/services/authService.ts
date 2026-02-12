/**
 * Authentication Service
 * Handles password hashing, JWT generation/verification, and API key management
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/connection.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const JWT_SECRET: string = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'ct_';
const API_KEY_LENGTH = parseInt(process.env.API_KEY_LENGTH || '32');

export interface UserPayload {
  id: number;
  email: string;
  role: string;
  fullName?: string;
}

export interface APIKeyInfo {
  id: number;
  userId: number;
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateJWT(user: UserPayload): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(user: UserPayload): string {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string): UserPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Ensure it's not a refresh token
    if (decoded.type === 'refresh') {
      throw new Error('Invalid token type');
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verify a refresh token (checks JWT signature and revocation status)
 */
export async function verifyRefreshToken(token: string): Promise<{ id: number; email: string }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if token is revoked (exists in database)
    const sessionResult = await pool.query(
      `SELECT id FROM user_sessions WHERE refresh_token = $1`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Refresh token revoked or invalid');
    }

    // Check if session is expired
    const sessionCheck = await pool.query(
      `SELECT expires_at FROM user_sessions WHERE refresh_token = $1`,
      [token]
    );

    if (sessionCheck.rows.length > 0) {
      const expiresAt = new Date(sessionCheck.rows[0].expires_at);
      if (expiresAt < new Date()) {
        // Clean up expired session
        await pool.query(`DELETE FROM user_sessions WHERE refresh_token = $1`, [token]);
        throw new Error('Refresh token expired');
      }
    }

    return {
      id: decoded.id,
      email: decoded.email,
    };
  } catch (error: any) {
    if (error.message === 'Refresh token revoked or invalid' || 
        error.message === 'Refresh token expired') {
      throw error;
    }
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Check if a refresh token is revoked
 */
export async function isRefreshTokenRevoked(refreshToken: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM user_sessions WHERE refresh_token = $1`,
    [refreshToken]
  );
  return result.rows.length === 0;
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(refreshToken: string, userId?: number): Promise<void> {
  if (userId) {
    // Verify the token belongs to the user
    const result = await pool.query(
      `DELETE FROM user_sessions 
       WHERE refresh_token = $1 AND user_id = $2`,
      [refreshToken, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Refresh token not found or does not belong to user');
    }
  } else {
    // Admin can revoke any token
    await pool.query(
      `DELETE FROM user_sessions WHERE refresh_token = $1`,
      [refreshToken]
    );
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: number): Promise<number> {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE user_id = $1`,
    [userId]
  );
  return result.rowCount || 0;
}

/**
 * Revoke a specific session by session token
 */
export async function revokeSession(sessionToken: string, userId?: number): Promise<void> {
  if (userId) {
    const result = await pool.query(
      `DELETE FROM user_sessions 
       WHERE session_token = $1 AND user_id = $2`,
      [sessionToken, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Session not found or does not belong to user');
    }
  } else {
    await pool.query(
      `DELETE FROM user_sessions WHERE session_token = $1`,
      [sessionToken]
    );
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: number): Promise<Array<{
  id: number;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}>> {
  const result = await pool.query(
    `SELECT id, session_token, ip_address, user_agent, created_at, expires_at
     FROM user_sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    sessionToken: row.session_token,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Cleanup expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE expires_at < NOW()`
  );
  return result.rowCount || 0;
}

/**
 * Hash an API key (similar to password hashing)
 */
export async function hashAPIKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_ROUNDS);
}

/**
 * Generate a new API key
 */
export function generateAPIKey(): string {
  const randomPart = crypto.randomBytes(API_KEY_LENGTH).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Create an API key for a user
 */
export async function createAPIKey(
  userId: number,
  name: string,
  permissions: string[] = []
): Promise<{ key: string; apiKeyId: number }> {
  const key = generateAPIKey();
  const keyHash = await hashAPIKey(key);

  const result = await pool.query(
    `INSERT INTO api_keys (user_id, key_hash, name, permissions)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, keyHash, name, permissions]
  );

  return {
    key, // Return the plain key only once - it won't be stored
    apiKeyId: result.rows[0].id,
  };
}

/**
 * Verify an API key and return its information
 */
export async function verifyAPIKey(key: string): Promise<APIKeyInfo | null> {
  // Get all active API keys
  const result = await pool.query(
    `SELECT id, user_id, key_hash, name, permissions, expires_at
     FROM api_keys
     WHERE is_active = true`
  );

  // Check each key hash (we need to check all because we can't reverse the hash)
  for (const row of result.rows) {
    const isValid = await bcrypt.compare(key, row.key_hash);
    if (isValid) {
      // Check expiration
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        continue; // Expired
      }

      // Update last_used_at
      await pool.query(
        `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
        [row.id]
      );

      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        permissions: row.permissions || [],
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      };
    }
  }

  return null;
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(apiKeyId: number, userId?: number): Promise<void> {
  if (userId) {
    // User can only revoke their own keys (unless admin)
    await pool.query(
      `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`,
      [apiKeyId, userId]
    );
  } else {
    // Admin can revoke any key
    await pool.query(
      `UPDATE api_keys SET is_active = false WHERE id = $1`,
      [apiKeyId]
    );
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const roleHierarchy: Record<string, string[]> = {
    admin: ['*'], // Admin has all permissions
    manager: [
      'tree:read',
      'tree:write',
      'node:read',
      'node:write',
      'skin:read',
      'skin:write',
      'website:read',
      'website:write',
      'conversation:read',
      'trace:read',
    ],
    viewer: [
      'tree:read',
      'node:read',
      'skin:read',
      'website:read',
      'conversation:read',
      'trace:read',
    ],
  };

  const userPermissions = roleHierarchy[userRole] || [];
  
  // Admin has all permissions
  if (userPermissions.includes('*')) {
    return true;
  }

  return userPermissions.includes(requiredPermission);
}
