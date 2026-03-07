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
  deleteAgent,
} from '../services/workspaceService.js';
import {
  crawlAndStore,
  getLatestCrawlForWorkspace,
  listCrawlsByWorkspace,
  deleteCrawl,
  assignCrawlToAgent,
  getCrawlTrainingContentForAgent,
  getCrawlTrainingContentForAgentAfter,
  getCrawlStatsForAgent,
  hasCrawlsAfter,
  getLinkCountFromCrawlsAfter,
} from '../services/crawlService.js';
import { generatePrePromptFromWebsiteContent, chatCompletion, chatCompletionStream } from '../services/llmService.js';
import {
  createAndProcessDocument,
  listDocumentsByAgent,
  deleteDocument,
  trainPendingDocuments,
  trainCrawlContentForAgentWithProgress,
  appendCrawlContentToAgentDocument,
  getWebsiteCrawlTrainedStats,
  setWebsiteCrawlTrainedLinkCount,
} from '../services/agentDocumentService.js';
import { retrieveChunks } from '../services/agentRagService.js';
import {
  listQaByAgent,
  createQa,
  updateQa,
  deleteQa,
  retrieveQa,
  recordQaUsage,
  getQaUsageStats,
} from '../services/agentQaService.js';
import { prisma } from '../db/prisma.js';
import { isSupportedMimeType, resolveMimeType } from '../services/documentParserService.js';
import { uploadWidgetHeaderToS3, getPresignedUrl, injectPresignedWidgetHeaderIcon } from '../services/s3Service.js';
import {
  listSessionsByAgent,
  getSessionMessages,
  sessionBelongsToAgent,
  createOrGetSession,
  appendMessage,
} from '../services/agentChatLogService.js';
import {
  classifyIntent,
  isConversationalIntent,
  deriveSessionState,
  type AgentSessionState,
} from '../services/agentIntentService.js';

const router = express.Router();

/** Role-specific tone for system prompt (General, Support, Sales). */
const AGENT_ROLE_PROMPTS: Record<string, string> = {
  general: 'You are a helpful, informative assistant. Answer questions clearly and broadly. Be friendly and concise.',
  support:
    'You are a calm, reassuring customer support agent. Focus on helping with issues, orders, refunds, tracking, and problems. Be empathetic and solution-oriented.',
  sales:
    'You are a friendly, persuasive sales agent. Encourage purchase naturally without being pushy. Highlight benefits and offer clear next steps (e.g. order link, add to cart).',
};

/** Conversation rules appended to system prompt to avoid repetition and sound human. */
const CONVERSATION_RULES = `

Conversation rules (always follow):
- You are the virtual assistant FOR this business. Always speak in first-person plural as the brand. Say "you can contact us", "our support team", "we offer", "visit our website" — NEVER say "their", "the company", "the business", or refer to the brand in third person.
- Answer the user's actual question first. Only give contact/support details when the user explicitly asks how to contact, get support, or reach the team. When they ask about a product, price, or feature, answer only that from the context — do NOT lead with or add contact information unless they asked for it.
- If the context does not contain information that answers the question (e.g. a specific product or price), say so clearly and humanly: e.g. "I don't have information about that in my training", "I'm not sure about that product", "That's not in the info I have." Then you may briefly offer to help with something else or to put them in touch with support if they'd like.
- Do NOT repeat product details, prices, or support information that was already given earlier in the conversation.
- If the user is acknowledging or thanking (e.g. "thanks", "ok thanks"), respond in ONE short, friendly sentence (e.g. "You're welcome!", "Glad I could help!") and do not repeat recommendations.
- Keep responses short and natural: 1–2 sentences when possible. Behave like a human support or sales agent.
- Use conversation history to keep context; do not ask for information the user already provided.
- Format responses for readability: use **markdown** when it helps — bullet points (- or *) for lists (e.g. product features, contact options, specs), **bold** for key terms or prices, and line breaks between sections. Keep answers scannable like ChatGPT; avoid walls of plain text when listing multiple items.`;

/** Extra instructions when user intent is support/contact so the agent surfaces links and uses first person. */
const SUPPORT_INTENT_INSTRUCTIONS = `

When answering support or contact questions:
1. Use first person (we/us/our) — you speak AS the business.
2. Provide the most direct contact method first (WhatsApp link if available, then email, then phone).
3. Format WhatsApp as a markdown link: [Chat with us on WhatsApp](https://wa.me/...)
4. Keep the response short, friendly, and end with an offer to help further.`;

