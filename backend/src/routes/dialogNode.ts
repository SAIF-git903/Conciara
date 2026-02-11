import express from 'express';
import {
  getNodesByTreeId,
  getNodeById,
  createDialogNode,
  updateDialogNode,
  deleteDialogNode,
} from '../services/dialogService.js';

const router = express.Router();

/**
 * @swagger
 * /api/dialog-node/tree/{treeId}:
 *   get:
 *     summary: Get all nodes for a dialog tree
 *     description: Retrieve all dialog nodes belonging to a specific dialog tree
 *     tags: [Dialog Nodes]
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog tree ID
 *     responses:
 *       200:
 *         description: List of dialog nodes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DialogNode'
 *       500:
 *         description: Server error
 */
router.get('/tree/:treeId', async (req, res) => {
  try {
    const treeId = parseInt(req.params.treeId);
    const nodes = await getNodesByTreeId(treeId);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching dialog nodes:', error);
    res.status(500).json({ error: 'Failed to fetch dialog nodes' });
  }
});

/**
 * @swagger
 * /api/dialog-node/{id}:
 *   get:
 *     summary: Get dialog node by ID
 *     description: Retrieve a specific dialog node by its ID
 *     tags: [Dialog Nodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog node ID
 *     responses:
 *       200:
 *         description: Dialog node retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogNode'
 *       404:
 *         description: Dialog node not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const node = await getNodeById(id);
    
    if (!node) {
      return res.status(404).json({ error: 'Dialog node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error fetching dialog node:', error);
    res.status(500).json({ error: 'Failed to fetch dialog node' });
  }
});

/**
 * @swagger
 * /api/dialog-node:
 *   post:
 *     summary: Create a new dialog node
 *     description: Create a new dialog node in a dialog tree
 *     tags: [Dialog Nodes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tree_id:
 *                 type: integer
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *               user_input:
 *                 type: string
 *                 nullable: true
 *               bot_response:
 *                 type: string
 *                 nullable: true
 *               generate_embedding:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - tree_id
 *     responses:
 *       201:
 *         description: Dialog node created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogNode'
 *       400:
 *         description: Invalid input (tree_id is required)
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { tree_id, parent_id, user_input, bot_response, generate_embedding } = req.body;
    
    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required' });
    }
    
    const node = await createDialogNode(
      tree_id,
      parent_id || null,
      user_input || null,
      bot_response || null,
      generate_embedding !== false
    );
    
    res.status(201).json(node);
  } catch (error) {
    console.error('Error creating dialog node:', error);
    res.status(500).json({ error: 'Failed to create dialog node' });
  }
});

/**
 * @swagger
 * /api/dialog-node/{id}:
 *   put:
 *     summary: Update a dialog node
 *     description: Update an existing dialog node
 *     tags: [Dialog Nodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog node ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_input:
 *                 type: string
 *                 nullable: true
 *               bot_response:
 *                 type: string
 *                 nullable: true
 *               generate_embedding:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Dialog node updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DialogNode'
 *       404:
 *         description: Dialog node not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_input, bot_response, generate_embedding } = req.body;
    
    const node = await updateDialogNode(
      id,
      user_input || null,
      bot_response || null,
      generate_embedding !== false
    );
    
    if (!node) {
      return res.status(404).json({ error: 'Dialog node not found' });
    }
    
    res.json(node);
  } catch (error) {
    console.error('Error updating dialog node:', error);
    res.status(500).json({ error: 'Failed to update dialog node' });
  }
});

/**
 * @swagger
 * /api/dialog-node/{id}:
 *   delete:
 *     summary: Delete a dialog node
 *     description: Delete a dialog node by ID
 *     tags: [Dialog Nodes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog node ID
 *     responses:
 *       200:
 *         description: Dialog node deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Dialog node deleted successfully
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deleteDialogNode(id);
    res.json({ message: 'Dialog node deleted successfully' });
  } catch (error) {
    console.error('Error deleting dialog node:', error);
    res.status(500).json({ error: 'Failed to delete dialog node' });
  }
});

export default router;

