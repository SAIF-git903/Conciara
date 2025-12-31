import express from 'express';
import {
  getABVariationsBySkin,
  getABVariationById,
  createABVariation,
  updateABVariation,
  deleteABVariation,
} from '../services/multiTenantService.js';

const router = express.Router();

router.get('/skin/:skinId', async (req, res) => {
  try {
    const skinId = parseInt(req.params.skinId);
    const variations = await getABVariationsBySkin(skinId);
    res.json(variations);
  } catch (error: any) {
    console.error('Error fetching A/B variations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch A/B variations',
      details: error?.message || 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const variation = await getABVariationById(id);
    
    if (!variation) {
      return res.status(404).json({ error: 'A/B variation not found' });
    }
    
    res.json(variation);
  } catch (error) {
    console.error('Error fetching A/B variation:', error);
    res.status(500).json({ error: 'Failed to fetch A/B variation' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { skin_id, name, description, variation_config, is_active } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!skin_id || typeof skin_id !== 'number') {
      return res.status(400).json({ error: 'Skin ID is required' });
    }
    
    const variation = await createABVariation(
      skin_id, 
      name, 
      description, 
      variation_config,
      is_active !== undefined ? is_active : true
    );
    res.status(201).json(variation);
  } catch (error) {
    console.error('Error creating A/B variation:', error);
    res.status(500).json({ error: 'Failed to create A/B variation' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, variation_config, is_active } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const variation = await updateABVariation(id, name, description, variation_config, is_active);
    
    if (!variation) {
      return res.status(404).json({ error: 'A/B variation not found' });
    }
    
    res.json(variation);
  } catch (error) {
    console.error('Error updating A/B variation:', error);
    res.status(500).json({ error: 'Failed to update A/B variation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteABVariation(id);
    res.json({ message: 'A/B variation deleted successfully' });
  } catch (error) {
    console.error('Error deleting A/B variation:', error);
    res.status(500).json({ error: 'Failed to delete A/B variation' });
  }
});

export default router;

