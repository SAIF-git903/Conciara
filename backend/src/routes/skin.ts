import express from 'express';
import {
  getSkinsByWebsite,
  getSkinById,
  createSkin,
  updateSkin,
  deleteSkin,
} from '../services/multiTenantService.js';

const router = express.Router();

/**
 * @swagger
 * /api/skin/website/{websiteId}:
 *   get:
 *     summary: Get skins by website ID
 *     description: Retrieve all skins for a specific website
 *     tags: [Skins]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Website ID
 *     responses:
 *       200:
 *         description: List of skins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Skin'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/skin/{id}:
 *   get:
 *     summary: Get skin by ID
 *     description: Retrieve a specific skin by its ID
 *     tags: [Skins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Skin ID
 *     responses:
 *       200:
 *         description: Skin retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Skin'
 *       404:
 *         description: Skin not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/skin:
 *   post:
 *     summary: Create a new skin
 *     description: Create a new skin with theme configuration
 *     tags: [Skins]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               website_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               theme_config:
 *                 type: object
 *                 description: Theme configuration object
 *             required:
 *               - website_id
 *               - name
 *     responses:
 *       201:
 *         description: Skin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Skin'
 *       400:
 *         description: Invalid input (website_id and name are required)
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/skin/{id}:
 *   put:
 *     summary: Update a skin
 *     description: Update an existing skin
 *     tags: [Skins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Skin ID
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
 *               theme_config:
 *                 type: object
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: Skin updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Skin'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Skin not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/skin/{id}:
 *   delete:
 *     summary: Delete a skin
 *     description: Delete a skin by ID
 *     tags: [Skins]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Skin ID
 *     responses:
 *       200:
 *         description: Skin deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Skin deleted successfully
 *       500:
 *         description: Server error
 */
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

