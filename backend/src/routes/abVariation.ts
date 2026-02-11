import express from 'express';
import {
  getABVariationsBySkin,
  getABVariationById,
  createABVariation,
  updateABVariation,
  deleteABVariation,
} from '../services/multiTenantService.js';

const router = express.Router();

/**
 * @swagger
 * /api/ab-variation/skin/{skinId}:
 *   get:
 *     summary: Get A/B variations by skin ID
 *     description: Retrieve all A/B variations for a specific skin
 *     tags: [A/B Variations]
 *     parameters:
 *       - in: path
 *         name: skinId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Skin ID
 *     responses:
 *       200:
 *         description: List of A/B variations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   skin_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                     nullable: true
 *                   variation_config:
 *                     type: object
 *                   is_active:
 *                     type: boolean
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/ab-variation/{id}:
 *   get:
 *     summary: Get A/B variation by ID
 *     description: Retrieve a specific A/B variation by its ID
 *     tags: [A/B Variations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: A/B variation ID
 *     responses:
 *       200:
 *         description: A/B variation retrieved successfully
 *       404:
 *         description: A/B variation not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/ab-variation:
 *   post:
 *     summary: Create a new A/B variation
 *     description: Create a new A/B variation for a skin
 *     tags: [A/B Variations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skin_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               variation_config:
 *                 type: object
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - skin_id
 *               - name
 *     responses:
 *       201:
 *         description: A/B variation created successfully
 *       400:
 *         description: Invalid input (skin_id and name are required)
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/ab-variation/{id}:
 *   put:
 *     summary: Update an A/B variation
 *     description: Update an existing A/B variation
 *     tags: [A/B Variations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: A/B variation ID
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
 *               variation_config:
 *                 type: object
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: A/B variation updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: A/B variation not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/ab-variation/{id}:
 *   delete:
 *     summary: Delete an A/B variation
 *     description: Delete an A/B variation by ID
 *     tags: [A/B Variations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: A/B variation ID
 *     responses:
 *       200:
 *         description: A/B variation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: A/B variation deleted successfully
 *       500:
 *         description: Server error
 */
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

