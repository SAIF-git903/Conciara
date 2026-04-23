import express from 'express';
import { canManageWorkspaceSettings } from '../../agents/agent.service.js';
import { listWorkspaceAuditLogs } from '../../audit/audit.service.js';

const router = express.Router();

router.get('/:workspaceId/audit-logs', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canView = await canManageWorkspaceSettings(userId, workspaceId);
    if (!canView) return res.status(403).json({ error: 'Only workspace owners can view audit logs' });

    const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);
    const action = typeof req.query.action === 'string' ? req.query.action.trim() : undefined;
    const actorUserId = typeof req.query.actorUserId === 'string'
      ? Number.parseInt(req.query.actorUserId, 10)
      : undefined;

    const result = await listWorkspaceAuditLogs(workspaceId, {
      limit,
      offset,
      action: action || undefined,
      actorUserId: Number.isNaN(actorUserId as number) ? undefined : actorUserId,
    });
    return res.json(result);
  } catch (error: any) {
    console.error('List audit logs error:', error);
    return res.status(500).json({ error: 'Failed to list audit logs', details: error?.message });
  }
});

export default router;

