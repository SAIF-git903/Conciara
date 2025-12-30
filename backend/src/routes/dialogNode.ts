import express from 'express';
import {
  getNodesByTreeId,
  getNodeById,
  createDialogNode,
  updateDialogNode,
  deleteDialogNode,
} from '../services/dialogService.js';

const router = express.Router();

// Get all nodes for a tree
router.get('/tree/:treeId', async (req, res) => {
  try {
    const treeId = parseInt(req.params.treeId);
    const nodes = await getNodesByTreeId(treeId);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching dialog nodes:', error);
    res.status(500).json({ error: 'Failed to fetch dialog nodes' });
  }
});

// Get node by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const node = await getNodeById(id);
    
    if (!node) {
      return res.status(404).json({ error: 'Dialog node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error fetching dialog node:', error);
    res.status(500).json({ error: 'Failed to fetch dialog node' });
  }
});

// Create new dialog node
router.post('/', async (req, res) => {
  try {
    const { tree_id, parent_id, user_input, bot_response, generate_embedding } = req.body;
    
    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required' });
    }
    
    const node = await createDialogNode(
      tree_id,
      parent_id || null,
      user_input || null,
      bot_response || null,
      generate_embedding !== false
    );
    
    res.status(201).json(node);
  } catch (error) {
    console.error('Error creating dialog node:', error);
    res.status(500).json({ error: 'Failed to create dialog node' });
  }
});

// Update dialog node
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_input, bot_response, generate_embedding } = req.body;
    
    const node = await updateDialogNode(
      id,
      user_input || null,
      bot_response || null,
      generate_embedding !== false
    );
    
    if (!node) {
      return res.status(404).json({ error: 'Dialog node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error updating dialog node:', error);
    res.status(500).json({ error: 'Failed to update dialog node' });
  }
});

// Delete dialog node
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteDialogNode(id);
    res.json({ message: 'Dialog node deleted successfully' });
  } catch (error) {
    console.error('Error deleting dialog node:', error);
    res.status(500).json({ error: 'Failed to delete dialog node' });
  }
});

export default router;

