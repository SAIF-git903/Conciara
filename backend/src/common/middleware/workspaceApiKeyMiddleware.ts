/**
 * Workspace API key auth: Authorization: Bearer <ck_live_xxx>.
 * On success: attach workspaceId to request, no user.
 */

import { Request, Response, NextFunction } from 'express';
import { validateWorkspaceApiKey } from '../../domains/workspace/workspace-api-keys.service.js';

declare global {
  namespace Express {
    interface Request {
      workspaceApiKeyWorkspaceId?: number;
    }
  }
}

export async function requireWorkspaceApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'API key required. Use Authorization: Bearer <your-api-key>.' });
    return;
  }
  const rawKey = auth.slice(7).trim();
  const result = await validateWorkspaceApiKey(rawKey);
  if (!result) {
    res.status(401).json({ error: 'Invalid or revoked API key.' });
    return;
  }
  req.workspaceApiKeyWorkspaceId = result.workspaceId;
  next();
}
