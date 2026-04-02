/**
 * Agent widget config and header image. Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import { injectPresignedWidgetHeaderIcon, uploadWidgetHeaderToS3, getPresignedUrl } from '../../../shared/s3.service.js';
import { uploadImage } from '../../../common/uploads.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/widget-config:
 *   get:
 *     summary: Get agent widget config
 *     tags: [Widget]
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
 *       200: { description: { config } }
 */
router.get('/:workspaceId/agents/:agentId/widget-config', async (req, res) => {
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

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { workspaceId: true, widgetConfig: true },
    });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    let config = agent.widgetConfig as Record<string, unknown> | null;
    config = await injectPresignedWidgetHeaderIcon(config);
    return res.json({ config: config ?? null });
  } catch (error: any) {
    console.error('Get widget config error:', error);
    res.status(500).json({ error: 'Failed to get widget config', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/widget-config:
 *   patch:
 *     summary: Update agent widget config
 *     tags: [Widget]
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
 *             properties: { config: { type: object } }
 *     responses:
 *       200: { description: ok, config }
 */
router.patch('/:workspaceId/agents/:agentId/widget-config', async (req, res) => {
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

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { workspaceId: true },
    });
    if (!agent || agent.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { config } = req.body;
    if (config !== null && (typeof config !== 'object' || Array.isArray(config))) {
      return res.status(400).json({ error: 'config must be an object or null' });
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: { widgetConfig: config === null ? null : config },
    });
    return res.json({ ok: true, config: config ?? null });
  } catch (error: any) {
    console.error('Patch widget config error:', error);
    res.status(500).json({ error: 'Failed to save widget config', details: error?.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/widget-header-image:
 *   post:
 *     summary: Upload widget header image
 *     tags: [Widget]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties: { file: { type: string, format: binary } }
 *     responses:
 *       200: { description: { url } }
 */
router.post('/:workspaceId/agents/:agentId/widget-header-image', uploadImage.single('file'), async (req, res) => {
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

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const result = await uploadWidgetHeaderToS3(file, workspaceId, agentId);
    const presignedUrl = await getPresignedUrl(result.key, 7 * 24 * 3600); // 7 days
    return res.status(201).json({ url: result.url, key: result.key, presignedUrl });
  } catch (error: any) {
    console.error('Widget header image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error?.message });
  }
});

export default router;
