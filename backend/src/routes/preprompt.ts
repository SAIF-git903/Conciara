import express from 'express';
import {
  getPrepromptByTreeId,
  createOrUpdatePreprompt,
  deletePreprompt,
} from '../services/dialogService.js';

const router = express.Router();

/**
 * @swagger
 * /api/preprompt/tree/{treeId}:
 *   get:
 *     summary: Get preprompt by tree ID
 *     description: Retrieve the preprompt for a specific dialog tree
 *     tags: [Preprompts]
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Dialog tree ID
 *     responses:
 *       200:
 *         description: Preprompt retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tree_id:
 *                   type: integer
 *                 content:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/tree/:treeId', async (req, res) => {
  try {
    const treeId = parseInt(req.params.treeId);
    const preprompt = await getPrepromptByTreeId(treeId);
    res.json(preprompt);
  } catch (error) {
    console.error('Error fetching preprompt:', error);
    res.status(500).json({ error: 'Failed to fetch preprompt' });
  }
});

/**
 * @swagger
 * /api/preprompt:
 *   post:
 *     summary: Create or update preprompt
 *     description: Create a new preprompt or update existing one for a dialog tree
 *     tags: [Preprompts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tree_id:
 *                 type: integer
 *               content:
 *                 type: string
 *             required:
 *               - tree_id
 *               - content
 *     responses:
 *       201:
 *         description: Preprompt created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 tree_id:
 *                   type: integer
 *                 content:
 *                   type: string
 *       400:
 *         description: Invalid input (tree_id and content are required)
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { tree_id, content } = req.body;
    
    if (!tree_id || typeof tree_id !== 'number') {
      return res.status(400).json({ error: 'tree_id is required' });
    }
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }
    
    const preprompt = await createOrUpdatePreprompt(tree_id, content);
    res.status(201).json(preprompt);
  } catch (error) {
    console.error('Error saving preprompt:', error);
    res.status(500).json({ error: 'Failed to save preprompt' });
  }
});

/**
 * @swagger
 * /api/preprompt/{id}:
 *   delete:
 *     summary: Delete preprompt
 *     description: Delete a preprompt by ID
 *     tags: [Preprompts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Preprompt ID
 *     responses:
 *       200:
 *         description: Preprompt deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Preprompt deleted successfully
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await deletePreprompt(id);
    res.json({ message: 'Preprompt deleted successfully' });
  } catch (error) {
    console.error('Error deleting preprompt:', error);
    res.status(500).json({ error: 'Failed to delete preprompt' });
  }
});

export default router;

