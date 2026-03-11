/**
 * Public and config routes: no auth required.
 * - GET /api/health — health check
 * - GET /api/models — LLM models for onboarding/agent config
 * - GET /api/public/widget-config — widget config for embed (query: workspaceId, agentId)
 * - POST /api/public/workspaces/:workspaceId/agents/:agentId/chat/stream — public embed chat stream
 */

import express from 'express';
import { prisma } from '../db/prisma.js';
import { SUPPORTED_LLM_MODELS } from '../shared/llm.service.js';
import { injectPresignedWidgetHeaderIcon } from '../shared/s3.service.js';
import { handlePublicAgentChatStream } from '../domains/workspace/routes/index.js';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Dialog Tree API is running' });
});

router.get('/models', (_req, res) => {
  res.json({ models: SUPPORTED_LLM_MODELS.map((m) => ({ id: m.id, label: m.label })) });
});

const PLAN_DISPLAY_ORDER = ['free', 'hobby', 'standard', 'pro'];

/** List all plans (for pricing page). Returns same structure as seed. Enterprise excluded for now. */
router.get('/plans', async (_req, res) => {
  try {
    const rows = await prisma.plan.findMany({
      where: { name: { not: 'enterprise' } },
    });
    const plans = [...rows].sort(
      (a, b) => PLAN_DISPLAY_ORDER.indexOf(a.name) - PLAN_DISPLAY_ORDER.indexOf(b.name)
    );
    res.json({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        messageCredits: p.messageCredits,
        maxAgents: p.maxAgents,
        maxMembers: p.maxMembers,
        maxTrainingBytes: Number(p.maxTrainingBytes),
        apiAccess: p.apiAccess,
      })),
    });
  } catch (e) {
    console.error('Plans list error:', e);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

router.get('/public/widget-config', async (req, res) => {
  try {
    const workspaceId = parseInt(String(req.query.workspaceId ?? ''), 10);
    const agentId = parseInt(String(req.query.agentId ?? ''), 10);
    if (!workspaceId || !agentId || isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'workspaceId and agentId are required' });
    }
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { widgetConfig: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    let config = agent.widgetConfig as Record<string, unknown> | null;
    config = await injectPresignedWidgetHeaderIcon(config);
    res.json({ config: config ?? null });
  } catch (error: unknown) {
    console.error('Public widget config error:', error);
    res.status(500).json({ error: 'Failed to load widget config' });
  }
});

router.post('/public/workspaces/:workspaceId/agents/:agentId/chat/stream', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    await handlePublicAgentChatStream(workspaceId, agentId, req.body, res);
  } catch (error: unknown) {
    console.error('Public chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: (error as Error).message || 'Chat failed' });
    } else {
      res.end();
    }
  }
});

export default router;
