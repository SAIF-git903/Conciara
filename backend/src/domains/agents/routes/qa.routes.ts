/**
 * Agent Q&A routes. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import {
  listQaByAgent,
  createQa,
  updateQa,
  deleteQa,
  getQaUsageStats,
} from '../../qa/qa.service.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/qa:
 *   get:
 *     summary: List Q&A entries
 *     tags: [QA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: { entries } }
 */
router.get('/:workspaceId/agents/:agentId/qa', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const entries = await listQaByAgent(agentId);
    return res.json({ entries });
  } catch (error: any) {
    console.error('List Q&A error:', error);
    res.status(500).json({ error: 'Failed to list Q&A' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/qa:
 *   post:
 *     summary: Create Q&A entry
 *     tags: [QA]
 *     security: [{ bearerAuth: [] }]
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
 *             properties: { question: { type: string }, answer: { type: string } }
 *     responses:
 *       201: { description: { entry } }
 */
router.post('/:workspaceId/agents/:agentId/qa', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { question, answer } = req.body;
    const entry = await createQa(agentId, workspaceId, question ?? '', answer ?? '');
    return res.status(201).json({ entry });
  } catch (error: any) {
    console.error('Create Q&A error:', error);
    res.status(500).json({ error: error.message || 'Failed to create Q&A' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/qa/{qaId}/usage:
 *   get:
 *     summary: Get Q&A usage stats
 *     tags: [QA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: qaId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: days
 *         schema: { type: integer }
 *     responses:
 *       200: { description: usage array }
 */
router.get('/:workspaceId/agents/:agentId/qa/:qaId/usage', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const qaId = parseInt(req.params.qaId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(qaId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days), 10) || 30));
    const stats = await getQaUsageStats(qaId, agentId, days);
    return res.json({ usage: Array.isArray(stats) ? stats : [] });
  } catch (error: any) {
    console.error('Q&A usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/qa/{qaId}:
 *   put:
 *     summary: Update Q&A entry
 *     tags: [QA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: qaId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { question: { type: string }, answer: { type: string } }
 *     responses:
 *       200: { description: { entry } }
 */
router.put('/:workspaceId/agents/:agentId/qa/:qaId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const qaId = parseInt(req.params.qaId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(qaId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const entry = await updateQa(qaId, agentId, req.body);
    if (!entry) return res.status(404).json({ error: 'Q&A not found' });
    return res.json({ entry });
  } catch (error: any) {
    console.error('Update Q&A error:', error);
    res.status(500).json({ error: error.message || 'Failed to update Q&A' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/qa/{qaId}:
 *   delete:
 *     summary: Delete Q&A entry
 *     tags: [QA]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: qaId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 */
router.delete('/:workspaceId/agents/:agentId/qa/:qaId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const qaId = parseInt(req.params.qaId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(qaId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const deleted = await deleteQa(qaId, agentId);
    if (!deleted) return res.status(404).json({ error: 'Q&A not found' });
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete Q&A error:', error);
    res.status(500).json({ error: 'Failed to delete Q&A' });
  }
});

export default router;
