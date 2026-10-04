/**
 * Workspace usage: credits, period, daily breakdown, per-agent.
 * GET /api/workspaces/:workspaceId/usage?period=this|last|all
 */

import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { getRemainingCredits } from '../../billing/credits.service.js';
import { getWorkspaceMember } from '../workspace.service.js';

const router = express.Router();

function periodBounds(row: { periodStart: Date; periodEnd: Date }, period: string): { start: Date; end: Date } {
  if (period === 'last') {
    const end = new Date(row.periodStart);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  }
  if (period === 'all') {
    return { start: new Date(0), end: new Date(Date.now() + 86400000) };
  }
  return { start: row.periodStart, end: row.periodEnd };
}

router.get('/:workspaceId/usage', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) return res.status(400).json({ error: 'Invalid workspace ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const member = await getWorkspaceMember(workspaceId, userId);
    if (!member) return res.status(403).json({ error: 'Access denied to this workspace' });

    const period = typeof req.query.period === 'string' ? req.query.period : 'this';

    // Always get the current credits row for included/bonus/remaining
    const usage = await getRemainingCredits(workspaceId);
    const { start, end } = periodBounds(usage, period);

    // ── Per-agent breakdown (raw SQL — groupBy with nested workspace filter is unreliable) ──
    const perAgentRaw = await prisma.$queryRaw<
      Array<{ agent_id: number; messages: bigint; credits_used: bigint }>
    >`
      SELECT acm.agent_id,
             COUNT(*) AS messages,
             COALESCE(SUM(acm.credits_used), 0) AS credits_used
      FROM agent_chat_messages acm
      JOIN agents a ON a.id = acm.agent_id
      WHERE a.workspace_id = ${workspaceId}
        AND acm.role = 'assistant'
        AND acm.created_at >= ${start}
        AND acm.created_at <  ${end}
      GROUP BY acm.agent_id
      ORDER BY credits_used DESC
    `;

    const agentIds = perAgentRaw.map((r) => r.agent_id);
    const agents = agentIds.length
      ? await prisma.agent.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));

    const perAgent = perAgentRaw.map((r) => ({
      agentId: r.agent_id,
      agentName: agentMap.get(r.agent_id) ?? 'Unknown',
      messages: Number(r.messages),
      creditsUsed: Number(r.credits_used),
    }));

    // ── Daily breakdown ──
    const dailyRaw = await prisma.$queryRaw<
      Array<{ day: Date; credits_used: bigint; messages: bigint }>
    >`
      SELECT DATE(acm.created_at) AS day,
             COALESCE(SUM(acm.credits_used), 0) AS credits_used,
             COUNT(*) AS messages
      FROM agent_chat_messages acm
      JOIN agents a ON a.id = acm.agent_id
      WHERE a.workspace_id = ${workspaceId}
        AND acm.role = 'assistant'
        AND acm.created_at >= ${start}
        AND acm.created_at <  ${end}
      GROUP BY DATE(acm.created_at)
      ORDER BY day ASC
    `;

    const dailyUsage = dailyRaw.map((r) => ({
      date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      creditsUsed: Number(r.credits_used),
      messages: Number(r.messages),
    }));

    // Totals for the selected period (may differ from current-period usedCredits when viewing last/all)
    const periodCreditsUsed = period === 'this'
      ? usage.usedCredits
      : dailyRaw.reduce((sum, r) => sum + Number(r.credits_used), 0);

    return res.json({
      // Current billing period (always reflects live credits)
      includedCredits: usage.includedCredits,
      bonusCredits: usage.bonusCredits,
      usedCredits: period === 'this' ? usage.usedCredits : periodCreditsUsed,
      remaining: usage.remaining,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
      // Selected period range
      selectedStart: start,
      selectedEnd: end,
      // Breakdowns
      perAgent,
      dailyUsage,
    });
  } catch (e) {
    console.error('Usage error:', e);
    return res.status(500).json({ error: 'Failed to load usage' });
  }
});

export default router;
