import express from 'express';
import {
  getAllDialogTrees,
  getDialogTreeById,
  createDialogTree,
  updateDialogTree,
  deleteDialogTree,
} from '../services/dialogService.js';

const router = express.Router();

// Get all dialog trees (optionally filtered by ab_variation_id)
router.get('/', async (req, res) => {
  try {
    const abVariationId = req.query.ab_variation_id ? parseInt(req.query.ab_variation_id as string) : undefined;
    console.log(`[GET /dialog-tree] ab_variation_id query param: ${req.query.ab_variation_id}, parsed: ${abVariationId}`);
    const trees = await getAllDialogTrees(abVariationId);
    console.log(`[GET /dialog-tree] Returning ${trees.length} trees`);
    res.json(trees);
  } catch (error: any) {
    console.error('Error fetching dialog trees:', error);
    const errorMessage = error?.message || 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch dialog trees',
      details: errorMessage,
      hint: 'Make sure PostgreSQL is running and migrations have been run (npm run migrate)'
    });
  }
});

// Get dialog tree by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tree = await getDialogTreeById(id);
    
    if (!tree) {
      return res.status(404).json({ error: 'Dialog tree not found' });
    }
    
    res.json(tree);
  } catch (error) {
    console.error('Error fetching dialog tree:', error);
    res.status(500).json({ error: 'Failed to fetch dialog tree' });
  }
});

// Create new dialog tree
router.post('/', async (req, res) => {
  try {
    const { name, description, ab_variation_id } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const tree = await createDialogTree(name, description, ab_variation_id);
    res.status(201).json(tree);
  } catch (error) {
    console.error('Error creating dialog tree:', error);
    res.status(500).json({ error: 'Failed to create dialog tree' });
  }
});

// Update dialog tree
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const tree = await updateDialogTree(id, name, description);
    
    if (!tree) {
      return res.status(404).json({ error: 'Dialog tree not found' });
    }
    
    res.json(tree);
  } catch (error) {
    console.error('Error updating dialog tree:', error);
    res.status(500).json({ error: 'Failed to update dialog tree' });
  }
});

// Delete dialog tree
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteDialogTree(id);
    res.json({ message: 'Dialog tree deleted successfully' });
  } catch (error) {
    console.error('Error deleting dialog tree:', error);
    res.status(500).json({ error: 'Failed to delete dialog tree' });
  }
});

export default router;

