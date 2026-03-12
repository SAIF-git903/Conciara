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
