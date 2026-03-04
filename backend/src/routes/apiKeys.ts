/**
 * API Key Management Routes
 * Create, list, and revoke API keys
 */

import express from 'express';
import { pool } from '../db/connection.js';
import { createAPIKey, revokeAPIKey } from '../services/authService.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: List API keys
 *     description: List API keys. Users see their own keys, owners see all keys.
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   userEmail:
 *                     type: string
 *                     nullable: true
 *                   name:
 *                     type: string
 *                   permissions:
 *                     type: array
 *                     items:
 *                       type: string
 *                   lastUsedAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   expiresAt:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   isActive:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const currentUser = req.user!;
    const isOwner = currentUser.role === 'owner';

    let query: string;
    let params: any[];

    if (isOwner) {
      // Owner can see all keys
      query = `
        SELECT 
          ak.id,
          ak.user_id,
          ak.name,
          ak.permissions,
          ak.last_used_at,
          ak.expires_at,
          ak.is_active,
          ak.created_at,
          u.email as user_email
        FROM api_keys ak
        LEFT JOIN users u ON ak.user_id = u.id
        ORDER BY ak.created_at DESC
      `;
      params = [];
    } else {
      // Regular users can only see their own keys
      query = `
        SELECT 
          id,
          user_id,
          name,
          permissions,
          last_used_at,
          expires_at,
          is_active,
          created_at
        FROM api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      params = [currentUser.id];
    }

    const result = await pool.query(query, params);

    const keys = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email || null,
      name: row.name,
      permissions: row.permissions || [],
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));

    res.json(keys);
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys', details: error.message });
  }
});

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create a new API key
 *     description: |
 *       Create a new API key. The full key is only returned once in the response.
 *       Default permissions are assigned based on user role if not specified.
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [chat:read, chat:write, tree:read, tree:write, node:read, node:write, skin:read, skin:write, website:read, website:write, conversation:read, trace:read, '*']
 *                 description: Array of permissions. If not provided, defaults based on role.
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: API key created successfully. ⚠️ Save the key now - it won't be shown again.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 key:
 *                   type: string
 *                   description: The full API key (only shown once!)
 *                 name:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or invalid permission
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const currentUser = req.user!;
    const { name, permissions, expiresAt } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate permissions if provided
    const validPermissions = [
      'chat:read',
      'chat:write',
      'tree:read',
      'tree:write',
      'node:read',
      'node:write',
      'skin:read',
      'skin:write',
      'website:read',
      'website:write',
      'conversation:read',
      'trace:read',
      '*', // All permissions
    ];

    const permissionsArray = Array.isArray(permissions) ? permissions : [];
    
    // If no permissions specified, use user's role permissions
    let finalPermissions = permissionsArray;
    if (permissionsArray.length === 0) {
      // Default permissions based on role
      if (currentUser.role === 'owner') {
        finalPermissions = ['*'];
      } else {
        finalPermissions = ['chat:read', 'chat:write', 'tree:read', 'tree:write'];
      }
    }

    // Validate permissions
    for (const perm of finalPermissions) {
      if (!validPermissions.includes(perm)) {
        return res.status(400).json({ 
          error: `Invalid permission: ${perm}`,
          validPermissions
        });
      }
    }

    // Parse expiration date if provided
    let expiresAtDate: Date | undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({ error: 'Invalid expiration date' });
      }
    }

    // Create API key
    const { key, apiKeyId } = await createAPIKey(
      currentUser.id,
      name,
      finalPermissions
    );

    // Update expiration if provided
    if (expiresAtDate) {
      await pool.query(
        `UPDATE api_keys SET expires_at = $1 WHERE id = $2`,
        [expiresAtDate, apiKeyId]
      );
    }

    // Return the key (only shown once!)
    res.status(201).json({
      id: apiKeyId,
      key, // ⚠️ This is the only time the full key is returned
      name,
      permissions: finalPermissions,
      expiresAt: expiresAtDate || null,
      message: '⚠️ Save this API key now. It will not be shown again.',
    });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key', details: error.message });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: Revoke (delete) an API key. Users can only revoke their own keys, owners can revoke any.
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: API key revoked successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: API key not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const apiKeyId = parseInt(req.params.id);
    const currentUser = req.user!;
    const isOwner = currentUser.role === 'owner';

    // Check if key exists and belongs to user (unless owner)
    const keyResult = await pool.query(
      `SELECT user_id FROM api_keys WHERE id = $1`,
      [apiKeyId]
    );

    if (keyResult.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const keyUserId = keyResult.rows[0].user_id;

    // Users can only revoke their own keys (unless owner)
    if (!isOwner && keyUserId !== currentUser.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await revokeAPIKey(apiKeyId, isOwner ? undefined : currentUser.id);

    res.json({ message: 'API key revoked successfully' });
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key', details: error.message });
  }
});

export default router;
