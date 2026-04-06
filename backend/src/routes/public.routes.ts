/**
 * Public and config routes: no auth required.
 * - GET /api/health — health check
 * - GET /api/models — LLM models for onboarding/agent config
 * - GET /api/public/widget-config — widget config for embed (query: workspaceId, agentId)
 * - POST /api/public/workspaces/:workspaceId/agents/:agentId/chat/stream — public embed chat stream
 */

import express from 'express';
import { ActionType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { SUPPORTED_LLM_MODELS } from '../shared/llm.service.js';
import { injectPresignedWidgetHeaderIcon } from '../shared/s3.service.js';
import { handlePublicAgentChatStream } from '../domains/workspace/routes/index.js';
import { publicChatRateLimiter } from '../common/middleware/rateLimit.js';

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

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: List supported LLM models
 *     description: Returns available LLM models for agent configuration
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of models
 */
router.get('/models', (_req, res) => {
  res.json({ models: SUPPORTED_LLM_MODELS.map((m) => ({ id: m.id, label: m.label })) });
});

const PLAN_DISPLAY_ORDER = ['free', 'hobby', 'standard', 'pro'];
const PUBLIC_PROXY_TIMEOUT_MS = 10_000;
const PUBLIC_PROXY_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_PROXY_RATE_LIMIT_MAX = 60;
const publicProxyRateLimit = new Map<number, number[]>();

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.')) return true;
  if (h.startsWith('172.16.') || h.startsWith('172.17.') || h.startsWith('172.18.') || h.startsWith('172.19.')) return true;
  if (h.startsWith('172.2')) return h.startsWith('172.20.') || h.startsWith('172.21.') || h.startsWith('172.22.') || h.startsWith('172.23.') || h.startsWith('172.24.') || h.startsWith('172.25.') || h.startsWith('172.26.') || h.startsWith('172.27.') || h.startsWith('172.28.') || h.startsWith('172.29.');
  if (h.startsWith('172.30.') || h.startsWith('172.31.')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

async function validatePublicProxyUrl(urlValue: string): Promise<void> {
  if (!isSafeHttpUrl(urlValue)) throw new Error('API URL must start with http:// or https://');
  const parsed = new URL(urlValue);
  if (isPrivateHost(parsed.hostname)) throw new Error('Target URL points to a private or local address');
  const dns = await import('node:dns/promises');
  const records = await dns.lookup(parsed.hostname, { all: true });
  for (const record of records) {
    if (isPrivateHost(record.address)) throw new Error('Target URL resolves to a private or local address');
  }
}

function consumePublicProxyLimit(chatbotId: number): boolean {
  const now = Date.now();
  const existing = publicProxyRateLimit.get(chatbotId) ?? [];
  const filtered = existing.filter((ts) => now - ts <= PUBLIC_PROXY_RATE_LIMIT_WINDOW_MS);
  if (filtered.length >= PUBLIC_PROXY_RATE_LIMIT_MAX) {
    publicProxyRateLimit.set(chatbotId, filtered);
    return false;
  }
  filtered.push(now);
  publicProxyRateLimit.set(chatbotId, filtered);
  return true;
}

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List subscription plans
 *     description: Returns available plans for pricing page (enterprise excluded)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of plans
 */
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

/**
 * @swagger
 * /api/public/widget-config:
 *   get:
 *     summary: Get widget config for embed
 *     description: Public widget configuration by workspaceId and agentId (query params)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Widget config
 *       400:
 *         description: workspaceId and agentId required
 *       404:
 *         description: Agent not found
 */
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

router.get('/public/workspaces/:workspaceId/agents/:agentId/active-actions', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (Number.isNaN(workspaceId) || Number.isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, workspaceId },
      select: { id: true },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const actions = await prisma.action.findMany({
      where: { chatbotId: agentId, isEnabled: true },
      orderBy: { createdAt: 'asc' },
    });
    const customButtons = actions
      .filter((action) => action.type === ActionType.CUSTOM_BUTTONS)
      .map((action) => {
        const config = (action.config ?? {}) as Record<string, unknown>;
        const buttons = Array.isArray(config.buttons) ? config.buttons : [];
        return {
          id: action.id,
          name: action.name,
          triggerInstructions: typeof config.triggerInstructions === 'string' ? config.triggerInstructions : '',
          buttons: buttons.map((button) => {
            const row = (button ?? {}) as Record<string, unknown>;
            return {
              id: typeof row.id === 'string' ? row.id : '',
              label: typeof row.label === 'string' ? row.label.slice(0, 30) : '',
              url: typeof row.url === 'string' ? row.url : '',
              openInNewTab: typeof row.openInNewTab === 'boolean' ? row.openInNewTab : true,
            };
          }),
        };
      });

    const customActions = actions
      .filter((action) => action.type === ActionType.CUSTOM_ACTION)
      .map((action) => {
        const config = (action.config ?? {}) as Record<string, unknown>;
        return {
          id: action.id,
          name: action.name,
          actionFunctionName: typeof config.actionFunctionName === 'string' ? config.actionFunctionName : '',
          triggerInstructions: typeof config.triggerInstructions === 'string' ? config.triggerInstructions : '',
          executionMode: typeof config.executionMode === 'string' ? config.executionMode : 'server_side',
          inputFields: Array.isArray(config.inputFields) ? config.inputFields : [],
        };
      });

    return res.json({ customButtons, customActions });
  } catch (error) {
    console.error('Public active actions error:', error);
    return res.status(500).json({ error: 'Failed to load active actions' });
  }
});

