/**
 * Domain Filtering Middleware
 * Filters data by website/domain for editors (admins see everything)
 */

import { Request, Response, NextFunction } from 'express';
import { getUserWebsiteIds, userHasWebsiteAccess } from '../services/userService.js';
import { pool } from '../db/connection.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      allowedWebsiteIds?: number[];
      isAdmin?: boolean;
    }
  }
}

/**
 * Middleware to set allowed website IDs based on user role
 * - Admins: can access all websites (allowedWebsiteIds = undefined)
 * - Editors/Viewers: can only access their assigned websites
 */
export async function setDomainFilter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = req.user;
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
      // Admin can access everything
      req.isAdmin = true;
      req.allowedWebsiteIds = undefined; // undefined means all websites
    } else {
      // Get user's assigned websites
      const websiteIds = await getUserWebsiteIds(user.id);
      req.isAdmin = false;
      req.allowedWebsiteIds = websiteIds;

      if (websiteIds.length === 0) {
        // User has no assigned websites
        res.status(403).json({ 
          error: 'No websites assigned. Contact an administrator.',
          code: 'NO_WEBSITES_ASSIGNED'
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Domain filter middleware error:', error);
    res.status(500).json({ error: 'Domain filtering error' });
  }
}

/**
 * Middleware to check if user has access to a specific website
 */
export async function requireWebsiteAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const websiteId = parseInt(req.params.websiteId || req.body.websiteId || req.query.websiteId);

    if (!websiteId) {
      return next(); // No website ID specified, let route handle it
    }

    const hasAccess = await userHasWebsiteAccess(req.user.id, websiteId);

    if (!hasAccess) {
      res.status(403).json({ 
        error: 'Access denied to this website',
        websiteId
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Website access check error:', error);
    res.status(500).json({ error: 'Website access check failed' });
  }
}

/**
 * Helper function to build website filter SQL
 * Returns WHERE clause and parameters for filtering by website
 */
export function buildWebsiteFilter(
  allowedWebsiteIds: number[] | undefined,
  tableAlias: string = 'dt',
  websiteIdColumn: string = 'website_id'
): { whereClause: string; params: any[]; paramOffset: number } {
  if (allowedWebsiteIds === undefined) {
    // Admin - no filter
    return { whereClause: '', params: [], paramOffset: 0 };
  }

  if (allowedWebsiteIds.length === 0) {
    // No websites assigned - return impossible condition
    return { 
      whereClause: `WHERE ${tableAlias}.${websiteIdColumn} = -1`, 
      params: [], 
      paramOffset: 0 
    };
  }

  // Build IN clause
  const placeholders = allowedWebsiteIds.map((_, i) => `$${i + 1}`).join(', ');
  return {
    whereClause: `WHERE ${tableAlias}.${websiteIdColumn} IN (${placeholders})`,
    params: allowedWebsiteIds,
    paramOffset: allowedWebsiteIds.length,
  };
}

/**
 * Helper function to get website ID from tree ID
 */
export async function getWebsiteIdFromTreeId(treeId: number): Promise<number | null> {
  try {
    const result = await pool.query(
      `SELECT w.id as website_id
       FROM dialog_trees dt
       JOIN ab_variations av ON dt.ab_variation_id = av.id
       JOIN skins s ON av.skin_id = s.id
       JOIN websites w ON s.website_id = w.id
       WHERE dt.id = $1
       LIMIT 1`,
      [treeId]
    );

    return result.rows[0]?.website_id || null;
  } catch (error) {
    console.error('Error getting website ID from tree ID:', error);
    return null;
  }
}

/**
 * Helper function to get website ID from session ID
 */
export async function getWebsiteIdFromSessionId(sessionId: string): Promise<number | null> {
  try {
    const result = await pool.query(
      `SELECT w.id as website_id
       FROM conversation_sessions cs
       JOIN dialog_trees dt ON cs.tree_id = dt.id
       JOIN ab_variations av ON dt.ab_variation_id = av.id
       JOIN skins s ON av.skin_id = s.id
       JOIN websites w ON s.website_id = w.id
       WHERE cs.session_id = $1
       LIMIT 1`,
      [sessionId]
    );

    return result.rows[0]?.website_id || null;
  } catch (error) {
    console.error('Error getting website ID from session ID:', error);
    return null;
  }
}
