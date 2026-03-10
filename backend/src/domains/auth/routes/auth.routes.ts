/**
 * Authentication Routes
 * Handles login, logout, registration, token refresh, Sign in with Google, and Sign in with Apple
 */

import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import * as jose from 'jose';
import { getUserByEmail, getUserById, updateLastLogin, createUserFromOAuth } from '../../users/user.service.js';
import {
  verifyPassword,
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  revokeSession,
  getUserSessions,
  cleanupExpiredSessions,
  createSession,
  updateSessionRefresh,
} from '../auth.service.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/authMiddleware.js';
import { prisma } from '../../../db/prisma.js';
import { getWorkspacesForUser } from '../../workspace/workspace.service.js';

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY || '';
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI || '';

/** One-time codes for Google OAuth completion (code -> { token, refreshToken, user }); expire after 60s */
const googleCompleteStore = new Map<
  string,
  { token: string; refreshToken: string; user: object; expiresAt: number }
>();
function cleanupGoogleCompleteStore() {
  const now = Date.now();
  for (const [code, data] of googleCompleteStore.entries()) {
    if (data.expiresAt < now) googleCompleteStore.delete(code);
  }
}

/** One-time codes for Apple OAuth completion; expire after 60s */
const appleCompleteStore = new Map<
  string,
  { token: string; refreshToken: string; user: object; expiresAt: number }
>();
function cleanupAppleCompleteStore() {
  const now = Date.now();
  for (const [code, data] of appleCompleteStore.entries()) {
    if (data.expiresAt < now) appleCompleteStore.delete(code);
  }
}

/**
 * Normalize Apple .p8 private key from env: fix newlines, strip invalid chars so PEM is valid for jose/crypto.
 */
function normalizeApplePrivateKey(raw: string): string {
  if (!raw || !raw.trim()) return raw;
  const key = raw.trim().replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  const begin = '-----BEGIN PRIVATE KEY-----';
  const end = '-----END PRIVATE KEY-----';
  const beginIdx = key.indexOf(begin);
  const endIdx = key.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return key;
  const middle = key.slice(beginIdx + begin.length, endIdx);
  const base64 = middle.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!base64) return key;
  const lines = base64.match(/.{1,64}/g) || [base64];
  return begin + '\n' + lines.join('\n') + '\n' + end;
}

