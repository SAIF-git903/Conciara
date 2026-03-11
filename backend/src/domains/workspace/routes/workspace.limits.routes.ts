/**
 * Workspace plan limits (for UI gates). GET /api/workspaces/:workspaceId/limits
 * Returns canCreateAgent, canInviteMember, etc. so frontend can use React Context without re-calling on every click.
 */

import express from 'express';
import { getPlanForWorkspace } from '../../billing/plan.service.js';
import { checkAgentLimit, checkMemberLimit } from '../../billing/plan.service.js';
import { getWorkspaceMember } from '../workspace.service.js';

const router = express.Router();

router.get('/:workspaceId/limits', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const plan = await getPlanForWorkspace(workspaceId);
    const [agentLimit, memberLimit] = await Promise.all([
      checkAgentLimit(workspaceId),
      checkMemberLimit(workspaceId),
    ]);

    return res.json({
      plan: plan.name,
      maxAgents: plan.maxAgents,
      currentAgents: agentLimit.current,
      canCreateAgent: agentLimit.allowed,
      maxMembers: plan.maxMembers,
      currentMembers: memberLimit.current,
      canInviteMember: memberLimit.allowed,
      hasApiAccess: plan.apiAccess,
    });
  } catch (e) {
    console.error('Workspace limits error:', e);
    return res.status(500).json({ error: 'Failed to load limits' });
  }
});

export default router;
