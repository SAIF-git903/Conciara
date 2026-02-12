/**
 * Authentication Routes
 * Handles login, logout, registration, and token refresh
 */

import express from 'express';
import { getUserByEmail, updateLastLogin } from '../services/userService.js';
import { 
  verifyPassword, 
  generateJWT, 
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  revokeSession,
  getUserSessions,
  cleanupExpiredSessions
} from '../services/authService.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { pool } from '../db/connection.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password, returns JWT token and refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account is disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await updateLastLogin(user.id);

    // Get user's assigned websites
    const { getUserWebsites } = await import('../services/userService.js');
    const websites = await getUserWebsites(user.id);

    // Generate tokens
    const token = generateJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // Store refresh token in database (optional - for revocation)
    // Generate a unique session identifier
    const sessionId = `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      await pool.query(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5)`,
        [
          user.id,
          sessionId,
          refreshToken,
          req.ip || req.socket.remoteAddress,
          req.headers['user-agent'] || null,
        ]
      );
    } catch (error: any) {
      // If insert fails (e.g., unique constraint), log but don't fail login
      console.warn('Failed to store session:', error.message);
    }

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        websites,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logout user and invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    const userId = req.user?.id;

    if (refreshToken && userId) {
      // Revoke the specific refresh token
      try {
        await revokeRefreshToken(refreshToken, userId);
      } catch (error: any) {
        // If token doesn't exist or doesn't belong to user, continue anyway
        console.warn('Failed to revoke refresh token:', error.message);
      }
    } else if (refreshToken) {
      // Fallback: try to revoke without user check (for admin)
      await revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (deprecated)
 *     description: |
 *       Register a new user. This endpoint is deprecated - use POST /api/users instead.
 *       Admin users can only be created via database.
 *     tags: [Authentication]
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
 *                 enum: [manager]
 *             required:
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input or user already exists
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const { createUser } = await import('../services/userService.js');
    const user = await createUser({
      email,
      password,
      fullName,
      role: role || 'manager',
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     description: Returns the currently authenticated user's information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { getUserById, getUserWebsites } = await import('../services/userService.js');
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const websites = await getUserWebsites(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        websites,
      },
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token (checks JWT signature and revocation status)
    const payload = await verifyRefreshToken(refreshToken);

    // Get user
    const { getUserById } = await import('../services/userService.js');
    const user = await getUserById(payload.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const newToken = generateJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // Generate new session ID
    const newSessionId = `session_${payload.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update session
    await pool.query(
      `UPDATE user_sessions 
       SET session_token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '7 days'
       WHERE refresh_token = $3`,
      [newSessionId, newRefreshToken, refreshToken]
    );

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error: any) {
    if (error.message === 'Refresh token expired' || error.message === 'Invalid refresh token') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Change the password for the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid input (password too short or missing fields)
 *       401:
 *         description: Current password is incorrect or not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user
    const { getUserById } = await import('../services/userService.js');
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    const newPasswordHash = await hashPassword(newPassword);
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    // Revoke all refresh tokens for security (user will need to login again)
    const revokedCount = await revokeAllUserRefreshTokens(user.id);

    res.json({ 
      message: 'Password changed successfully. All sessions have been revoked for security.',
      revokedSessions: revokedCount
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * @swagger
 * /api/auth/revoke-token:
 *   post:
 *     summary: Revoke a specific refresh token
 *     description: Revoke a refresh token to invalidate it. Users can only revoke their own tokens.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *       401:
 *         description: Not authenticated or token does not belong to user
 *       404:
 *         description: Token not found
 *       500:
 *         description: Server error
 */
router.post('/revoke-token', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    await revokeRefreshToken(refreshToken, req.user.id);

    res.json({ message: 'Token revoked successfully' });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Revoke token error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

/**
 * @swagger
 * /api/auth/revoke-all:
 *   post:
 *     summary: Revoke all refresh tokens for current user
 *     description: Revoke all active refresh tokens for the authenticated user. Useful for security (e.g., if account is compromised).
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All tokens revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 revokedCount:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/revoke-all', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const revokedCount = await revokeAllUserRefreshTokens(req.user.id);

    res.json({ 
      message: 'All tokens revoked successfully',
      revokedCount 
    });
  } catch (error: any) {
    console.error('Revoke all tokens error:', error);
    res.status(500).json({ error: 'Failed to revoke tokens' });
  }
});

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get all active sessions for current user
 *     description: Returns a list of all active sessions (devices/browsers) for the authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       sessionToken:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       userAgent:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessions = await getUserSessions(req.user.id);

    res.json({ sessions });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * @swagger
 * /api/auth/sessions/{sessionToken}:
 *   delete:
 *     summary: Revoke a specific session
 *     description: Revoke a specific session by session token. Users can only revoke their own sessions.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionToken
 *         required: true
 *         schema:
 *           type: string
 *         description: The session token to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Session not found or does not belong to user
 *       500:
 *         description: Server error
 */
router.delete('/sessions/:sessionToken', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { sessionToken } = req.params;

    await revokeSession(sessionToken, req.user.id);

    res.json({ message: 'Session revoked successfully' });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * @swagger
 * /api/auth/cleanup-sessions:
 *   post:
 *     summary: Cleanup expired sessions (Admin only)
 *     description: Remove all expired sessions from the database. Admin only endpoint for maintenance.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cleanedCount:
 *                   type: integer
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions (admin only)
 *       500:
 *         description: Server error
 */
router.post('/cleanup-sessions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const cleanedCount = await cleanupExpiredSessions();

    res.json({ 
      message: 'Expired sessions cleaned up successfully',
      cleanedCount 
    });
  } catch (error: any) {
    console.error('Cleanup sessions error:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

export default router;
