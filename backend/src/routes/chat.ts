import express from 'express';
import { processChatMessage, getConversationHistory, resetSession } from '../services/chatService.js';

const router = express.Router();

// Process chat message
router.post('/message', async (req, res) => {
  try {
    const { tree_id, user_message, session_id } = req.body;

    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required and must be a number' });
    }

    if (!user_message || typeof user_message !== 'string') {
      return res.status(400).json({ error: 'user_message is required and must be a string' });
    }

    const response = await processChatMessage(tree_id, user_message, session_id || null);
    res.json(response);
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await getConversationHistory(sessionId);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversation history',
      details: error.message 
    });
  }
});

// Reset conversation session
router.post('/reset', async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({ error: 'session_id is required' });
    }

    await resetSession(session_id);
    res.json({ message: 'Session reset successfully', session_id });
  } catch (error: any) {
    console.error('Error resetting session:', error);
    res.status(500).json({ 
      error: 'Failed to reset session',
      details: error.message 
    });
  }
});

export default router;