function getRolePrompt(role: string | null | undefined): string {
  const r = (role || 'general').toLowerCase();
  return AGENT_ROLE_PROMPTS[r] || AGENT_ROLE_PROMPTS.general;
}

interface AgentChatSystemParams {
  prePrompt: string | null;
  role: string | null;
  qaBlock: string;
  contextBlock: string;
  websiteBlock: string;
  sessionState: AgentSessionState;
  isConversational: boolean;
}

function buildAgentChatSystemContent(params: AgentChatSystemParams): string {
  const { prePrompt, role, qaBlock, contextBlock, websiteBlock, sessionState, isConversational } = params;
  const rolePrompt = getRolePrompt(role);
  const base = prePrompt?.trim() ? `${prePrompt}\n\n${rolePrompt}` : rolePrompt;

  if (isConversational) {
    const stateHint =
      sessionState.lastProductViewed && (sessionState.userIntent === 'thanks' || sessionState.userIntent === 'goodbye')
        ? `\n\nOptional: You may briefly mention they can ask again if they need help with "${sessionState.lastProductViewed}"—but keep it to one short sentence.`
        : '';
    return `${base}${CONVERSATION_RULES}${stateHint}`;
  }

  const supportBlock =
    sessionState.userIntent === 'support_request' ? SUPPORT_INTENT_INSTRUCTIONS : '';
  return `${base}${qaBlock}${contextBlock}${websiteBlock}${supportBlock}${CONVERSATION_RULES}`;
}

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

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB for header image
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/.test(mime);
    if (ok) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
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
 * DELETE /api/v2/workspaces/:workspaceId/crawls/:crawlId
 * Delete a website crawl. User must have access to the workspace.
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

    const deleted = await deleteCrawl(crawlId, workspaceId);
    if (!deleted) return res.status(404).json({ error: 'Crawl not found' });
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete crawl error:', error);
    res.status(500).json({ error: 'Failed to delete crawl', details: error?.message });
  }
});

/**
 * PATCH /api/v2/workspaces/:workspaceId/crawls/:crawlId
 * Assign a crawl to an agent (e.g. onboarding: link website crawl to the new agent). Body: { agentId }.
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
 * DELETE /api/v2/workspaces/:workspaceId/agents/:agentId
 * Permanently delete an agent and all its data. Cannot be undone.
 */
