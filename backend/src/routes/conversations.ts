import express from 'express';
import {
  getAllConversations,
  getConversationDetails,
  searchConversations,
} from '../services/conversationService.js';
import {
  buildConversationTree,
  loadConversationTree,
  saveConversationTree,
} from '../services/conversationTreeService.js';
import { traceService } from '../services/traceService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { setDomainFilter, getWebsiteIdFromSessionId } from '../middleware/domainMiddleware.js';
import { userHasWebsiteAccess } from '../services/userService.js';

const router = express.Router();

// All routes require authentication and domain filtering
router.use(requireAuth);
router.use(setDomainFilter);

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations
 *     description: |
 *       Get all conversations with pagination. Filters by user's assigned websites (editors) or shows all (admin).
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of conversations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of conversations to skip
 *       - in: query
 *         name: treeId
 *         schema:
 *           type: integer
 *         description: Filter by dialog tree ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: websiteId
 *         schema:
 *           type: integer
 *         description: Filter by website ID
 *     responses:
 *       200:
 *         description: List of conversations
 *       403:
 *         description: Access denied to this website
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const treeId = req.query.treeId ? parseInt(req.query.treeId as string) : undefined;
    const userId = req.query.userId as string | undefined;
    const websiteId = req.query.websiteId ? parseInt(req.query.websiteId as string) : undefined;

    // Get website IDs to filter by
    let websiteIds: number[] | null | undefined = req.allowedWebsiteIds;
    
    // If specific websiteId requested, filter to that (if user has access)
    if (websiteId) {
      if (req.isAdmin || (websiteIds && websiteIds.includes(websiteId))) {
        websiteIds = [websiteId];
      } else {
        return res.status(403).json({ error: 'Access denied to this website' });
      }
    }

    const conversations = await getAllConversations(limit, offset, treeId, userId, websiteIds);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/conversations/{sessionId}:
 *   get:
 *     summary: Get conversation details by session ID
 *     description: |
 *       Get conversation details for a specific session. Checks if user has access to the website for this conversation.
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Conversation details retrieved successfully
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check website access for this conversation
    if (!req.isAdmin) {
      const websiteId = await getWebsiteIdFromSessionId(sessionId);
      if (websiteId && !req.allowedWebsiteIds?.includes(websiteId)) {
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }
    }

    const conversation = await getConversationDetails(sessionId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error: any) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation details',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/conversations/search/{term}:
 *   get:
 *     summary: Search conversations
 *     description: |
 *       Search conversations by term. Filters by user's assigned websites (editors) or shows all (admin).
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: term
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of results to return
 *       - in: query
 *         name: websiteId
 *         schema:
 *           type: integer
 *         description: Filter by website ID
 *     responses:
 *       200:
 *         description: Search results
 *       403:
 *         description: Access denied to this website
 *       500:
 *         description: Server error
 */
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const websiteId = req.query.websiteId ? parseInt(req.query.websiteId as string) : undefined;

    // Get website IDs to filter by
    let websiteIds: number[] | null | undefined = req.allowedWebsiteIds;
    
    // If specific websiteId requested, filter to that (if user has access)
    if (websiteId) {
      if (req.isAdmin || (websiteIds && websiteIds.includes(websiteId))) {
        websiteIds = [websiteId];
      } else {
        return res.status(403).json({ error: 'Access denied to this website' });
      }
    }

    const conversations = await searchConversations(term, limit, websiteIds);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error searching conversations:', error);
    res.status(500).json({
      error: 'Failed to search conversations',
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/conversations/{sessionId}/tree:
 *   get:
 *     summary: Get conversation tree for a session
 *     description: |
 *       Get the conversation tree for a session. Checks if user has access to the website for this conversation.
 *       Can rebuild the tree from traces if rebuild=true.
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *       - in: query
 *         name: rebuild
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force rebuild tree from traces
 *     responses:
 *       200:
 *         description: Conversation tree retrieved successfully
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation or traces not found
 *       500:
 *         description: Server error
 */
router.get('/:sessionId/tree', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rebuild = req.query.rebuild === 'true';

    // Check website access for this conversation
    if (!req.isAdmin) {
      const websiteId = await getWebsiteIdFromSessionId(sessionId);
      if (websiteId && !req.allowedWebsiteIds?.includes(websiteId)) {
        return res.status(403).json({ error: 'Access denied to this conversation' });
      }
    }

    // Try to load from database first (unless rebuild requested)
    if (!rebuild) {
      const savedTree = await loadConversationTree(sessionId);
      if (savedTree) {
        return res.json(savedTree);
      }
    }

    // Build tree from traces
    const traces = await traceService.getSessionTraces(sessionId);
    if (traces.length === 0) {
      return res.status(404).json({ error: 'No traces found for this session' });
    }

    const tree = buildConversationTree(traces);
    if (!tree) {
      return res.status(404).json({ error: 'Could not build conversation tree' });
    }

    // Save to database for future use
    await saveConversationTree(tree);

    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching conversation tree:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation tree',
      details: error.message,
    });
  }
});

export default router;
