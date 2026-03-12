/**
 * Workspace billing: subscription summary for settings/billing page.
 * GET /api/workspaces/:workspaceId/subscription
 * GET /api/workspaces/:workspaceId/invoice/:paddleTransactionId - returns { url } for invoice PDF
 */

import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { getWorkspaceMember } from '../workspace.service.js';

const PADDLE_API_KEY = process.env.PADDLE_API_KEY || '';
const PADDLE_API_BASE =
  process.env.PADDLE_API_BASE_URL ||
  (PADDLE_API_KEY.includes('sdbx_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com');

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

/** Get a temporary invoice PDF URL for a transaction (Paddle API). Link expires in 1 hour. */
router.get('/:workspaceId/invoice/:paddleTransactionId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const paddleTransactionId = req.params.paddleTransactionId;
    if (Number.isNaN(workspaceId) || !paddleTransactionId) {
      return res.status(400).json({ error: 'Invalid workspace or transaction ID' });
    }
    const userId = (req as express.Request & { user?: { id: number } }).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const transaction = await prisma.workspaceBillingTransaction.findFirst({
      where: { workspaceId, paddleTransactionId },
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!PADDLE_API_KEY) {
      return res.status(503).json({ error: 'Invoice service not configured' });
    }

    const paddleRes = await fetch(
      `${PADDLE_API_BASE}/transactions/${encodeURIComponent(paddleTransactionId)}/invoice?disposition=inline`,
      { headers: { Authorization: `Bearer ${PADDLE_API_KEY}` } }
    );
    if (!paddleRes.ok) {
      const errBody = await paddleRes.text();
      return res.status(paddleRes.status).json({
        error: 'Failed to get invoice URL',
        details: errBody || undefined,
      });
    }
    const json = (await paddleRes.json()) as { data?: { url?: string } };
    const url = json?.data?.url;
    if (!url) {
      return res.status(502).json({ error: 'Invalid response from invoice service' });
    }
    return res.json({ url });
  } catch (e) {
    console.error('Workspace invoice error:', e);
    return res.status(500).json({ error: 'Failed to get invoice' });
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
