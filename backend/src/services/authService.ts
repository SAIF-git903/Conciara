/**
 * Authentication Service
 * Handles password hashing, JWT generation/verification, and API key management
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const JWT_SECRET: string = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_EXPIRES_IN || '1h';
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
 * Generate a one-time JWT for password reset (short-lived, e.g. 1h).
 */
export function generatePasswordResetToken(userId: number, email: string): string {
  return jwt.sign(
    { type: 'password-reset', id: userId, email },
    JWT_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES_IN } as SignOptions
  );
}

/**
 * Verify password reset token and return userId and email.
 */
export function verifyPasswordResetToken(token: string): { userId: number; email: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { type?: string; id: number; email: string };
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    return { userId: decoded.id, email: decoded.email };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Reset link has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid or expired reset link');
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
    const session = await prisma.userSession.findFirst({
      where: { refreshToken: token },
      select: { id: true, expiresAt: true },
    });

    if (!session) {
      throw new Error('Refresh token revoked or invalid');
    }

    if (session.expiresAt < new Date()) {
      await prisma.userSession.deleteMany({ where: { refreshToken: token } });
      throw new Error('Refresh token expired');
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
  const session = await prisma.userSession.findFirst({
    where: { refreshToken },
    select: { id: true },
  });
  return !session;
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(refreshToken: string, userId?: number): Promise<void> {
  if (userId) {
    const result = await prisma.userSession.deleteMany({
      where: { refreshToken, userId },
    });
    if (result.count === 0) {
      throw new Error('Refresh token not found or does not belong to user');
    }
  } else {
    await prisma.userSession.deleteMany({ where: { refreshToken } });
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: number): Promise<number> {
  const result = await prisma.userSession.deleteMany({ where: { userId } });
  return result.count;
}

/**
 * Revoke a specific session by session token
 */
export async function revokeSession(sessionToken: string, userId?: number): Promise<void> {
  if (userId) {
    const result = await prisma.userSession.deleteMany({
      where: { sessionToken, userId },
    });
    if (result.count === 0) {
      throw new Error('Session not found or does not belong to user');
    }
  } else {
    await prisma.userSession.deleteMany({ where: { sessionToken } });
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
  const sessions = await prisma.userSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sessionToken: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  return sessions.map((s) => ({
    id: s.id,
    sessionToken: s.sessionToken,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
}

/**
 * Cleanup expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.userSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

/**
 * Create a new user session (used on login)
 */
export async function createSession(params: {
  userId: number;
  sessionToken: string;
  refreshToken: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresInDays?: number;
}): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 7));
  await prisma.userSession.create({
    data: {
      userId: params.userId,
      sessionToken: params.sessionToken,
      refreshToken: params.refreshToken,
      expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}

/**
 * Update session with new tokens (used on refresh)
 */
export async function updateSessionRefresh(
  oldRefreshToken: string,
  newSessionToken: string,
  newRefreshToken: string,
  expiresInDays: number = 7
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  await prisma.userSession.updateMany({
    where: { refreshToken: oldRefreshToken },
    data: {
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
      expiresAt,
    },
  });
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

  const apiKey = await prisma.apiKey.create({
    data: { userId, keyHash, name, permissions },
    select: { id: true },
  });

  return {
    key,
    apiKeyId: apiKey.id,
  };
}

/**
 * Verify an API key and return its information
 */
export async function verifyAPIKey(key: string): Promise<APIKeyInfo | null> {
  const apiKeys = await prisma.apiKey.findMany({
    where: { isActive: true },
    select: { id: true, userId: true, keyHash: true, name: true, permissions: true, expiresAt: true },
  });

  for (const row of apiKeys) {
    const isValid = await bcrypt.compare(key, row.keyHash);
    if (isValid) {
      if (row.expiresAt && row.expiresAt < new Date()) continue;

      await prisma.apiKey.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        id: row.id,
        userId: row.userId,
        name: row.name,
        permissions: row.permissions ?? [],
        expiresAt: row.expiresAt ?? undefined,
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
    await prisma.apiKey.updateMany({
      where: { id: apiKeyId, userId },
      data: { isActive: false },
    });
  } else {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    owner: ['*'],
    member: [
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
  };

  const userPermissions = rolePermissions[userRole] || [];
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(requiredPermission);
}
