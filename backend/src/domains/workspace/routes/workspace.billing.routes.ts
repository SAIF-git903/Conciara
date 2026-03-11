/**
 * Workspace billing: subscription summary for settings/billing page.
 * GET /api/workspaces/:workspaceId/subscription
 */

import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { getWorkspaceMember } from '../workspace.service.js';

const router = express.Router();

router.get('/:workspaceId/subscription', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = (req as express.Request & { user?: { id: number } }).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const subscription = await prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
      include: { plan: { select: { name: true, displayName: true } } },
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

    return res.json({
      subscription: {
        id: subscription.id,
        planName: subscription.plan.name,
        planDisplayName: subscription.plan.displayName,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (e) {
    console.error('Workspace subscription error:', e);
    return res.status(500).json({ error: 'Failed to load subscription' });
  }
});

export default router;
