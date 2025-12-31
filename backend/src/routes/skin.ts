import express from 'express';
import {
  getSkinsByWebsite,
  getSkinById,
  createSkin,
  updateSkin,
  deleteSkin,
} from '../services/multiTenantService.js';

const router = express.Router();

router.get('/website/:websiteId', async (req, res) => {
  try {
    const websiteId = parseInt(req.params.websiteId);
    const skins = await getSkinsByWebsite(websiteId);
    res.json(skins);
  } catch (error: any) {
    console.error('Error fetching skins:', error);
    res.status(500).json({ 
      error: 'Failed to fetch skins',
      details: error?.message || 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const skin = await getSkinById(id);
    
    if (!skin) {
      return res.status(404).json({ error: 'Skin not found' });
    }
    
    res.json(skin);
  } catch (error) {
    console.error('Error fetching skin:', error);
    res.status(500).json({ error: 'Failed to fetch skin' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { website_id, name, description, theme_config } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!website_id || typeof website_id !== 'number') {
      return res.status(400).json({ error: 'Website ID is required' });
    }
    
    const skin = await createSkin(website_id, name, description, theme_config);
    res.status(201).json(skin);
  } catch (error) {
    console.error('Error creating skin:', error);
    res.status(500).json({ error: 'Failed to create skin' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, theme_config } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const skin = await updateSkin(id, name, description, theme_config);
    
    if (!skin) {
      return res.status(404).json({ error: 'Skin not found' });
    }
    
    res.json(skin);
  } catch (error) {
    console.error('Error updating skin:', error);
    res.status(500).json({ error: 'Failed to update skin' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteSkin(id);
    res.json({ message: 'Skin deleted successfully' });
  } catch (error) {
    console.error('Error deleting skin:', error);
    res.status(500).json({ error: 'Failed to delete skin' });
  }
});

export default router;

