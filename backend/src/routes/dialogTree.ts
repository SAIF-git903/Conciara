import express from 'express';
import {
  getAllDialogTrees,
  getDialogTreeById,
  createDialogTree,
  updateDialogTree,
  deleteDialogTree,
} from '../services/dialogService.js';

const router = express.Router();

/**
 * @swagger
 * /api/dialog-tree:
 *   get:
 *     summary: Get all dialog trees
 *     description: Retrieve all dialog trees, optionally filtered by A/B variation ID
 *     tags: [Dialog Trees]
 *     parameters:
 *       - in: query
 *         name: ab_variation_id
 *         schema:
 *           type: integer
 *         description: Filter by A/B variation ID
 *     responses:
 *       200:
 *         description: List of dialog trees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DialogTree'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const abVariationId = req.query.ab_variation_id ? parseInt(req.query.ab_variation_id as string) : undefined;
    const trees = await getAllDialogTrees(abVariationId);
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

/**
 * @swagger
 * /api/dialog-tree/{id}:
 *   get:
 *     summary: Get dialog tree by ID
 *     description: Retrieve a specific dialog tree by its ID
 *     tags: [Dialog Trees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog tree ID
 *     responses:
 *       200:
 *         description: Dialog tree retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogTree'
 *       404:
 *         description: Dialog tree not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/dialog-tree:
 *   post:
 *     summary: Create a new dialog tree
 *     description: Create a new dialog tree
 *     tags: [Dialog Trees]
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
 *               ab_variation_id:
 *                 type: integer
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Dialog tree created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogTree'
 *       400:
 *         description: Invalid input (name is required)
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/dialog-tree/{id}:
 *   put:
 *     summary: Update a dialog tree
 *     description: Update an existing dialog tree
 *     tags: [Dialog Trees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog tree ID
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
 *         description: Dialog tree updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogTree'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Dialog tree not found
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

/**
 * @swagger
 * /api/dialog-tree/{id}:
 *   delete:
 *     summary: Delete a dialog tree
 *     description: Delete a dialog tree by ID
 *     tags: [Dialog Trees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog tree ID
 *     responses:
 *       200:
 *         description: Dialog tree deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Dialog tree deleted successfully
 *       500:
 *         description: Server error
 */
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

