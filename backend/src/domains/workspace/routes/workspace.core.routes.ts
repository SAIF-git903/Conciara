/**
 * Workspace core routes: CRUD, leave, generate-preprompt.
 * Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
} from '../workspace.service.js';
import { canManageAgentsInWorkspace } from '../../agents/agent.service.js';
import { getLatestCrawlForWorkspace } from '../../websites/crawl.service.js';
import { generatePrePromptFromWebsiteContent } from '../../../shared/llm.service.js';
import { prisma } from '../../../db/prisma.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create workspace
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string }, slug: { type: string } }
 *             required: [name]
 *     responses:
 *       201: { description: Workspace created }
 *       400: { description: Workspace name required }
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
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   patch:
 *     summary: Update workspace
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { name: { type: string } }
 *     responses:
 *       200: { description: Workspace updated }
 *       403: { description: Only owner can update }
 */
router.patch('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { name } = req.body;
    const workspace = await updateWorkspace(workspaceId, userId, { name: typeof name === 'string' ? name : undefined });
    return res.json({ workspace });
  } catch (error: any) {
    if (error?.message === 'Only the workspace owner can update workspace settings') {
      return res.status(403).json({ error: error.message });
    }
    if (error?.message === 'Workspace not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   delete:
 *     summary: Delete workspace
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Workspace deleted }
 *       403: { description: Only owner can delete }
 */
router.delete('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await deleteWorkspace(workspaceId, userId);
    return res.status(200).json({ message: 'Workspace deleted' });
  } catch (error: any) {
    if (error?.message === 'Only the workspace owner can delete the workspace') {
      return res.status(403).json({ error: error.message });
    }
    if (error?.message === 'Workspace not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/leave:
 *   post:
 *     summary: Leave workspace
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: workspaceId, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Left workspace }
 *       400: { description: Owners cannot leave }
 */
router.post('/:workspaceId/leave', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await leaveWorkspace(workspaceId, userId);
    return res.status(200).json({ message: 'Left workspace' });
  } catch (error: any) {
    if (error?.message === 'You are not a member of this workspace') {
      return res.status(404).json({ error: error.message });
    }
    if (error?.message?.includes('Owners cannot leave')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Leave workspace error:', error);
    res.status(500).json({ error: 'Failed to leave workspace', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/generate-preprompt:
 *   get:
 *     summary: Generate pre-prompt from crawl content
 *     tags: [Workspaces]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: agentName
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pre-prompt text }
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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const crawl = await getLatestCrawlForWorkspace(workspaceId);
    if (!crawl?.trainingContent?.trim()) {
      return res.json({ prePrompt: '' });
    }

    const agentName = typeof req.query.agentName === 'string' ? req.query.agentName : undefined;
    const prePrompt = await generatePrePromptFromWebsiteContent(crawl.trainingContent, {
      agentName: agentName || undefined,
      companyName: workspace?.name ?? undefined,
    });
    return res.json({ prePrompt: prePrompt || '' });
  } catch (error: any) {
    console.error('Generate pre-prompt error:', error);
    res.status(500).json({ error: 'Failed to generate pre-prompt', details: error?.message });
  }
});

export default router;
