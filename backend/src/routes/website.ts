import express from 'express';
import {
  getWebsitesByCustomerType,
  getWebsiteById,
  getWebsitesByIds,
  createWebsite,
  updateWebsite,
  setWebsiteActive,
  deleteWebsite,
} from '../services/multiTenantService.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { assignUserToWebsite } from '../services/userService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/website/by-ids:
 *   get:
 *     summary: Get websites by IDs
 *     description: Retrieve multiple websites by their IDs (comma-separated or array)
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Comma-separated website IDs or array of IDs
 *     responses:
 *       200:
 *         description: List of websites
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Invalid request (ids parameter required)
 *       500:
 *         description: Server error
 */
router.get('/by-ids', async (req, res) => {
  try {
    const idsParam = req.query.ids;
    if (!idsParam) {
      return res.status(400).json({ error: 'ids parameter is required' });
    }
    
    // Parse IDs from query string (comma-separated) or array
    let ids: number[];
    if (Array.isArray(idsParam)) {
      ids = idsParam.map(id => parseInt(id as string)).filter(id => !isNaN(id));
    } else {
      ids = (idsParam as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    }
    
    if (ids.length === 0) {
      return res.json([]);
    }
    
    const websites = await getWebsitesByIds(ids);
    res.json(websites);
  } catch (error: any) {
    console.error('Error fetching websites by IDs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch websites',
      details: error?.message || 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/website/customer-type/{customerTypeId}:
 *   get:
 *     summary: Get websites by customer type
 *     description: Retrieve all websites for a specific customer type
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerTypeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer type ID
 *     responses:
 *       200:
 *         description: List of websites
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/website/{id}:
 *   get:
 *     summary: Get website by ID
 *     description: Retrieve a specific website by its ID
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Website ID
 *     responses:
 *       200:
 *         description: Website retrieved successfully
 *       404:
 *         description: Website not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/website:
 *   post:
 *     summary: Create a new website
 *     description: Create a new website (admin only). Optionally assign an editor user.
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_type_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               domain:
 *                 type: string
 *               editor_user_id:
 *                 type: integer
 *                 nullable: true
 *                 description: User ID to assign as manager for this website
 *             required:
 *               - customer_type_id
 *               - name
 *               - domain
 *     responses:
 *       201:
 *         description: Website created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Insufficient permissions (admin only)
 *       500:
 *         description: Server error
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { customer_type_id, name, description, domain, editor_user_id } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!customer_type_id || typeof customer_type_id !== 'number') {
      return res.status(400).json({ error: 'Customer type ID is required' });
    }
    
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    const website = await createWebsite(customer_type_id, name, description, domain);
    
    // If editor_user_id is provided, assign that user as manager for this website
    if (editor_user_id && typeof editor_user_id === 'number') {
      try {
        await assignUserToWebsite(editor_user_id, website.id, 'manager');
      } catch (error: any) {
        console.warn('Failed to assign manager to website:', error.message);
        // Don't fail website creation if assignment fails
      }
    }
    
    res.status(201).json(website);
  } catch (error: any) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: 'Failed to create website', details: error.message });
  }
});

/**
 * @swagger
 * /api/website/{id}:
 *   put:
 *     summary: Update a website
 *     description: Update an existing website
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Website ID
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
 *               domain:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: Website updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Website not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, domain, is_active } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const website = await updateWebsite(
      id,
      name,
      description,
      domain,
      typeof is_active === 'boolean' ? is_active : undefined
    );
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    console.error('Error updating website:', error);
    res.status(500).json({ error: 'Failed to update website' });
  }
});

/**
 * @swagger
 * /api/website/{id}:
 *   patch:
 *     summary: Toggle website active status
 *     description: Update the active status of a website
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Website ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *             required:
 *               - is_active
 *     responses:
 *       200:
 *         description: Website status updated successfully
 *       400:
 *         description: Invalid input (is_active must be boolean)
 *       404:
 *         description: Website not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    
    const website = await setWebsiteActive(id, is_active);
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    res.json(website);
  } catch (error) {
    console.error('Error toggling website active:', error);
    res.status(500).json({ error: 'Failed to update website' });
  }
});

/**
 * @swagger
 * /api/website/{id}:
 *   delete:
 *     summary: Delete a website
 *     description: Delete a website by ID
 *     tags: [Websites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Website ID
 *     responses:
 *       200:
 *         description: Website deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Website deleted successfully
 *       500:
 *         description: Server error
 */
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

