/**
 * Workspace API keys: list, create, revoke. Plan-gated (API access required for create).
 * Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { workspaceHasApiAccess, getPlanForWorkspace } from '../../billing/plan.service.js';
import { PLAN_LIMIT_CODES } from '../../../common/errors/planLimit.js';
import {
  createWorkspaceApiKey,
  listWorkspaceApiKeys,
  revokeWorkspaceApiKey,
} from '../workspace-api-keys.service.js';
import { getWorkspaceMember } from '../workspace.service.js';
import { requirePermission } from '../../../middleware/permissions.js';

const router = express.Router();

async function requireWorkspaceAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const workspaceId = parseInt(req.params.workspaceId, 10);
  if (isNaN(workspaceId)) {
    return res.status(400).json({ error: 'Invalid workspace ID' });
  }
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const member = await getWorkspaceMember(workspaceId, userId);
  if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });
  (req as express.Request & { workspaceId: number }).workspaceId = workspaceId;
  next();
}

/**
 * @swagger
 * /api/workspaces/{workspaceId}/api-keys:
 *   get:
 *     summary: List workspace API keys
 *     tags: [Workspace API Keys]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: List of API keys }
 */
router.get('/:workspaceId/api-keys', requireWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = (req as express.Request & { workspaceId: number }).workspaceId;
    const keys = await listWorkspaceApiKeys(workspaceId);
    return res.json(keys);
  } catch (e) {
    console.error('List API keys error:', e);
    return res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/api-keys:
 *   post:
 *     summary: Create workspace API key (plan-gated)
 *     tags: [Workspace API Keys]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string } }
 *     responses:
 *       201: { description: key (shown once), keyPrefix, id }
 *       403: { description: API access not in plan }
 */
router.post('/:workspaceId/api-keys', requirePermission({ feature: 'apiAccess', requireOwner: true }), async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }

    const userId = req.user!.id;
    const hasAccess = await workspaceHasApiAccess(workspaceId);
    if (!hasAccess) {
      const plan = await getPlanForWorkspace(workspaceId);
      return res.status(403).json({
        code: PLAN_LIMIT_CODES.API_ACCESS_RESTRICTED,
        message: 'API access is not included in your plan',
        plan: plan.name,
      });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : 'API Key';
    const created = await createWorkspaceApiKey(workspaceId, userId, name || 'API Key');
    return res.status(201).json({
      id: created.id,
      key: created.rawKey,
      keyPrefix: created.keyPrefix,
      name: created.name,
      createdAt: created.createdAt,
      message: 'Store this key now. It will not be shown again.',
    });
  } catch (e) {
    console.error('Create API key error:', e);
    return res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke workspace API key
 *     tags: [Workspace API Keys]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: API key revoked }
 *       404: { description: API key not found }
 */
router.delete('/:workspaceId/api-keys/:keyId', requireWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = (req as express.Request & { workspaceId: number }).workspaceId;
    const keyId = req.params.keyId;
    if (!keyId) return res.status(400).json({ error: 'Key ID required' });
    const revoked = await revokeWorkspaceApiKey(keyId, workspaceId);
    if (!revoked) return res.status(404).json({ error: 'API key not found' });
    return res.json({ message: 'API key revoked' });
  } catch (e) {
    console.error('Revoke API key error:', e);
    return res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

export default router;