/** Generate Apple client_secret JWT (ES256) for token exchange using jose (handles PKCS#8 .p8 keys). */
async function getAppleClientSecret(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const pem = normalizeApplePrivateKey(APPLE_PRIVATE_KEY);
  if (!pem || !pem.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Apple private key is missing or invalid (no PEM header)');
  }
  const privateKey = await jose.importPKCS8(pem, 'ES256');
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID })
    .setIssuer(APPLE_TEAM_ID)
    .setAudience('https://appleid.apple.com')
    .setSubject(APPLE_CLIENT_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 86400 * 180)
    .sign(privateKey);
}

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

    const { getWorkspacesForUser } = await import('../../workspace/workspace.service.js');
    const workspaces = await getWorkspacesForUser(user.id);

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

    try {
      await createSession({
        userId: user.id,
        sessionToken: `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken,
        expiresInDays: 7,
        ipAddress: req.ip || (req.socket as any)?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (error: any) {
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
        workspaces,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }. Sends a password reset link to the user's email if the account exists.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const trimmed = typeof email === 'string' ? email.trim() : '';
    if (!trimmed) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await getUserByEmail(trimmed);
    if (!user || !user.isActive) {
      return res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
    }
    const token = generatePasswordResetToken(user.id, user.email);
    const { sendPasswordResetEmail } = await import('../../../shared/email.service.js');
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetLink);
    return res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }. Sets a new password using a valid reset token.
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    const raw = typeof newPassword === 'string' ? newPassword : '';
    if (!raw || raw.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    let payload: { userId: number; email: string };
    try {
      payload = verifyPasswordResetToken(token);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || 'Invalid or expired reset link' });
    }
    const user = await getUserById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const passwordHash = await hashPassword(raw);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash, updatedAt: new Date() },
    });
    return res.json({ message: 'Your password has been reset. You can sign in with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * GET /api/auth/invite/validate?token=...
 * Validate a workspace invite token. Returns { email, workspaceName, valid } if valid and not expired.
 */
router.get('/invite/validate', async (req, res) => {
  try {
    const token = typeof req.query?.token === 'string' ? req.query.token : '';
    const { validateInviteToken } = await import('../../../shared/workspaceInvite.service.js');
    const result = await validateInviteToken(token);
    if (!result) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired invite link' });
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Invite validate error:', error);
    res.status(500).json({ valid: false, error: 'Something went wrong' });
  }
});

/**
 * POST /api/auth/invite/accept
 * Accept a workspace invite: create account and join workspace. Body: { token, password, fullName? }.
 * Returns same shape as signup (token, refreshToken, user with workspaces).
 */
router.post('/invite/accept', async (req, res) => {
  try {
    const { token, password, fullName } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    const { acceptInvite } = await import('../../../shared/workspaceInvite.service.js');
    const { getWorkspacesForUser } = await import('../../workspace/workspace.service.js');

    const result = await acceptInvite(token, password, fullName?.trim() || undefined);

    await updateLastLogin(result.userId);
    const workspaces = await getWorkspacesForUser(result.userId);

    const jwt = generateJWT({
      id: result.userId,
      email: result.email,
      role: 'member',
      fullName: result.fullName ?? undefined,
    });
    const refreshToken = generateRefreshToken({
      id: result.userId,
      email: result.email,
      role: 'member',
      fullName: result.fullName ?? undefined,
    });

    try {
      await createSession({
        userId: result.userId,
        sessionToken: `session_${result.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken,
        expiresInDays: 7,
        ipAddress: req.ip || (req.socket as any)?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (error: any) {
      console.warn('Failed to store session:', error.message);
    }

    return res.status(201).json({
      token: jwt,
      refreshToken,
      user: {
        id: result.userId,
        email: result.email,
        fullName: result.fullName,
        role: 'member',
        workspaces,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Invalid or expired invite link' || error?.message?.includes('expired')) {
      return res.status(400).json({ error: error.message });
    }
    if (error?.message?.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Invite accept error:', error);
    res.status(500).json({ error: 'Failed to create account', details: error?.message });
  }
});

/**
 * POST /api/auth/signup - Public self-registration (for v2 UI).
 * Creates user as owner with no workspace; user must create one via onboarding.
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const { createUser } = await import('../../users/user.service.js');
    const { getWorkspacesForUser } = await import('../../workspace/workspace.service.js');

    const user = await createUser({
      email,
      password,
      fullName: fullName || undefined,
      role: 'owner',
    });

    await updateLastLogin(user.id);
    const workspaces = await getWorkspacesForUser(user.id);

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

    try {
      await createSession({
        userId: user.id,
        sessionToken: `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken,
        expiresInDays: 7,
        ipAddress: req.ip || (req.socket as any)?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (error: any) {
      console.warn('Failed to store session:', error.message);
    }

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workspaces,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

// ---------- Sign in with Google ----------
/**
 * GET /api/auth/google
 * Redirects to Google OAuth consent. Call from frontend via window.location.
 */
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  const state = crypto.randomBytes(24).toString('hex');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'email profile openid',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * GET /api/auth/google/callback
 * Google redirects here with ?code=...&state=... . Exchanges code for tokens, gets user info,
 * finds or creates user, then redirects to frontend with a one-time code.
 */
router.get('/google/callback', async (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=google_not_configured`);
  }
  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=${encodeURIComponent(String(error))}`);
  }
  if (typeof code !== 'string') {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=missing_code`);
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange failed:', tokenRes.status, errText);
      return res.redirect(302, `${FRONTEND_URL}/signin?error=token_exchange_failed`);
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=no_access_token`);
    }
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userInfoRes.ok) {
      console.error('Google userinfo failed:', userInfoRes.status);
      return res.redirect(302, `${FRONTEND_URL}/signin?error=userinfo_failed`);
    }
    const userInfo = (await userInfoRes.json()) as { email?: string; name?: string };
    const email = userInfo.email?.trim();
    if (!email) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=no_email`);
    }
    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUserFromOAuth(email, userInfo.name ?? undefined);
    }
    if (!user.isActive) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=account_disabled`);
    }
    await updateLastLogin(user.id);
    const workspaces = await getWorkspacesForUser(user.id);
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
    try {
      await createSession({
        userId: user.id,
        sessionToken: `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken,
        expiresInDays: 7,
        ipAddress: req.ip || (req.socket as any)?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (err: any) {
      console.warn('Failed to store session:', err.message);
    }
    cleanupGoogleCompleteStore();
    const oneTimeCode = crypto.randomBytes(24).toString('hex');
    const TTL_MS = 60_000;
    googleCompleteStore.set(oneTimeCode, {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workspaces,
      },
      expiresAt: Date.now() + TTL_MS,
    });
    res.redirect(302, `${FRONTEND_URL}/auth/callback?code=${encodeURIComponent(oneTimeCode)}`);
  } catch (err: any) {
    console.error('Google callback error:', err);
    res.redirect(302, `${FRONTEND_URL}/signin?error=callback_failed`);
  }
});

/**
 * POST /api/auth/google/complete
 * Body: { code }. Exchanges the one-time code from the redirect for token, refreshToken, user.
 */
router.post('/google/complete', (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'code is required' });
  }
  cleanupGoogleCompleteStore();
  const data = googleCompleteStore.get(code.trim());
  if (!data) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  googleCompleteStore.delete(code.trim());
  res.json({
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
  });
});

// ---------- Sign in with Apple ----------
/**
 * GET /api/auth/apple
 * Redirects to Apple OAuth consent. Call from frontend via window.location.
 */
router.get('/apple', (req, res) => {
  if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=apple_not_configured`);
  }
  const state = crypto.randomBytes(24).toString('hex');
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });
  res.redirect(302, `https://appleid.apple.com/auth/authorize?${params.toString()}`);
});

