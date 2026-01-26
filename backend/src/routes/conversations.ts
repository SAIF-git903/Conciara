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

const router = express.Router();

// Get all conversations with pagination
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const treeId = req.query.treeId ? parseInt(req.query.treeId as string) : undefined;
    const userId = req.query.userId as string | undefined;

    const conversations = await getAllConversations(limit, offset, treeId, userId);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      details: error.message,
    });
  }
});

// Get conversation details by session ID
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
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

// Search conversations
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const conversations = await searchConversations(term, limit);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error searching conversations:', error);
    res.status(500).json({
      error: 'Failed to search conversations',
      details: error.message,
    });
  }
});

// Get conversation tree for a session
router.get('/:sessionId/tree', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rebuild = req.query.rebuild === 'true';

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
