/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens and checking user permissions
 */

import { Request, Response, NextFunction } from 'express';
import { verifyJWT, hasPermission, UserPayload } from '../services/authService.js';
import { getUserById } from '../services/userService.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload & { fullName?: string };
    }
  }
}

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = verifyJWT(token);
      
      // Verify user still exists and is active
      const user = await getUserById(payload.id);
      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Attach user to request
      req.user = {
        ...payload,
        fullName: user.fullName,
      };

      next();
    } catch (error: any) {
      if (error.message === 'Token expired') {
        res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware to optionally extract user if token is present
 * Doesn't fail if no token - just attaches user if valid token exists
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      next();
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyJWT(token);
      const user = await getUserById(payload.id);
      
      if (user && user.isActive) {
        req.user = {
          ...payload,
          fullName: user.fullName,
        };
      }
    } catch (error) {
      // Invalid token, but continue without user
      // Don't fail the request
    }

    next();
  } catch (error) {
    // Error in middleware, but continue
    next();
  }
}

/**
 * Middleware factory to require a specific role (owner | member)
 */
export function requireRole(role: 'owner' | 'member') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const roleLevel: Record<string, number> = { member: 1, owner: 2 };
    const userLevel = roleLevel[req.user.role] ?? 0;
    const requiredLevel = roleLevel[role] ?? 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: role,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory to require a specific permission
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require owner role (full access)
 */
export const requireAdmin = requireRole('owner');

/**
 * Middleware to require owner role (same as requireAdmin)
 */
export const requireManager = requireRole('owner');