router.delete('/:workspaceId/agents/:agentId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    if (isNaN(workspaceId) || isNaN(agentId)) {
      return res.status(400).json({ error: 'Invalid workspace or agent ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgentsInWorkspace(userId, workspaceId);
    if (!canManage) return res.status(403).json({ error: 'Access denied to this workspace' });

    const deleted = await deleteAgent(agentId, workspaceId);
    if (!deleted) return res.status(404).json({ error: 'Agent not found' });
    return res.status(204).send();
  } catch (error: any) {
    console.error('Delete agent error:', error);
    res.status(500).json({ error: 'Failed to delete agent', details: error?.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/widget-config
 * Get the saved chat widget (skin) config for this agent. Returns null if not set.
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
 * PATCH /api/v2/workspaces/:workspaceId/agents/:agentId/widget-config
 * Save the chat widget (skin) config for this agent. Body: { config: SkinConfig }.
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
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/widget-header-image
 * Upload a header/avatar image for the chat widget. Multipart form field: file (image). Returns { url }.
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

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/chat-logs
 * List chat sessions for this agent. Query: limit?, offset?, search?
 */
router.get('/:workspaceId/agents/:agentId/chat-logs', async (req, res) => {
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

    const limit = Math.min(100, parseInt(String(req.query.limit || 50), 10) || 50);
    const offset = parseInt(String(req.query.offset || 0), 10) || 0;
    const search = typeof req.query.search === 'string' ? req.query.search : null;

    const sessions = await listSessionsByAgent(agentId, limit, offset, search);
    return res.json({ sessions });
  } catch (error: any) {
    console.error('Chat logs list error:', error);
    res.status(500).json({ error: 'Failed to load chat logs', details: error?.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/chat-logs/:sessionId
 * Get messages for a specific chat session.
 */
router.get('/:workspaceId/agents/:agentId/chat-logs/:sessionId', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    const agentId = parseInt(req.params.agentId, 10);
    const sessionId = req.params.sessionId;
    if (isNaN(workspaceId) || isNaN(agentId) || !sessionId) {
      return res.status(400).json({ error: 'Invalid workspace, agent, or session ID' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const canManage = await canManageAgent(userId, agentId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const belongs = await sessionBelongsToAgent(sessionId, agentId);
    if (!belongs) return res.status(404).json({ error: 'Session not found' });

    const messages = await getSessionMessages(agentId, sessionId);
    return res.json({ messages });
  } catch (error: any) {
    console.error('Chat log session error:', error);
    res.status(500).json({ error: 'Failed to load session', details: error?.message });
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
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/crawls
 * List website crawls for the agent (crawls linked to this agent or workspace-level).
 */
router.get('/:workspaceId/agents/:agentId/crawls', async (req, res) => {
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

    const crawls = await listCrawlsByWorkspace(workspaceId, agentId);
    return res.json({ crawls });
  } catch (error: any) {
    console.error('List crawls error:', error);
    res.status(500).json({ error: 'Failed to list crawls', details: error?.message });
  }
});

/** In-memory progress for crawl training (cleared when done). */
const crawlTrainingProgress = new Map<
  number,
  { trainedSizeBytesSoFar: number; trainedLinksSoFar: number; totalLinks: number }
>();

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/crawl-stats
 * Link count, crawl content size, trained size (TBD until trained), and optional training progress.
 */
router.get('/:workspaceId/agents/:agentId/crawl-stats', async (req, res) => {
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

    const { linkCount, crawlSizeBytes } = await getCrawlStatsForAgent(agentId);
    const { trainedSizeBytes, lastTrainedAt, trainedLinkCount } = await getWebsiteCrawlTrainedStats(agentId);
    const progress = crawlTrainingProgress.get(agentId);

    const lastTrainedAtDate = lastTrainedAt ? new Date(lastTrainedAt) : null;
    const hasNewCrawlsSinceTrain = await hasCrawlsAfter(agentId, lastTrainedAtDate);
    const hasUnappliedChanges =
      linkCount > 0 &&
      (trainedLinkCount === null ||
        trainedLinkCount === undefined ||
        linkCount !== trainedLinkCount ||
        hasNewCrawlsSinceTrain);

    const linksNotFedCount = hasNewCrawlsSinceTrain
      ? await getLinkCountFromCrawlsAfter(agentId, lastTrainedAtDate)
      : Math.max(0, linkCount - (trainedLinkCount ?? 0));

    return res.json({
      linkCount,
      crawlSizeBytes,
      totalLimitBytes: null,
      trainedSizeBytes: trainedSizeBytes ?? null,
      lastTrainedAt: lastTrainedAt ?? null,
      trainedLinkCount: trainedLinkCount ?? null,
      hasUnappliedChanges,
      linksNotFedCount,
      trainingInProgress: !!progress,
      trainedSizeBytesSoFar: progress?.trainedSizeBytesSoFar ?? null,
      trainedLinksSoFar: progress?.trainedLinksSoFar ?? null,
      totalLinksProgress: progress?.totalLinks ?? null,
    });
  } catch (error: any) {
    console.error('Crawl stats error:', error);
    res.status(500).json({ error: 'Failed to get crawl stats', details: error?.message });
  }
});

/**
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/train-from-crawls
 * Start feeding crawl content into the agent (chunk + embed). Returns immediately; progress via GET crawl-stats.
 */
router.post('/:workspaceId/agents/:agentId/train-from-crawls', async (req, res) => {
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

    if (crawlTrainingProgress.has(agentId)) {
      return res.status(409).json({ error: 'Training already in progress for this agent.' });
    }

    const { trainedSizeBytes: existingSize, lastTrainedAt, trainedLinkCount: baseTrainedLinkCount } =
      await getWebsiteCrawlTrainedStats(agentId);
    const lastTrainedAtDate = lastTrainedAt ? new Date(lastTrainedAt) : null;
    const { content: newContent, linkCount: newLinkCount } =
      lastTrainedAtDate != null
        ? await getCrawlTrainingContentForAgentAfter(agentId, lastTrainedAtDate)
        : { content: '', linkCount: 0 };

    const hasExistingDoc = lastTrainedAt != null;

    if (hasExistingDoc && newContent?.trim()) {
      const baseSize = existingSize ?? 0;
      const totalLinksAfter = (baseTrainedLinkCount ?? 0) + newLinkCount;
      crawlTrainingProgress.set(agentId, {
        trainedSizeBytesSoFar: baseSize,
        trainedLinksSoFar: baseTrainedLinkCount ?? 0,
        totalLinks: totalLinksAfter,
      });
      res.json({ started: true, message: 'Training started (feeding new links only). Poll crawl-stats for progress.' });

      setImmediate(async () => {
        try {
          await appendCrawlContentToAgentDocument(
            agentId,
            newContent,
            newLinkCount,
            (trainedChunks, totalChunks, cumulativeSizeBytes) => {
              const baseTrained = baseTrainedLinkCount ?? 0;
              const trainedLinksSoFar =
                totalChunks > 0
                  ? baseTrained + Math.min(newLinkCount, Math.round((trainedChunks / totalChunks) * newLinkCount))
                  : baseTrained;
              crawlTrainingProgress.set(agentId, {
                trainedSizeBytesSoFar: baseSize + cumulativeSizeBytes,
                trainedLinksSoFar,
                totalLinks: totalLinksAfter,
              });
            }
          );
          await setWebsiteCrawlTrainedLinkCount(agentId, totalLinksAfter);
        } catch (err) {
          console.error('Train from crawls background error:', err);
        } finally {
          crawlTrainingProgress.delete(agentId);
        }
      });
      return;
    }

    if (hasExistingDoc && !newContent?.trim()) {
      return res.json({ started: false, message: 'No new links to feed.' });
    }

    const crawlContent = await getCrawlTrainingContentForAgent(agentId);
    if (!crawlContent?.trim()) {
      return res.json({ started: false, message: 'No crawl content to train.' });
    }

    const { linkCount: totalLinks } = await getCrawlStatsForAgent(agentId);
    crawlTrainingProgress.set(agentId, {
      trainedSizeBytesSoFar: 0,
      trainedLinksSoFar: 0,
      totalLinks: Math.max(1, totalLinks),
    });
    res.json({ started: true, message: 'Training started. Poll crawl-stats for progress.' });

    setImmediate(async () => {
      try {
        await trainCrawlContentForAgentWithProgress(
          agentId,
          workspaceId,
          crawlContent,
          (trainedChunks, totalChunks, cumulativeSizeBytes) => {
            const cur = crawlTrainingProgress.get(agentId);
            const totalLinksForProgress = cur?.totalLinks ?? Math.max(1, totalLinks);
            const trainedLinksSoFar =
              totalChunks > 0
                ? Math.min(totalLinksForProgress, Math.round((trainedChunks / totalChunks) * totalLinksForProgress))
                : 0;
            crawlTrainingProgress.set(agentId, {
              trainedSizeBytesSoFar: cumulativeSizeBytes,
              trainedLinksSoFar,
              totalLinks: totalLinksForProgress,
            });
          }
        );
        const { linkCount: finalLinkCount } = await getCrawlStatsForAgent(agentId);
        await setWebsiteCrawlTrainedLinkCount(agentId, finalLinkCount);
      } catch (err) {
        console.error('Train from crawls background error:', err);
      } finally {
        crawlTrainingProgress.delete(agentId);
      }
    });
  } catch (error: any) {
    console.error('Train from crawls error:', error);
    res.status(500).json({ error: 'Training failed', details: (error as Error)?.message });
  }
});

/**
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/qa
 * List all Q&A entries for the agent.
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
 * POST /api/v2/workspaces/:workspaceId/agents/:agentId/qa
 * Create a Q&A entry. Body: { question: string, answer: string }
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
 * GET /api/v2/workspaces/:workspaceId/agents/:agentId/qa/:qaId/usage
 * Usage stats for chart (count per day). Query: days=30
 * Must be defined before PUT/DELETE .../qa/:qaId so /usage is matched.
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
 * PUT /api/v2/workspaces/:workspaceId/agents/:agentId/qa/:qaId
 * Update a Q&A entry. Body: { question?: string, answer?: string }
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
 * DELETE /api/v2/workspaces/:workspaceId/agents/:agentId/qa/:qaId
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

    const { message, history, sessionId: bodySessionId } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyList = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const intent = classifyIntent(userMessage);
    const sessionState = deriveSessionState(historyList, intent);
    const isConversational = isConversationalIntent(intent);

    let qaBlock = '';
    let contextBlock = '';
    let websiteBlock = '';
    let qaMatches: { id: number }[] = [];

    if (!isConversational) {
      const [chunks, qa] = await Promise.all([
        retrieveChunks(agentId, userMessage, 10),
        retrieveQa(agentId, userMessage, 5),
      ]);
      qaMatches = qa;
      qaBlock =
        qa.length > 0
          ? `\n\nPRIORITY – Use these exact answers when the user's question matches. Prefer them over other context.\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}\n\n`
          : '';
      contextBlock =
        chunks.length > 0
          ? `\n\nUse the following relevant excerpts from the agent's training data to answer. If the answer is not in the context, say so.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
          : '';
      // Crawl content is only used after user clicks "Retrain agent"; it is fed into RAG (chunks) then.
      websiteBlock = '';
    }

    const agentRole = (agent as { role?: string | null }).role ?? 'general';
    const systemContent = buildAgentChatSystemContent({
      prePrompt: agent.prePrompt,
      role: agentRole,
      qaBlock,
      contextBlock,
      websiteBlock,
      sessionState,
      isConversational,
    });

    const modelId = agent.model || 'gpt-4o-mini';
    const reply = await chatCompletion(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
      maxTokens: 1024,
      temperature: 0.7,
    });

    if (!isConversational && qaMatches.length > 0) {
      await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
    }

    const { sessionIdExternal, sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
    await appendMessage(sessionRowId, agentId, 'user', userMessage);
    await appendMessage(sessionRowId, agentId, 'assistant', reply);

    return res.json({ message: reply, sessionId: sessionIdExternal });
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

    const { message, history, sessionId: bodySessionId } = req.body;
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) {
      return res.status(400).json({ error: 'message is required' });
    }

    const historyList = Array.isArray(history)
      ? history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const intent = classifyIntent(userMessage);
    const sessionState = deriveSessionState(historyList, intent);
    const isConversational = isConversationalIntent(intent);

    let qaBlock = '';
    let contextBlock = '';
    let websiteBlock = '';
    let qaMatches: { id: number }[] = [];

    if (!isConversational) {
      const [chunks, qa] = await Promise.all([
        retrieveChunks(agentId, userMessage, 10),
        retrieveQa(agentId, userMessage, 5),
      ]);
      qaMatches = qa;
      qaBlock =
        qa.length > 0
          ? `\n\nPRIORITY – Use these exact answers when the user's question matches. Prefer them over other context.\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')}\n\n`
          : '';
      contextBlock =
        chunks.length > 0
          ? `\n\nUse the following relevant excerpts from the agent's training data to answer. If the answer is not in the context, say so.\n\n${chunks.map((c) => c.content).join('\n\n---\n\n')}`
          : '';
      // Crawl content is only used after user clicks "Retrain agent"; it is fed into RAG (chunks) then.
      websiteBlock = '';
    }

    const agentRole = (agent as { role?: string | null }).role ?? 'general';
    const systemContent = buildAgentChatSystemContent({
      prePrompt: agent.prePrompt,
      role: agentRole,
      qaBlock,
      contextBlock,
      websiteBlock,
      sessionState,
      isConversational,
    });

    const modelId = agent.model || 'gpt-4o-mini';

    if (!isConversational && qaMatches.length > 0) {
      await recordQaUsage(qaMatches.map((q) => q.id)).catch((err) => console.error('Record Q&A usage:', err));
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let fullReply = '';
    try {
      for await (const chunk of chatCompletionStream(modelId, systemContent, [...historyList, { role: 'user', content: userMessage }], {
        maxTokens: 1024,
        temperature: 0.7,
      })) {
        fullReply += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        if (typeof (res as any).flush === 'function') (res as any).flush();
      }
      const replyText = fullReply.trim();
      const { sessionIdExternal, sessionRowId } = await createOrGetSession(agentId, bodySessionId ?? null);
      await appendMessage(sessionRowId, agentId, 'user', userMessage);
      await appendMessage(sessionRowId, agentId, 'assistant', replyText);
      res.write(`data: ${JSON.stringify({ sessionId: sessionIdExternal })}\n\n`);
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
