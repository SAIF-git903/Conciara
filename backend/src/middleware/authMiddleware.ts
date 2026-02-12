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
 * Middleware factory to require a specific role
 */
export function requireRole(role: 'admin' | 'manager' | 'viewer') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      manager: 2,
      admin: 3,
    };

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: role,
        current: req.user.role
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
 * Middleware to require admin role (shorthand)
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require manager or admin role (shorthand)
 */
export const requireManager = requireRole('manager');
