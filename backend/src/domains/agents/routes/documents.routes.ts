/**
 * Agent documents (training files). Mounted under /api/workspaces (via aggregator).
 */

import express from 'express';
import { canManageAgent } from '../agent.service.js';
import { prisma } from '../../../db/prisma.js';
import { resolveMimeType } from '../../../shared/documentParser.service.js';
import {
  createAndProcessDocument,
  listDocumentsByAgent,
  deleteDocument,
  trainPendingDocuments,
} from '../../training/services/document.service.js';
import { checkTrainingBytesLimit, getPlanForWorkspace } from '../../billing/plan.service.js';
import { PLAN_LIMIT_CODES } from '../../../common/errors/planLimit.js';
import { upload } from '../../../common/uploads.js';
import { requireFileUploadPermission } from '../../../middleware/permissions.js';

const router = express.Router();

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/documents:
 *   get:
 *     summary: List agent documents
 *     tags: [Documents]
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
 *       200: { description: { documents } }
 */
router.get('/:workspaceId/agents/:agentId/documents', async (req, res) => {
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

    const documents = await listDocumentsByAgent(agentId);
    return res.json({ documents });
  } catch (error: any) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/documents:
 *   post:
 *     summary: Upload document for training
 *     tags: [Documents]
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
 *       201: { description: { document } }
 */
router.post('/:workspaceId/agents/:agentId/documents', requireFileUploadPermission(), upload.single('file'), async (req, res) => {
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

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'No file uploaded. Use form field "file".' });
    }

    const limit = await checkTrainingBytesLimit(workspaceId, agentId, BigInt(file.buffer.length));
    if (!limit.allowed) {
      const plan = await getPlanForWorkspace(workspaceId);
      return res.status(403).json({
        code: PLAN_LIMIT_CODES.STORAGE_LIMIT_REACHED,
        message: 'Training storage limit exceeded for this agent',
        current: Number(limit.current),
        limit: Number(limit.max),
        plan: plan.name,
      });
    }

    const mimeType = resolveMimeType(file.mimetype || '', file.originalname || '');
    const doc = await createAndProcessDocument(
      agentId,
      workspaceId,
      file.buffer,
      file.originalname || 'document',
      mimeType
    );
    return res.status(201).json({ document: doc });
  } catch (error: any) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/documents/train:
 *   post:
 *     summary: Train pending documents
 *     tags: [Documents]
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
 *       200: { description: { trained } }
 */
router.post('/:workspaceId/agents/:agentId/documents/train', async (req, res) => {
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

    const trained = await trainPendingDocuments(agentId);
    return res.json({ trained });
  } catch (error: any) {
    console.error('Train documents error:', error);
    res.status(500).json({ error: error.message || 'Training failed' });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}/agents/{agentId}/documents/{documentId}:
 *   delete:
 *     summary: Delete document
 *     tags: [Documents]
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
 *         name: documentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Deleted }
 */
/** GET extracted text content of a single document. */
router.get('/:workspaceId/agents/:agentId/documents/:documentId/content', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const doc = await prisma.agentDocument.findFirst({
      where: { id: documentId, agentId },
      select: { id: true, fileName: true, mimeType: true, content: true, status: true },
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    return res.json({ content: doc.content ?? '', fileName: doc.fileName, mimeType: doc.mimeType, status: doc.status });
  } catch (error: any) {
    console.error('Get document content error:', error);
    res.status(500).json({ error: 'Failed to get document content' });
  }
});

/** PUT (replace) extracted text content of a document and mark it pending re-training. */
router.put('/:workspaceId/agents/:agentId/documents/:documentId/content', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const { content } = req.body;
    if (typeof content !== 'string') return res.status(400).json({ error: 'content must be a string' });

    const doc = await prisma.agentDocument.findFirst({ where: { id: documentId, agentId } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const updated = await prisma.agentDocument.update({
      where: { id: documentId },
      data: { content, status: 'PENDING', errorMessage: null },
    });
    return res.json({ document: { id: updated.id, status: updated.status.toLowerCase() } });
  } catch (error: any) {
    console.error('Update document content error:', error);
    res.status(500).json({ error: 'Failed to update document content' });
  }
});

router.delete('/:workspaceId/agents/:agentId/documents/:documentId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const documentId = parseInt(req.params.documentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId) || isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const deleted = await deleteDocument(documentId, agentId);
    if (!deleted) return res.status(404).json({ error: 'Document not found' });
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
