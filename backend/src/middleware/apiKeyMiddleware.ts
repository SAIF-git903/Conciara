/**
 * API Key Middleware
 * Verifies API keys for programmatic access
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAPIKey, APIKeyInfo, hasPermission } from '../services/authService.js';
import { getUserById } from '../services/userService.js';

// Extend Express Request type to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKey?: APIKeyInfo;
      apiKeyUser?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to require API key authentication
 * Verifies API key from X-API-Key header
 */
export async function requireAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    const keyInfo = await verifyAPIKey(apiKey);

    if (!keyInfo) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Attach API key info to request
    req.apiKey = keyInfo;

    // Optionally attach user info if available
    if (keyInfo.userId) {
      const user = await getUserById(keyInfo.userId);
      if (user && user.isActive) {
        req.apiKeyUser = {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      }
    }

    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    res.status(500).json({ error: 'API key verification error' });
  }
}

/**
 * Middleware factory to require a specific permission for API key
 */
export function requireAPIKeyPermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // Check if API key has specific permissions
    if (req.apiKey.permissions.length > 0) {
      // API key has explicit permissions list
      if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('*')) {
        res.status(403).json({ 
          error: 'API key does not have required permission',
          required: permission
        });
        return;
      }
    } else if (req.apiKeyUser) {
      // Fall back to user role permissions
      if (!hasPermission(req.apiKeyUser.role, permission)) {
        res.status(403).json({ 
          error: 'API key does not have required permission',
          required: permission
        });
        return;
      }
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Middleware to allow either JWT auth OR API key
 */
export async function requireAuthOrAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hasAuth = req.headers.authorization?.startsWith('Bearer ');
  const hasAPIKey = !!req.headers['x-api-key'];

  if (!hasAuth && !hasAPIKey) {
    res.status(401).json({ error: 'Authentication or API key required' });
    return;
  }

  // Try JWT first
  if (hasAuth) {
    const { requireAuth } = await import('./authMiddleware.js');
    return requireAuth(req, res, next);
  }

  // Fall back to API key
  return requireAPIKey(req, res, next);
}
