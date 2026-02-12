import express from 'express';
import { traceService } from '../services/traceService.js';

const router = express.Router();

/**
 * @swagger
 * /api/trace/{traceId}:
 *   get:
 *     summary: Get trace by ID
 *     description: Retrieve a specific trace by its ID
 *     tags: [Trace]
 *     parameters:
 *       - in: path
 *         name: traceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Trace ID
 *     responses:
 *       200:
 *         description: Trace retrieved successfully
 *       404:
 *         description: Trace not found
 *       500:
 *         description: Server error
 */
router.get('/:traceId', async (req, res) => {
  try {
    const { traceId } = req.params;
    const trace = await traceService.getTrace(traceId);
    
    if (!trace) {
      return res.status(404).json({ error: 'Trace not found' });
    }
    
    res.json(trace);
  } catch (error: any) {
    console.error('Error fetching trace:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trace',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/trace/session/{sessionId}:
 *   get:
 *     summary: Get all traces for a session
 *     description: Retrieve all traces for a specific session
 *     tags: [Trace]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: List of traces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const traces = await traceService.getSessionTraces(sessionId);
    res.json(traces);
  } catch (error: any) {
    console.error('Error fetching session traces:', error);
    res.status(500).json({ 
      error: 'Failed to fetch session traces',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/trace/session/{sessionId}/latest:
 *   get:
 *     summary: Get latest trace for a session
 *     description: Retrieve the most recent trace for a specific session
 *     tags: [Trace]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Latest trace retrieved successfully
 *       404:
 *         description: No traces found for session
 *       500:
 *         description: Server error
 */
router.get('/session/:sessionId/latest', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const trace = await traceService.getLatestTrace(sessionId);
    
    if (!trace) {
      return res.status(404).json({ error: 'No traces found for session' });
    }
    
    res.json(trace);
  } catch (error: any) {
    console.error('Error fetching latest trace:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest trace',
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/trace:
 *   get:
 *     summary: Get all traces
 *     description: Retrieve all traces (for admin/debugging purposes)
 *     tags: [Trace]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of traces to return
 *     responses:
 *       200:
 *         description: List of traces
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const traces = await traceService.getAllTraces(limit);
    res.json(traces);
  } catch (error: any) {
    console.error('Error fetching all traces:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traces',
      details: error.message 
    });
  }
});

export default router;
