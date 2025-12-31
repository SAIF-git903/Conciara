import express from 'express';
import {
  getAllCustomerTypes,
  getCustomerTypeById,
  createCustomerType,
  updateCustomerType,
  deleteCustomerType,
} from '../services/multiTenantService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const customerTypes = await getAllCustomerTypes();
    res.json(customerTypes);
  } catch (error: any) {
    console.error('Error fetching customer types:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer types',
      details: error?.message || 'Unknown error'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customerType = await getCustomerTypeById(id);
    
    if (!customerType) {
      return res.status(404).json({ error: 'Customer type not found' });
    }
    
    res.json(customerType);
  } catch (error) {
    console.error('Error fetching customer type:', error);
    res.status(500).json({ error: 'Failed to fetch customer type' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const customerType = await createCustomerType(name, description);
    res.status(201).json(customerType);
  } catch (error) {
    console.error('Error creating customer type:', error);
    res.status(500).json({ error: 'Failed to create customer type' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const customerType = await updateCustomerType(id, name, description);
    
    if (!customerType) {
      return res.status(404).json({ error: 'Customer type not found' });
    }
    
    res.json(customerType);
  } catch (error) {
    console.error('Error updating customer type:', error);
    res.status(500).json({ error: 'Failed to update customer type' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteCustomerType(id);
    res.json({ message: 'Customer type deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer type:', error);
    res.status(500).json({ error: 'Failed to delete customer type' });
  }
});

export default router;

