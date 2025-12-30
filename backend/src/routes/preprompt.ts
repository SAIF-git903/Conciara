import express from 'express';
import {
  getPrepromptByTreeId,
  createOrUpdatePreprompt,
  deletePreprompt,
} from '../services/dialogService.js';

const router = express.Router();

// Get preprompt by tree ID
router.get('/tree/:treeId', async (req, res) => {
  try {
    const treeId = parseInt(req.params.treeId);
    const preprompt = await getPrepromptByTreeId(treeId);
    res.json(preprompt);
  } catch (error) {
    console.error('Error fetching preprompt:', error);
    res.status(500).json({ error: 'Failed to fetch preprompt' });
  }
});

// Create or update preprompt
router.post('/', async (req, res) => {
  try {
    const { tree_id, content } = req.body;
    
    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required' });
    }
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }
    
    const preprompt = await createOrUpdatePreprompt(tree_id, content);
    res.status(201).json(preprompt);
  } catch (error) {
    console.error('Error saving preprompt:', error);
    res.status(500).json({ error: 'Failed to save preprompt' });
  }
});

// Delete preprompt
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deletePreprompt(id);
    res.json({ message: 'Preprompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting preprompt:', error);
    res.status(500).json({ error: 'Failed to delete preprompt' });
  }
});

export default router;

