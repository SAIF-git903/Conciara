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

router.get('/:workspaceId/billing-history', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = (req as express.Request & { user?: { id: number } }).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const transactions = await prisma.workspaceBillingTransaction.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        paddleTransactionId: t.paddleTransactionId,
        amountCents: t.amountCents,
        currencyCode: t.currencyCode,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('Workspace billing history error:', e);
    return res.status(500).json({ error: 'Failed to load billing history' });
  }
});

// Store checkout context for hosted checkout (temporary storage for webhook resolution)
router.post('/:workspaceId/checkout-context', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (Number.isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = (req as express.Request & { user?: { id: number } }).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    // Get user email for linking with Paddle customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Store checkout context (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.checkoutContext.upsert({
      where: { userEmail: user.email.toLowerCase().trim() },
      create: {
        userEmail: user.email.toLowerCase().trim(),
        workspaceId,
        expiresAt,
      },
      update: {
        workspaceId,
        expiresAt,
      },
    });

    return res.json({ success: true });
  } catch (e) {
    console.error('Store checkout context error:', e);
    return res.status(500).json({ error: 'Failed to store checkout context' });
  }
});

export default router;
