import express from 'express';
import { traceService } from '../services/traceService.js';

const router = express.Router();

// Get trace by ID
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

// Get all traces for a session
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

// Get latest trace for a session
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

// Get all traces (for admin/debugging)
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
