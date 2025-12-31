import express from 'express';
import {
  getWebsitesByCustomerType,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  deleteWebsite,
} from '../services/multiTenantService.js';

const router = express.Router();

router.get('/customer-type/:customerTypeId', async (req, res) => {
  try {
    const customerTypeId = parseInt(req.params.customerTypeId);
    const websites = await getWebsitesByCustomerType(customerTypeId);
    res.json(websites);
  } catch (error: any) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ 
      error: 'Failed to fetch websites',
      details: error?.message || 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const website = await getWebsiteById(id);
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    console.error('Error fetching website:', error);
    res.status(500).json({ error: 'Failed to fetch website' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_type_id, name, description, domain } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!customer_type_id || typeof customer_type_id !== 'number') {
      return res.status(400).json({ error: 'Customer type ID is required' });
    }
    
    const website = await createWebsite(customer_type_id, name, description, domain);
    res.status(201).json(website);
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: 'Failed to create website' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, domain } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const website = await updateWebsite(id, name, description, domain);
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    console.error('Error updating website:', error);
    res.status(500).json({ error: 'Failed to update website' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteWebsite(id);
    res.json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: 'Failed to delete website' });
  }
});

export default router;

