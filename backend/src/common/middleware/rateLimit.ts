/**
 * Rate limiting middleware for production safety.
 * - Auth: strict limits to prevent brute-force (login, signup, forgot-password, refresh).
 * - Public chat: limit per IP for embed/widget abuse.
 * - General API: baseline limit for all /api requests.
 *
 * All limits are configurable via env (see .env.example).
 */

import rateLimit from 'express-rate-limit';

function parsePositiveInt(value: string | undefined, defaultVal: number): number {
  if (value === undefined || value === '') return defaultVal;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? defaultVal : n;
}

/** Auth credential endpoints: window in ms (default 15 min), max requests per IP per window */
const AUTH_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000);
const AUTH_MAX = parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20);

/** General API: window in ms (default 15 min), max per IP per window */
const GENERAL_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 15 * 60 * 1000);
const GENERAL_MAX = parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX, 2000);

/** Public chat: window in ms (default 1 min), max messages per IP per window */
const CHAT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_CHAT_WINDOW_MS, 60 * 1000);
const CHAT_MAX = parsePositiveInt(process.env.RATE_LIMIT_CHAT_MAX, 20);

/** Endpoints that take credentials or send email; everything else under /api/auth (me, refresh,
 * sessions, OAuth redirects) is covered by the general limiter so normal app usage isn't throttled. */
const CREDENTIAL_PATHS = new Set([
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite/accept',
  '/change-password',
]);

/**
 * Auth credential routes (mounted on /api/auth): login, signup, password reset, invite accept.
 * Strict to prevent brute-force, credential stuffing and email bombing.
 */
export const authRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  skip: (req) => req.method !== 'POST' || !CREDENTIAL_PATHS.has(req.path),
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API: all /api/* routes get this baseline limit.
 */
export const generalApiRateLimiter = rateLimit({
  windowMs: GENERAL_WINDOW_MS,
  max: GENERAL_MAX,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public chat stream (embed widget): limit per IP to prevent abuse.
 * Higher than auth so real users can have a conversation.
 */
export const publicChatRateLimiter = rateLimit({
  windowMs: CHAT_WINDOW_MS,
  max: CHAT_MAX,
  message: { error: 'Too many messages. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
