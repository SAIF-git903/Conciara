import express from 'express';
import {
  getAllCustomerTypes,
  getCustomerTypeById,
  createCustomerType,
  updateCustomerType,
  deleteCustomerType,
} from '../services/multiTenantService.js';

const router = express.Router();

/**
 * @swagger
 * /api/customer-type:
 *   get:
 *     summary: Get all customer types
 *     description: Retrieve all customer types
 *     tags: [Customer Types]
 *     responses:
 *       200:
 *         description: List of customer types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/customer-type/{id}:
 *   get:
 *     summary: Get customer type by ID
 *     description: Retrieve a specific customer type by its ID
 *     tags: [Customer Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer type ID
 *     responses:
 *       200:
 *         description: Customer type retrieved successfully
 *       404:
 *         description: Customer type not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/customer-type:
 *   post:
 *     summary: Create a new customer type
 *     description: Create a new customer type
 *     tags: [Customer Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Customer type created successfully
 *       400:
 *         description: Invalid input (name is required)
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/customer-type/{id}:
 *   put:
 *     summary: Update a customer type
 *     description: Update an existing customer type
 *     tags: [Customer Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer type ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: Customer type updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer type not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/customer-type/{id}:
 *   delete:
 *     summary: Delete a customer type
 *     description: Delete a customer type and all associated data
 *     tags: [Customer Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer type ID
 *     responses:
 *       200:
 *         description: Customer type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Customer type and all associated data deleted successfully
 *       404:
 *         description: Customer type not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteCustomerType(id);
    res.json({ message: 'Customer type and all associated data deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer type:', error);
    if (error.message === 'Customer type not found') {
      return res.status(404).json({ error: 'Customer type not found' });
    }
    res.status(500).json({ error: 'Failed to delete customer type', details: error?.message || 'Unknown error' });
  }
});

export default router;

