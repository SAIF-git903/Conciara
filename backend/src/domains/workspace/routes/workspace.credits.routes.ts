/**
 * Workspace credits API routes. GET /api/workspaces/:workspaceId/credits
 * Returns current credit usage and allowances for the workspace.
 */

import express from 'express';
import { getWorkspaceCredits } from '../../billing/credits.service.js';
import { getPlanForWorkspace } from '../../billing/plan.service.js';
import { getWorkspaceMember } from '../workspace.service.js';

const router = express.Router();

router.get('/:workspaceId/credits', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const [credits, plan] = await Promise.all([
      getWorkspaceCredits(workspaceId),
      getPlanForWorkspace(workspaceId)
    ]);

    return res.json({
      workspaceId,
      monthlyAllowance: plan.messageCredits,
      monthlyUsed: credits.monthlyUsed,
      monthlyRemaining: credits.monthlyRemaining,
      bonusCredits: credits.bonusCredits,
      totalAvailable: credits.monthlyRemaining + credits.bonusCredits,
      resetDate: credits.resetDate,
      plan: plan.name
    });
  } catch (e) {
    console.error('Workspace credits error:', e);
    return res.status(500).json({ error: 'Failed to load credits' });
  }
});

export default router;