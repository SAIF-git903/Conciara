/**
 * User Management Routes
 * CRUD operations for users (owner only for list/create/delete/assign)
 */

import express from 'express';
import {
  getAllUsers,
  getUserById as getUserByIdService,
  createUser,
  updateUser,
  deleteUser,
  assignUserToWebsite,
  getUserWebsites,
  removeUserFromWebsite,
} from '../user.service.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users with their assigned websites (owner only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of users to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of users to skip
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         description: Insufficient permissions (owner only)
 *       500:
 *         description: Server error
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await getAllUsers(limit, offset);

    // Get websites for each user and build response
    const safeUsers = await Promise.all(
      users.map(async (user) => {
        const websites = await getUserWebsites(user.id);
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          websites,
        };
      })
    );

    res.json(safeUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by ID. Users can view their own profile, owners can view any.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user!;

    if (currentUser.role !== 'owner' && currentUser.id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get assigned websites
    const websites = await getUserWebsites(userId);

    // Remove password hash
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      websites,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with optional website assignment (owner only). Only members can be created via API.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [member]
 *                 default: member
 *               websiteId:
 *                 type: integer
 *                 description: Single website ID to assign (alternative to websiteIds)
 *               websiteIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of website IDs to assign
 *             required:
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or user already exists
 *       403:
 *         description: Insufficient permissions or cannot create owner via API
 *       500:
 *         description: Server error
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role, websiteId, websiteIds } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRole = role || 'member';
    if (userRole === 'owner') {
      return res.status(403).json({ error: 'Owners can only be created via signup' });
    }

    const user = await createUser({
      email,
      password,
      fullName,
      role: userRole,
    });

    // Assign user to website(s) if provided
    const websitesToAssign: number[] = [];
    if (websiteId) {
      websitesToAssign.push(websiteId);
    }
    if (websiteIds && Array.isArray(websiteIds)) {
      websitesToAssign.push(...websiteIds);
    }

    for (const wid of websitesToAssign) {
      await assignUserToWebsite(user.id, wid, userRole);
    }

    // Get assigned websites
    const assignedWebsites = await getUserWebsites(user.id);

    // Remove password hash
    res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      websites: assignedWebsites,
    });
  } catch (error: any) {
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user information. Users can update their own profile (except role), owners can update any.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, member]
 *                 description: Only owners can change role
 *               isActive:
 *                 type: boolean
 *                 description: Only owners can change active status
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user!;

    if (currentUser.role !== 'owner' && currentUser.id !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (currentUser.role !== 'owner' && req.body.role) {
      return res.status(403).json({ error: 'Cannot change role' });
    }
    if (currentUser.role !== 'owner' && req.body.isActive !== undefined) {
      return res.status(403).json({ error: 'Cannot change active status' });
    }

    const user = await updateUser(userId, req.body);

    // Remove password hash
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}/websites:
 *   put:
 *     summary: Assign user to websites
 *     description: Update website assignments for a user (owner only). Replaces all existing assignments.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               websiteIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of website IDs to assign
 *             required:
 *               - websiteIds
 *     responses:
 *       200:
 *         description: User websites updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 websites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Website'
 *       400:
 *         description: Invalid input (websiteIds must be an array)
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/:id/websites', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { websiteIds } = req.body;

    if (!Array.isArray(websiteIds)) {
      return res.status(400).json({ error: 'websiteIds must be an array' });
    }

    // Remove all existing assignments
    const currentWebsites = await getUserWebsites(userId);
    for (const website of currentWebsites) {
      await removeUserFromWebsite(userId, website.websiteId);
    }

    // Add new assignments
    const user = await getUserByIdService(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    for (const websiteId of websiteIds) {
      await assignUserToWebsite(userId, websiteId, user.role);
    }

    const updatedWebsites = await getUserWebsites(userId);

    res.json({
      message: 'User websites updated successfully',
      websites: updatedWebsites,
    });
  } catch (error: any) {
    console.error('Error updating user websites:', error);
    res.status(500).json({ error: 'Failed to update user websites', details: error.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user by ID (owner only). Cannot delete your own account.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       400:
 *         description: Cannot delete your own account
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (req.user!.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await deleteUser(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

export default router;
