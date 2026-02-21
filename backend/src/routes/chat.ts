import express from 'express';
import { processChatMessage, getConversationHistory, resetSession } from '../services/chatService.js';

const router = express.Router();

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Process a chat message
 *     description: Send a user message to a dialog tree and get a bot response
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       200:
 *         description: Chat message processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Invalid request (missing tree_id or user_message)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/message', async (req, res) => {
  try {
    const { tree_id, user_message, session_id, user_id, use_memory, language } = req.body;

    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required and must be a number' });
    }

    if (!user_message || typeof user_message !== 'string') {
      return res.status(400).json({ error: 'user_message is required and must be a string' });
    }

    const response = await processChatMessage(
      tree_id,
      user_message,
      session_id || null,
      user_id || null,
      use_memory !== false, // Default to true, can be disabled
      true, // enableTracing
      typeof language === 'string' && language.trim() ? language.trim() : null
    );
    res.json(response);
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Get conversation history
 *     description: Retrieve the conversation history for a specific session
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID to retrieve history for
 *     responses:
 *       200:
 *         description: Conversation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   session_id:
 *                     type: string
 *                   user_message:
 *                     type: string
 *                   bot_response:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/chat/reset:
 *   post:
 *     summary: Reset conversation session
 *     description: Reset/clear a conversation session
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_id:
 *                 type: string
 *             required:
 *               - session_id
 *     responses:
 *       200:
 *         description: Session reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session reset successfully
 *                 session_id:
 *                   type: string
 *       400:
 *         description: Invalid request (missing session_id)
 *       500:
 *         description: Server error
 */
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