router.post('/public/workspaces/:workspaceId/agents/:agentId/actions/proxy', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (Number.isNaN(workspaceId) || Number.isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const actionId = typeof req.body?.actionId === 'string' ? req.body.actionId.trim() : '';
    if (!actionId) return res.status(400).json({ error: 'actionId is required' });
    if (!consumePublicProxyLimit(agentId)) return res.status(429).json({ error: 'Too many proxy calls. Please slow down.' });

    const action = await prisma.action.findFirst({
      where: {
        id: actionId,
        chatbotId: agentId,
        type: ActionType.CUSTOM_ACTION,
        isEnabled: true,
        chatbot: { workspaceId },
      },
      select: { id: true, chatbotId: true, config: true },
    });
    if (!action) return res.status(404).json({ error: 'Action not found' });

    const config = (action.config ?? {}) as Record<string, unknown>;
    const executionMode = typeof config.executionMode === 'string' ? config.executionMode : 'server_side';
    if (executionMode !== 'server_side') {
      return res.status(400).json({ error: 'Only server-side custom actions can be proxied' });
    }
    const apiUrl = typeof config.apiUrl === 'string' ? config.apiUrl : '';
    await validatePublicProxyUrl(apiUrl);

    const collectedInputs = req.body?.collectedInputs && typeof req.body.collectedInputs === 'object'
      ? (req.body.collectedInputs as Record<string, unknown>)
      : {};
    const queryParams = Array.isArray(config.queryParams) ? config.queryParams : [];
    const bodyParams = Array.isArray(config.bodyParams) ? config.bodyParams : [];
    const headersRows = Array.isArray(config.headers) ? config.headers : [];
    const resolveInput = (field: string) => String(collectedInputs[field] ?? '');
    const interpolateUrlTemplate = (rawApiUrl: string): string => {
      if (!rawApiUrl) return rawApiUrl;
      let next = rawApiUrl;
      next = next.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, field: string) => resolveInput(field));
      next = next.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, field: string) => resolveInput(field));
      try {
        const parsed = new URL(next);
        parsed.pathname = parsed.pathname.replace(/:([a-zA-Z0-9_]+)/g, (_m, field: string) => {
          const v = resolveInput(field);
          return v ? encodeURIComponent(v) : `:${field}`;
        });
        return parsed.toString();
      } catch {
        return next;
      }
    };

    const requestUrl = new URL(interpolateUrlTemplate(apiUrl));

    for (const rowAny of queryParams) {
      const row = (rowAny ?? {}) as Record<string, unknown>;
      const key = typeof row.key === 'string' ? row.key.trim() : '';
      if (!key) continue;
      const source = typeof row.source === 'string' ? row.source : 'static';
      const value = source === 'user_input'
        ? String(collectedInputs[typeof row.userInputField === 'string' ? row.userInputField : key] ?? '')
        : String(row.value ?? '');
      if (value) requestUrl.searchParams.set(key, value);
    }

    const body: Record<string, unknown> = {};
    for (const rowAny of bodyParams) {
      const row = (rowAny ?? {}) as Record<string, unknown>;
      const key = typeof row.key === 'string' ? row.key.trim() : '';
      if (!key) continue;
      const source = typeof row.source === 'string' ? row.source : 'static';
      body[key] = source === 'user_input'
        ? collectedInputs[typeof row.userInputField === 'string' ? row.userInputField : key] ?? null
        : row.value ?? null;
    }

    const headers: Record<string, string> = {};
    for (const rowAny of headersRows) {
      const row = (rowAny ?? {}) as Record<string, unknown>;
      const key = typeof row.key === 'string' ? row.key.trim() : '';
      const value = typeof row.value === 'string' ? row.value : '';
      if (!key || !value) continue;
      if (['authorization', 'cookie', 'x-forwarded-for', 'x-real-ip'].includes(key.toLowerCase())) continue;
      headers[key] = value;
    }

    const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'POST';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUBLIC_PROXY_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const response = await fetch(requestUrl.toString(), {
        method,
        headers: {
          ...headers,
          ...(!['GET', 'DELETE'].includes(method) ? { 'content-type': 'application/json' } : {}),
        },
        body: ['GET', 'DELETE'].includes(method) ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      let responseBody: unknown = text;
      try {
        responseBody = text ? JSON.parse(text) : null;
      } catch {
        // Keep text body as-is.
      }
      console.info(`[actions-proxy-public] ts=${new Date().toISOString()} actionId=${action.id} statusCode=${response.status}`);
      return res.status(response.ok ? 200 : 502).json({
        success: response.ok,
        statusCode: response.status,
        responseBody,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return res.status(408).json({
          success: false,
          statusCode: 408,
          responseBody: { error: 'Proxy request timed out after 10 seconds' },
          durationMs: Date.now() - startedAt,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Proxy execution failed';
    return res.status(400).json({
      success: false,
      statusCode: 400,
      responseBody: { error: message },
      durationMs: 0,
    });
  }
});

/**
 * @swagger
 * /api/public/workspaces/{workspaceId}/agents/{agentId}/chat/stream:
 *   post:
 *     summary: Public agent chat stream (embed)
 *     description: Stream chat response for public embed (no auth)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages: { type: array, items: { type: object } }
 *               sessionId: { type: string }
 *     responses:
 *       200:
 *         description: SSE stream
 */
router.post('/public/workspaces/:workspaceId/agents/:agentId/chat/stream', publicChatRateLimiter, async (req, res) => {
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
