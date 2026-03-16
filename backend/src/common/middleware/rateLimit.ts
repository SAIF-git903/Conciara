/**
 * Rate limiting middleware for production safety.
 * - Auth: strict limits to prevent brute-force (login, signup, forgot-password, refresh).
 * - Public chat: limit per IP for embed/widget abuse.
 * - General API: baseline limit for all /api requests.
 *
 * All limits are configurable via env (see .env.example).
 */

import rateLimit from 'express-rate-limit';

/** Trust proxy when behind load balancer/reverse proxy (Heroku, AWS, etc.) so IP is correct */
const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production';

function parsePositiveInt(value: string | undefined, defaultVal: number): number {
  if (value === undefined || value === '') return defaultVal;
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 1 ? defaultVal : n;
}

/** Auth: window in ms (default 15 min), max requests per window (relaxed for testing) */
const AUTH_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000);
const AUTH_MAX = parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 500);

/** General API: window in ms (default 15 min), max per window (relaxed for testing) */
const GENERAL_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 15 * 60 * 1000);
const GENERAL_MAX = parsePositiveInt(process.env.RATE_LIMIT_GENERAL_MAX, 5000);

/** Public chat: window in ms (default 1 min), max per window (relaxed for testing) */
const CHAT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_CHAT_WINDOW_MS, 60 * 1000);
const CHAT_MAX = parsePositiveInt(process.env.RATE_LIMIT_CHAT_MAX, 500);

/**
 * Auth routes: login, signup, forgot-password, refresh, etc.
 * Stricter to prevent brute-force and credential stuffing.
 */
export const authRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy,
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
  trustProxy,
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
  trustProxy,
});
