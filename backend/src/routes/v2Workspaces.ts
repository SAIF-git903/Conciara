/**
 * v2 Workspace & Agent API.
 * Used only by v2 UI. Requires auth; enforces owner/member access.
 */

import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getAgentsForWorkspace,
  canManageAgentsInWorkspace,
  createWorkspace,
  createAgent,
  canManageAgent,
} from '../services/workspaceService.js';
import { crawlAndStore, getLatestCrawlForWorkspace } from '../services/crawlService.js';
import { generatePrePromptFromWebsiteContent, chatCompletion, chatCompletionStream } from '../services/llmService.js';
import { createAndProcessDocument, listDocumentsByAgent, deleteDocument, trainPendingDocuments } from '../services/agentDocumentService.js';
import { retrieveChunks } from '../services/agentRagService.js';
import { prisma } from '../db/prisma.js';
import { isSupportedMimeType, resolveMimeType } from '../services/documentParserService.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    const ext = (file.originalname || '').toLowerCase().replace(/^.*\./, '') || '';
    const allowedExts = ['pdf', 'docx', 'doc', 'txt', 'md'];
    const ok = isSupportedMimeType(mime) || (ext && allowedExts.includes(ext));
    if (ok) cb(null, true);
    else cb(new Error('Unsupported file type. Use PDF, DOCX, TXT, or MD.'));
  },
});

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

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/documents
 * List documents (training files) for an agent.
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
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/documents
 * Upload a file for training (multipart/form-data, field: file).
 */
router.post('/:workspaceId/agents/:agentId/documents', upload.single('file'), async (req, res) => {
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
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/documents/train
 * Process all pending documents (chunk + embed) so the LLM can use them.
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
 * DELETE /api/v2/workspaces/:workspaceId/agents/:agentId/documents/:documentId
 */
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

/**
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/chat
 * Send a message and get an AI response using agent's model, prePrompt, and RAG context.
 * Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 */
router.post('/:workspaceId/agents/:agentId/chat', async (req, res) => {
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

    const { message, history } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyList = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const chunks = await retrieveChunks(agentId, userMessage, 10);
    const contextBlock =
      chunks.length > 0
        ? `\n\nUse the following relevant excerpts from the agent's training data to answer. If the answer is not in the context, say so.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
        : '';

    const systemContent = `${agent.prePrompt || 'You are a helpful assistant.'}${contextBlock}`;
    const modelId = agent.model || 'gpt-4o-mini';
    const reply = await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
      maxTokens: 1024,
      temperature: 0.7,
    });

    return res.json({ message: reply });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

/**
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/chat/stream
 * Same as /chat but streams the reply as SSE (data: {"content":"..."} then data: [DONE]).
 */
router.post('/:workspaceId/agents/:agentId/chat/stream', async (req, res) => {
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

    const { message, history } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyList = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const chunks = await retrieveChunks(agentId, userMessage, 10);
    const contextBlock =
      chunks.length > 0
        ? `\n\nUse the following relevant excerpts from the agent's training data to answer. If the answer is not in the context, say so.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
        : '';

    const systemContent = `${agent.prePrompt || 'You are a helpful assistant.'}${contextBlock}`;
    const modelId = agent.model || 'gpt-4o-mini';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      for await (const chunk of chatCompletionStream(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
        maxTokens: 1024,
        temperature: 0.7,
      })) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
      res.write('data: [DONE]\n\n');
    } catch (streamErr: any) {
      console.error('Agent chat stream error:', streamErr);
      res.write(`data: ${JSON.stringify({ error: streamErr.message || 'Stream failed' })}\n\n`);
    }
    res.end();
  } catch (error: any) {
    console.error('Agent chat stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Chat failed' });
    } else {
      res.end();
    }
  }
});

export default router;
