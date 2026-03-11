/**
 * Workspace usage: credits remaining, period, per-agent breakdown.
 * GET /api/workspaces/:workspaceId/usage
 */

import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { getRemainingCredits } from '../../billing/credits.service.js';
import { getWorkspaceMember } from '../workspace.service.js';

const router = express.Router();

router.get('/:workspaceId/usage', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const usage = await getRemainingCredits(workspaceId);
    const perAgent = await prisma.agentChatMessage.groupBy({
      by: ['agentId'],
      where: {
        agent: { workspaceId },
        role: 'assistant',
        createdAt: { gte: usage.periodStart, lt: usage.periodEnd },
      },
      _sum: { creditsUsed: true },
      _count: { id: true },
    });
    const agentIds = perAgent.map((a) => a.agentId);
    const agents = agentIds.length
      ? await prisma.agent.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        })
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const perAgentList = perAgent.map((a) => ({
      agentId: a.agentId,
      agentName: agentMap.get(a.agentId) ?? 'Unknown',
      messages: a._count.id,
      creditsUsed: a._sum.creditsUsed ?? 0,
    }));

    return res.json({
      includedCredits: usage.includedCredits,
      bonusCredits: usage.bonusCredits,
      usedCredits: usage.usedCredits,
      remaining: usage.remaining,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      perAgent: perAgentList,
    });
  } catch (e) {
    console.error('Usage error:', e);
    return res.status(500).json({ error: 'Failed to load usage' });
  }
});

export default router;