/** GET /apple/callback - Apple uses POST (form_post); redirect if hit via GET */
router.get('/apple/callback', (_req, res) => {
  res.redirect(302, `${FRONTEND_URL}/signin?error=missing_code`);
});

/**
 * POST /api/auth/apple/callback
 * Apple POSTs here (response_mode=form_post) with code, id_token, user (optional), state, etc.
 * Exchanges code for tokens, verifies id_token, finds or creates user, redirects to frontend with one-time code.
 */
router.post('/apple/callback', async (req, res) => {
  if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=apple_not_configured`);
  }
  const { code, state, error, error_description, user: userJson } = req.body || {};
  if (error) {
    const errMsg = typeof error_description === 'string' ? error_description : error;
    return res.redirect(302, `${FRONTEND_URL}/signin?error=${encodeURIComponent(String(errMsg))}`);
  }
  if (typeof code !== 'string') {
    return res.redirect(302, `${FRONTEND_URL}/signin?error=missing_code`);
  }
  let appleFullName: string | undefined;
  if (typeof userJson === 'string' && userJson) {
    try {
      const parsed = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string } };
      const first = parsed?.name?.firstName ?? '';
      const last = parsed?.name?.lastName ?? '';
      appleFullName = [first, last].filter(Boolean).join(' ').trim() || undefined;
    } catch {
      // ignore
    }
  }
  try {
    let clientSecret: string;
    try {
      clientSecret = await getAppleClientSecret();
    } catch (secretErr: any) {
      console.error('Apple client_secret JWT failed:', secretErr?.message || secretErr);
      return res.redirect(302, `${FRONTEND_URL}/signin?error=token_exchange_failed`);
    }
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: APPLE_REDIRECT_URI,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Apple token exchange failed:', tokenRes.status, errText);
      return res.redirect(302, `${FRONTEND_URL}/signin?error=token_exchange_failed`);
    }
    const tokenData = (await tokenRes.json()) as { id_token?: string };
    const idToken = tokenData.id_token;
    if (!idToken) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=no_id_token`);
    }
    const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    let payload: { email?: string };
    try {
      const result = await jose.jwtVerify(idToken, JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: APPLE_CLIENT_ID,
      });
      payload = result.payload as { email?: string };
    } catch (verifyErr: any) {
      console.error('Apple id_token verify failed:', verifyErr?.message || verifyErr, 'audience used:', APPLE_CLIENT_ID);
      return res.redirect(302, `${FRONTEND_URL}/signin?error=token_exchange_failed`);
    }
    const email = payload.email;
    if (!email?.trim()) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=no_email`);
    }
    let user = await getUserByEmail(email.trim());
    if (!user) {
      user = await createUserFromOAuth(email.trim(), appleFullName ?? undefined);
    }
    if (!user.isActive) {
      return res.redirect(302, `${FRONTEND_URL}/signin?error=account_disabled`);
    }
    await updateLastLogin(user.id);
    const workspaces = await getWorkspacesForUser(user.id);
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
    try {
      await createSession({
        userId: user.id,
        sessionToken: `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refreshToken,
        expiresInDays: 7,
        ipAddress: req.ip || (req.socket as any)?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
      });
    } catch (err: any) {
      console.warn('Failed to store session:', err.message);
    }
    cleanupAppleCompleteStore();
    const oneTimeCode = crypto.randomBytes(24).toString('hex');
    const TTL_MS = 60_000;
    appleCompleteStore.set(oneTimeCode, {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        workspaces,
      },
      expiresAt: Date.now() + TTL_MS,
    });
    res.redirect(302, `${FRONTEND_URL}/auth/callback?code=${encodeURIComponent(oneTimeCode)}&provider=apple`);
  } catch (err: any) {
    console.error('Apple callback error:', err?.message || err, err?.stack);
    res.redirect(302, `${FRONTEND_URL}/signin?error=callback_failed`);
  }
});

/**
 * POST /api/auth/apple/complete
 * Body: { code }. Exchanges the one-time code from the redirect for token, refreshToken, user.
 */
router.post('/apple/complete', (req, res) => {
  const { code } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'code is required' });
  }
  cleanupAppleCompleteStore();
  const data = appleCompleteStore.get(code.trim());
  if (!data) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  appleCompleteStore.delete(code.trim());
  res.json({
    token: data.token,
    refreshToken: data.refreshToken,
    user: data.user,
  });
});

// ---------- /api/auth/logout ----------
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
      // Fallback: try to revoke without user check (for owner)
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
 *                 enum: [member]
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
    const { createUser } = await import('../../users/user.service.js');
    const user = await createUser({
      email,
      password,
      fullName,
      role: role || 'member',
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

    const { getUserById } = await import('../../users/user.service.js');
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { getWorkspacesForUser } = await import('../../workspace/workspace.service.js');
    const workspaces = await getWorkspacesForUser(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        workspaces,
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
    const { getUserById } = await import('../../users/user.service.js');
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

    const newSessionId = `session_${payload.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await updateSessionRefresh(refreshToken, newSessionId, newRefreshToken, 7);

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
    const { getUserById } = await import('../../users/user.service.js');
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
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, updatedAt: new Date() },
    });

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
 *         description: Insufficient permissions (owner only)
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
