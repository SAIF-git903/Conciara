import express from 'express';
import {
  getAllDialogTrees,
  getDialogTreeById,
  createDialogTree,
  updateDialogTree,
  deleteDialogTree,
  getDialogTreesWithDomain,
} from '../services/dialogService.js';

const router = express.Router();

/** Base URL for the loader script (frontend origin). Set FRONTEND_URL in .env e.g. http://localhost:3002 */
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/+$/, '');
/** Public API base URL for data-api-url. Set API_PUBLIC_URL in .env e.g. http://localhost:3001/api */
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

function buildEmbedCode(treeId: number, domain: string | null): string {
  const loaderUrl = `${FRONTEND_URL}/loader.js`;
  const attrs = [`data-api-url="${API_PUBLIC_URL}"`, `data-tree-id="${treeId}"`];
  if (domain) attrs.push(`data-domain="${domain.replace(/"/g, '&quot;')}"`);
  return `<!-- ConversaTree Intelligent Chatbot Widget -->
<!-- Loader validates config with backend first; widget only loads if allowed -->
<script src="${loaderUrl}" ${attrs.join(' ')}></script>`;
}

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
      hint: 'Make sure PostgreSQL is running and migrations have been run (npm run migrate)',
    });
  }
});

/**
 * @swagger
 * /api/dialog-tree/embed-codes:
 *   get:
 *     summary: Get embed code for every dialog tree
 *     description: Returns an array of dialog trees with their HTML embed snippet (loader script + data attributes)
 *     tags: [Dialog Trees]
 *     responses:
 *       200:
 *         description: List of trees with embedCode and optional domain
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   treeId:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   domain:
 *                     type: string
 *                     nullable: true
 *                   embedCode:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get('/embed-codes', async (req, res) => {
  try {
    const trees = await getDialogTreesWithDomain();
    const payload = trees.map((t) => ({
      treeId: t.id,
      name: t.name,
      domain: t.domain ?? null,
      embedCode: buildEmbedCode(t.id, t.domain),
    }));
    res.json(payload);
  } catch (error: any) {
    console.error('Error fetching embed codes:', error);
    res.status(500).json({
      error: 'Failed to fetch embed codes',
      details: error?.message || 'Unknown error',
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
