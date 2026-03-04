/**
 * v2 Workspace & Agent API.
 * Used only by v2 UI. Requires auth; enforces owner/member access.
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getAgentsForWorkspace,
  canManageAgentsInWorkspace,
  createWorkspace,
  createAgent,
} from '../services/workspaceService.js';
import { crawlAndStore, getLatestCrawlForWorkspace } from '../services/crawlService.js';
import { generatePrePromptFromWebsiteContent } from '../services/llmService.js';

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/v2/workspaces
 * Create a workspace (onboarding). Body: { name, slug? }. User becomes owner.
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { name, slug } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await createWorkspace(userId, name.trim(), slug);
    return res.status(201).json({ workspace });
  } catch (error: any) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace', details: error.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/generate-preprompt
 * Generate a pre-prompt using the workspace's latest crawl and the backend LLM.
 */
router.get('/:workspaceId/generate-preprompt', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const crawl = await getLatestCrawlForWorkspace(workspaceId);
    if (!crawl?.trainingContent?.trim()) {
      return res.json({ prePrompt: '' });
    }

    const prePrompt = await generatePrePromptFromWebsiteContent(crawl.trainingContent);
    return res.json({ prePrompt: prePrompt || '' });
  } catch (error: any) {
    console.error('Generate pre-prompt error:', error);
    res.status(500).json({ error: 'Failed to generate pre-prompt', details: error?.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/crawl
 * Get the latest crawl for the workspace (for Configure step: prefill name and logo).
 */
router.get('/:workspaceId/crawl', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const crawl = await getLatestCrawlForWorkspace(workspaceId);
    return res.json({ crawl: crawl ?? null });
  } catch (error: any) {
    console.error('Get crawl error:', error);
    res.status(500).json({ error: 'Failed to get crawl', details: error?.message });
  }
});

/**
 * POST /api/v2/workspaces/:workspaceId/crawl
 * Crawl a URL and store metadata + training content for the workspace (onboarding Link step).
 * Body: { url, useCase? }. Returns the stored crawl.
 */
router.post('/:workspaceId/crawl', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const { url, useCase } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const crawl = await crawlAndStore(workspaceId, url.trim(), useCase);
    return res.status(201).json({ crawl });
  } catch (error: any) {
    console.error('Crawl error:', error);
    const message = error?.message?.includes('fetch') ? 'Could not reach the URL. Check the link and try again.' : 'Failed to crawl website';
    res.status(500).json({ error: message, details: error?.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/agents
 * List agents in a workspace. User must be owner or member of the workspace.
 */
router.get('/:workspaceId/agents', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const agents = await getAgentsForWorkspace(workspaceId);
    return res.json({ agents });
  } catch (error: any) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * POST /api/v2/workspaces/:workspaceId/agents
 * Create an agent in a workspace. Body: { name }. User must have access to the workspace.
 */
router.post('/:workspaceId/agents', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const { name, model, prePrompt, logoUrl } = req.body;
    const agentName = typeof name === 'string' && name.trim() ? name.trim() : 'My Agent';
    const agent = await createAgent(workspaceId, agentName, {
      model: typeof model === 'string' ? model : undefined,
      prePrompt: typeof prePrompt === 'string' ? prePrompt : undefined,
      logoUrl: typeof logoUrl === 'string' ? logoUrl : undefined,
    });
    return res.status(201).json({ agent });
  } catch (error: any) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent', details: error.message });
  }
});

export default router;
