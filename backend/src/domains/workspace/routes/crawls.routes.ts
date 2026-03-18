/**
 * Workspace-level crawl routes (no :agentId). Agent crawls list is in agents domain.
 * Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { prisma } from '../../../db/prisma.js';
import { canManageAgentsInWorkspace } from '../../agents/agent.service.js';
import {
  crawlAndStore,
  getLatestCrawlForWorkspace,
  deleteCrawl,
  assignCrawlToAgent,
} from '../../websites/crawl.service.js';
import { deleteWebsiteCrawlDocuments } from '../../training/services/document.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/crawl:
 *   get:
 *     summary: Get latest crawl for workspace
 *     tags: [Crawls]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: crawl or null }
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
 * @swagger
 * /api/workspaces/{workspaceId}/crawl:
 *   post:
 *     summary: Start website crawl
 *     tags: [Crawls]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { url: { type: string }, useCase: { type: string }, agentId: { type: integer } }
 *             required: [url]
 *     responses:
 *       201: { description: crawl }
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

    const { url, useCase, agentId } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const agentIdNum = agentId != null ? parseInt(String(agentId), 10) : undefined;
    if (agentId != null && (isNaN(agentIdNum as number) || agentIdNum === 0)) {
      return res.status(400).json({ error: 'Invalid agentId' });
    }

    const crawl = await crawlAndStore(workspaceId, url.trim(), useCase ?? 'general', agentIdNum);
    return res.status(201).json({ crawl });
  } catch (error: any) {
    console.error('Crawl error:', error);
    const message = error?.message?.includes('fetch') ? 'Could not reach the URL. Check the link and try again.' : 'Failed to crawl website';
    res.status(500).json({ error: message, details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/crawls/{crawlId}:
 *   delete:
 *     summary: Delete crawl
 *     tags: [Crawls]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: crawlId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Crawl not found }
 */
router.delete('/:workspaceId/crawls/:crawlId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const crawlId = parseInt(req.params.crawlId, 10);
    if (isNaN(workspaceId) || isNaN(crawlId)) {
      return res.status(400).json({ error: 'Invalid workspace or crawl ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const { deleted, agentId } = await deleteCrawl(crawlId, workspaceId);
    if (!deleted) return res.status(404).json({ error: 'Crawl not found' });
    if (agentId != null) await deleteWebsiteCrawlDocuments(agentId);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete crawl error:', error);
    res.status(500).json({ error: 'Failed to delete crawl', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/crawls/{crawlId}:
 *   patch:
 *     summary: Assign crawl to agent
 *     tags: [Crawls]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: crawlId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { agentId: { type: integer } }
 *             required: [agentId]
 *     responses:
 *       200: { description: ok }
 */
router.patch('/:workspaceId/crawls/:crawlId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const crawlId = parseInt(req.params.crawlId, 10);
    const agentId = req.body?.agentId != null ? parseInt(String(req.body.agentId), 10) : NaN;
    if (isNaN(workspaceId) || isNaN(crawlId) || isNaN(agentId) || agentId < 1) {
      return res.status(400).json({ error: 'Invalid workspace, crawl, or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updated = await assignCrawlToAgent(crawlId, workspaceId, agentId);
    if (!updated) return res.status(404).json({ error: 'Crawl not found' });
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Assign crawl error:', error);
    res.status(500).json({ error: 'Failed to assign crawl', details: error?.message });
  }
});

export default router;
