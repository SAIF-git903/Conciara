/**
 * Chatbot actions routes (Custom Actions + Custom Buttons).
 * Mounted under /api/workspaces (via agents routes aggregator).
 */

import express from 'express';
import { ActionType, Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma.js';
import { canManageAgent } from '../agent.service.js';

const router = express.Router();

type JsonObject = Record<string, unknown>;
type RequestLike = express.Request;

const PROXY_TIMEOUT_MS = 10_000;
const PROXY_RATE_LIMIT_WINDOW_MS = 60_000;
const PROXY_RATE_LIMIT_MAX = 60;
const INTERNAL_HEADER_DENYLIST = new Set([
  'authorization',
  'cookie',
  'x-forwarded-for',
  'x-real-ip',
  'x-internal-token',
  'x-auth-token',
]);

const proxyRateLimitByChatbot = new Map<number, number[]>();

type AuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth_bearer';

interface ActionAuthConfig {
  type: AuthType;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshEndpoint?: string;
  refreshClientId?: string;
  refreshClientSecret?: string;
}

/** In-flight refresh dedupe per action id to avoid parallel token refresh storms. */
const inFlightOAuthRefreshes = new Map<string, Promise<string>>();

function parseAuthConfigFromJson(config: JsonObject): ActionAuthConfig | null {
  const raw = config.authConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as JsonObject;
  const type = getString(row, 'type') as AuthType;
  if (!type || type === 'none') return null;
  return {
    type,
    apiKeyHeader: getString(row, 'apiKeyHeader'),
    apiKeyValue: getString(row, 'apiKeyValue'),
    bearerToken: getString(row, 'bearerToken'),
    basicUsername: getString(row, 'basicUsername'),
    basicPassword: getString(row, 'basicPassword'),
    accessToken: getString(row, 'accessToken'),
    refreshToken: getString(row, 'refreshToken'),
    expiresAt: getString(row, 'expiresAt'),
    refreshEndpoint: getString(row, 'refreshEndpoint'),
    refreshClientId: getString(row, 'refreshClientId'),
    refreshClientSecret: getString(row, 'refreshClientSecret'),
  };
}

function parseWorkspaceAndChatbotIds(req: RequestLike): { workspaceId: number; chatbotId: number } | null {
  const workspaceId = parseInt(req.params.workspaceId, 10);
  const chatbotId = parseInt(req.params.chatbotId, 10);
  if (Number.isNaN(workspaceId) || Number.isNaN(chatbotId)) return null;
  return { workspaceId, chatbotId };
}

function parseActionType(value: unknown): ActionType | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (!(normalized in ActionType)) return null;
  return ActionType[normalized as keyof typeof ActionType];
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateOrLocalhostHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.startsWith('127.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (h.startsWith('169.254.')) return true;
  if (h.startsWith('172.16.') || h.startsWith('172.17.') || h.startsWith('172.18.') || h.startsWith('172.19.')) return true;
  if (h.startsWith('172.2')) return h.startsWith('172.20.') || h.startsWith('172.21.') || h.startsWith('172.22.') || h.startsWith('172.23.') || h.startsWith('172.24.') || h.startsWith('172.25.') || h.startsWith('172.26.') || h.startsWith('172.27.') || h.startsWith('172.28.') || h.startsWith('172.29.');
  if (h.startsWith('172.30.') || h.startsWith('172.31.')) return true;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd')) return true;
  return false;
}

async function validateTargetUrlForProxy(apiUrl: string): Promise<void> {
  if (!isHttpUrl(apiUrl)) {
    throw new Error('API URL must start with http:// or https://');
  }
  const parsed = new URL(apiUrl);
  if (isPrivateOrLocalhostHost(parsed.hostname)) {
    throw new Error('Target URL points to a private or local address');
  }

  // DNS resolution for SSRF safety.
  const dns = await import('node:dns/promises');
  const records = await dns.lookup(parsed.hostname, { all: true });
  if (!records.length) {
    throw new Error('Target URL host could not be resolved');
  }
  for (const record of records) {
    if (isPrivateOrLocalhostHost(record.address)) {
      throw new Error('Target URL resolves to a private or local address');
    }
  }
}

function maskConfigForClient(config: unknown): unknown {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return config;
  const cloned = structuredClone(config) as JsonObject;
  const headers = cloned.headers;
  if (Array.isArray(headers)) {
    cloned.headers = headers.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry;
      const row = entry as JsonObject;
      return { ...row, value: row.value ? '********' : '' };
    });
  }
  return cloned;
}

function actionToClient(action: {
  id: string;
  chatbotId: number;
  type: ActionType;
  name: string;
  isEnabled: boolean;
  config: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: action.id,
    chatbotId: action.chatbotId,
    type: action.type.toLowerCase(),
    name: action.name,
    isEnabled: action.isEnabled,
    config: maskConfigForClient(action.config),
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

function parseBodyObject(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonObject;
}

function getString(row: JsonObject, key: string): string {
  const v = row[key];
  return typeof v === 'string' ? v.trim() : '';
}

function validateCustomButtonsConfig(config: JsonObject): string[] {
  const errors: string[] = [];
  const buttons = Array.isArray(config.buttons) ? config.buttons : [];
  if (buttons.length === 0) {
    errors.push('At least one button is required');
  }
  if (buttons.length > 6) {
    errors.push('Maximum 6 buttons per action');
  }
  for (let i = 0; i < buttons.length; i += 1) {
    const row = parseBodyObject(buttons[i]);
    const label = getString(row, 'label');
    const url = getString(row, 'url');
    if (!label) errors.push(`Button ${i + 1}: label is required`);
    if (label.length > 30) errors.push(`Button ${i + 1}: label must be 30 characters or less`);
    if (!url || !isHttpUrl(url)) errors.push(`Button ${i + 1}: URL must start with http:// or https://`);
  }
  return errors;
}

function validateCustomActionConfig(config: JsonObject): string[] {
  const errors: string[] = [];
  const mode = getString(config, 'executionMode');
  const fnName = getString(config, 'actionFunctionName');
  const inputFields = Array.isArray(config.inputFields) ? config.inputFields : [];
  if (mode !== 'server_side' && mode !== 'client_side') {
    errors.push('executionMode must be server_side or client_side');
  }
  if (!fnName) errors.push('actionFunctionName is required');
  if (inputFields.length === 0) errors.push('At least one input field is required');

  if (mode === 'server_side') {
    const apiUrl = getString(config, 'apiUrl');
    if (!apiUrl || !isHttpUrl(apiUrl)) errors.push('API URL must start with http:// or https://');
    const method = getString(config, 'method');
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      errors.push('method is required for server-side actions');
    }
    errors.push(...validateAuthConfig(config));
  }
  return errors;
}

function validateAuthConfig(config: JsonObject): string[] {
  const errors: string[] = [];
  const rawAuth = config.authConfig;
  if (!rawAuth || typeof rawAuth !== 'object' || Array.isArray(rawAuth)) return errors;
  const row = rawAuth as JsonObject;
  const type = getString(row, 'type');
  if (!type || type === 'none') return errors;
  if (!['api_key', 'bearer', 'basic', 'oauth_bearer'].includes(type)) {
    errors.push('authConfig.type must be none, api_key, bearer, basic, or oauth_bearer');
    return errors;
  }
  if (type === 'api_key') {
    if (!getString(row, 'apiKeyHeader')) errors.push('authConfig.apiKeyHeader is required for API Key auth');
    if (!getString(row, 'apiKeyValue')) errors.push('authConfig.apiKeyValue is required for API Key auth');
  }
  if (type === 'bearer') {
    if (!getString(row, 'bearerToken')) errors.push('authConfig.bearerToken is required for Bearer auth');
  }
  if (type === 'basic') {
    if (!getString(row, 'basicUsername')) errors.push('authConfig.basicUsername is required for Basic auth');
    if (!getString(row, 'basicPassword')) errors.push('authConfig.basicPassword is required for Basic auth');
  }
  if (type === 'oauth_bearer') {
    if (!getString(row, 'accessToken')) errors.push('authConfig.accessToken is required for OAuth Bearer auth');
    if (!getString(row, 'refreshToken')) errors.push('authConfig.refreshToken is required for OAuth Bearer auth');
    if (!getString(row, 'expiresAt')) errors.push('authConfig.expiresAt is required for OAuth Bearer auth');
    const refreshEndpoint = getString(row, 'refreshEndpoint');
    if (!refreshEndpoint || !isHttpUrl(refreshEndpoint)) {
      errors.push('authConfig.refreshEndpoint must be a valid http(s) URL');
    }
    if (!getString(row, 'refreshClientId')) errors.push('authConfig.refreshClientId is required for OAuth Bearer auth');
    if (!getString(row, 'refreshClientSecret')) errors.push('authConfig.refreshClientSecret is required for OAuth Bearer auth');
  }
  return errors;
}

function validateActionPayload(payload: JsonObject): string[] {
  const errors: string[] = [];
  const type = parseActionType(payload.type);
  const name = getString(payload, 'name');
  const config = parseBodyObject(payload.config);
  if (!type) errors.push('Invalid action type');
  if (!name) errors.push('Action name is required');

  if (type === ActionType.CUSTOM_BUTTONS) {
    errors.push(...validateCustomButtonsConfig(config));
  }
  if (type === ActionType.CUSTOM_ACTION) {
    errors.push(...validateCustomActionConfig(config));
  }
  return errors;
}

function getInputFieldNames(config: JsonObject): Set<string> {
  const inputFields = Array.isArray(config.inputFields) ? config.inputFields : [];
  const names = new Set<string>();
  for (const field of inputFields) {
    const row = parseBodyObject(field);
    const name = getString(row, 'name');
    if (name) names.add(name);
  }
  return names;
}

function sanitizeKeyValueRows(config: JsonObject): JsonObject {
  const out = structuredClone(config) as JsonObject;
  for (const listKey of ['headers', 'queryParams', 'bodyParams']) {
    const rows = Array.isArray(out[listKey]) ? out[listKey] : [];
    out[listKey] = rows
      .map((r) => parseBodyObject(r))
      .filter((r) => !!getString(r, 'key'));
  }
  return out;
}

function normalizeActionConfig(type: ActionType, rawConfig: JsonObject): Prisma.InputJsonValue {
  const config = sanitizeKeyValueRows(rawConfig);
  if (type === ActionType.CUSTOM_ACTION) {
    const inputFields = Array.isArray(config.inputFields) ? config.inputFields : [];
    const validFields = getInputFieldNames(config);
    const bodyParams = Array.isArray(config.bodyParams) ? config.bodyParams : [];
    config.bodyParams = bodyParams
      .map((r) => parseBodyObject(r))
      .filter((r) => {
        const source = getString(r, 'source');
        if (source === 'user_input') {
          const userInputField = getString(r, 'userInputField');
          return !userInputField || validFields.has(userInputField);
        }
        return true;
      });
    config.inputFields = inputFields.map((r) => parseBodyObject(r)).filter((r) => !!getString(r, 'name'));
  }
  if (type === ActionType.CUSTOM_BUTTONS) {
    const buttons = Array.isArray(config.buttons) ? config.buttons : [];
    config.buttons = buttons
      .map((r) => parseBodyObject(r))
      .filter((r) => !!getString(r, 'label') && !!getString(r, 'url'))
      .map((r) => ({
        id: getString(r, 'id') || crypto.randomUUID(),
        label: getString(r, 'label').slice(0, 30),
        url: getString(r, 'url'),
        openInNewTab: typeof r.openInNewTab === 'boolean' ? r.openInNewTab : true,
      }));
  }
  return config as Prisma.InputJsonValue;
}

async function ensureFunctionNameUnique(chatbotId: number, functionName: string, excludeActionId?: string): Promise<boolean> {
  if (!functionName.trim()) return true;
  const existing = await prisma.action.findFirst({
    where: {
      chatbotId,
      type: ActionType.CUSTOM_ACTION,
      id: excludeActionId ? { not: excludeActionId } : undefined,
      config: {
        path: ['actionFunctionName'],
        equals: functionName.trim(),
      },
    },
    select: { id: true },
  });
  return !existing;
}

function shouldConsumeRateLimit(chatbotId: number): boolean {
  const now = Date.now();
  const existing = proxyRateLimitByChatbot.get(chatbotId) ?? [];
  const filtered = existing.filter((ts) => now - ts <= PROXY_RATE_LIMIT_WINDOW_MS);
  if (filtered.length >= PROXY_RATE_LIMIT_MAX) {
    proxyRateLimitByChatbot.set(chatbotId, filtered);
    return false;
  }
  filtered.push(now);
  proxyRateLimitByChatbot.set(chatbotId, filtered);
  return true;
}

function buildProxyRequestFromConfig(params: {
  actionConfig: JsonObject;
  collectedInputs: JsonObject;
  chatbotName?: string;
  currentUrl?: string;
  sessionId?: string;
  sessionData?: Record<string, string>;
}) {
  const { actionConfig, collectedInputs, chatbotName, currentUrl, sessionId, sessionData } = params;
  const resolveContextValue = (contextKey: string): string => {
    if (contextKey === 'chatbot_name') return String(chatbotName ?? '');
    if (contextKey === 'current_url') return String(currentUrl ?? '');
    if (contextKey === 'session_id') return String(sessionId ?? '');
    return sessionData?.[contextKey] ?? '';
  };
  /** Same as resolveContextValue, but preserves null vs "" distinction for the JSON body. */
  const resolveContextValueForBody = (contextKey: string): string | null => {
    if (contextKey === 'chatbot_name') return chatbotName ?? null;
    if (contextKey === 'current_url') return currentUrl ?? null;
    if (contextKey === 'session_id') return sessionId ?? null;
    const fromSession = sessionData?.[contextKey];
    return fromSession !== undefined ? fromSession : null;
  };
  const resolveInputValue = (inputKey: string): string => String(collectedInputs[inputKey] ?? '');
  const interpolateUrlTemplate = (rawApiUrl: string): string => {
    if (!rawApiUrl) return rawApiUrl;
    let next = rawApiUrl;

    // {{field}} or {field} => collected input
    next = next.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, field: string) => resolveInputValue(field));
    next = next.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, field: string) => resolveInputValue(field));

    // {:context_key} => context value
    next = next.replace(/\{\:\s*([a-zA-Z0-9_]+)\s*\}/g, (_match, contextKey: string) => resolveContextValue(contextKey));

    // /:field style path params => collected input when present
    try {
      const parsed = new URL(next);
      parsed.pathname = parsed.pathname.replace(/:([a-zA-Z0-9_]+)/g, (_m, field: string) => {
        const v = resolveInputValue(field);
        return v ? encodeURIComponent(v) : `:${field}`;
      });
      return parsed.toString();
    } catch {
      return next;
    }
  };

  const url = new URL(interpolateUrlTemplate(getString(actionConfig, 'apiUrl')));
  const method = getString(actionConfig, 'method') || 'GET';
  const headersRows = Array.isArray(actionConfig.headers) ? actionConfig.headers : [];
  const queryRows = Array.isArray(actionConfig.queryParams) ? actionConfig.queryParams : [];
  const bodyRows = Array.isArray(actionConfig.bodyParams) ? actionConfig.bodyParams : [];
  const headers: Record<string, string> = {};

  for (const rowUnknown of headersRows) {
    const row = parseBodyObject(rowUnknown);
    const key = getString(row, 'key');
    const value = getString(row, 'value');
    if (!key || !value) continue;
    const lower = key.toLowerCase();
    if (INTERNAL_HEADER_DENYLIST.has(lower)) continue;
    headers[key] = value;
  }

  for (const rowUnknown of queryRows) {
    const row = parseBodyObject(rowUnknown);
    const key = getString(row, 'key');
    if (!key) continue;
    let value = getString(row, 'value');
    const source = getString(row, 'source');
    if (source === 'user_input') {
      const fieldName = getString(row, 'userInputField') || key;
      value = String(collectedInputs[fieldName] ?? '');
    }
    if (source === 'context') {
      const contextKey = getString(row, 'contextKey');
      value = resolveContextValue(contextKey);
    }
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const body: Record<string, unknown> = {};
  for (const rowUnknown of bodyRows) {
    const row = parseBodyObject(rowUnknown);
    const key = getString(row, 'key');
    if (!key) continue;
    const source = getString(row, 'source') || 'static';
    if (source === 'user_input') {
      const fieldName = getString(row, 'userInputField') || key;
      body[key] = collectedInputs[fieldName] ?? null;
      continue;
    }
    if (source === 'context') {
      const contextKey = getString(row, 'contextKey');
      body[key] = resolveContextValueForBody(contextKey);
      continue;
    }
    body[key] = row.value ?? null;
  }

  return { url: url.toString(), method, headers, body };
}

/**
 * Resolve a valid OAuth access token. Refreshes if within the 5-minute skew
 * or when `forceRefresh` is true (used on 401 retry). Persists the new
 * accessToken + expiresAt on the action's stored authConfig.
 */
async function resolveOAuthToken(
  actionId: string,
  authConfig: ActionAuthConfig,
  forceRefresh: boolean,
): Promise<string> {
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const expiresAtMs = authConfig.expiresAt ? Date.parse(authConfig.expiresAt) : NaN;
  const needsRefresh =
    forceRefresh ||
    !authConfig.accessToken ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs - Date.now() < FIVE_MIN_MS;

  if (!needsRefresh) return authConfig.accessToken ?? '';

  if (!authConfig.refreshEndpoint || !authConfig.refreshToken) {
    throw new Error('OAuth refresh requires refreshEndpoint and refreshToken');
  }

  const existingRefresh = inFlightOAuthRefreshes.get(actionId);
  if (existingRefresh) return existingRefresh;

  const refreshPromise = (async (): Promise<string> => {
    await validateTargetUrlForProxy(authConfig.refreshEndpoint!);
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', authConfig.refreshToken ?? '');
    if (authConfig.refreshClientId) form.set('client_id', authConfig.refreshClientId);
    if (authConfig.refreshClientSecret) form.set('client_secret', authConfig.refreshClientSecret);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    try {
      const response = await fetch(authConfig.refreshEndpoint!, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed: JsonObject = {};
      try {
        parsed = text ? (JSON.parse(text) as JsonObject) : {};
      } catch {
        parsed = {};
      }
      if (!response.ok) {
        throw new Error(`OAuth refresh failed with status ${response.status}`);
      }
      const newAccessToken = getString(parsed, 'access_token');
      if (!newAccessToken) {
        throw new Error('OAuth refresh response missing access_token');
      }
      const expiresInRaw = parsed.expires_in;
      const expiresInSec =
        typeof expiresInRaw === 'number' && Number.isFinite(expiresInRaw)
          ? expiresInRaw
          : typeof expiresInRaw === 'string' && expiresInRaw.trim()
            ? Number(expiresInRaw)
            : 3600;
      const newExpiresAt = new Date(Date.now() + Math.max(60, expiresInSec) * 1000).toISOString();
      const maybeNewRefresh = getString(parsed, 'refresh_token');

      const existing = await prisma.action.findUnique({
        where: { id: actionId },
        select: { config: true },
      });
      if (existing) {
        const existingConfig = parseBodyObject(existing.config);
        const existingAuth = parseBodyObject(existingConfig.authConfig);
        const mergedAuth: JsonObject = {
          ...existingAuth,
          type: 'oauth_bearer',
          accessToken: newAccessToken,
          expiresAt: newExpiresAt,
          ...(maybeNewRefresh ? { refreshToken: maybeNewRefresh } : {}),
        };
        const mergedConfig: JsonObject = { ...existingConfig, authConfig: mergedAuth };
        await prisma.action.update({
          where: { id: actionId },
          data: { config: mergedConfig as Prisma.InputJsonValue },
        });
      }

      authConfig.accessToken = newAccessToken;
      authConfig.expiresAt = newExpiresAt;
      if (maybeNewRefresh) authConfig.refreshToken = maybeNewRefresh;
      return newAccessToken;
    } finally {
      clearTimeout(timer);
    }
  })();

  inFlightOAuthRefreshes.set(actionId, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    inFlightOAuthRefreshes.delete(actionId);
  }
}

/**
 * Build and merge auth headers on top of the user-configured headers.
 * Runs AFTER the INTERNAL_HEADER_DENYLIST filter in buildProxyRequestFromConfig,
 * so auth headers intentionally bypass the denylist.
 */
async function injectAuthHeaders(
  headers: Record<string, string>,
  authConfig: ActionAuthConfig,
  actionId: string,
  forceRefresh = false,
): Promise<Record<string, string>> {
  const out = { ...headers };
  switch (authConfig.type) {
    case 'none':
      return out;
    case 'api_key': {
      if (authConfig.apiKeyHeader && authConfig.apiKeyValue) {
        out[authConfig.apiKeyHeader] = authConfig.apiKeyValue;
      }
      return out;
    }
    case 'bearer': {
      if (authConfig.bearerToken) {
        out['Authorization'] = `Bearer ${authConfig.bearerToken}`;
      }
      return out;
    }
    case 'basic': {
      const username = authConfig.basicUsername ?? '';
      const password = authConfig.basicPassword ?? '';
      const encoded = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
      out['Authorization'] = `Basic ${encoded}`;
      return out;
    }
    case 'oauth_bearer': {
      const token = await resolveOAuthToken(actionId, authConfig, forceRefresh);
      if (token) {
        out['Authorization'] = `Bearer ${token}`;
      }
      return out;
    }
    default:
      return out;
  }
}

async function executeServerSideCustomAction(params: {
  action: { id: string; chatbotId: number; config: Prisma.JsonValue };
  collectedInputs: JsonObject;
  isTest: boolean;
  context?: { currentUrl?: string; sessionId?: string; sessionData?: Record<string, string> };
}): Promise<{
  success: boolean;
  statusCode: number;
  responseBody: unknown;
  durationMs: number;
  error?: string;
  message?: string;
}> {
  const config = parseBodyObject(params.action.config);
  const executionMode = getString(config, 'executionMode');
  if (executionMode !== 'server_side') {
    throw new Error('Only server-side custom actions can use proxy execution');
  }
  const apiUrl = getString(config, 'apiUrl');
  await validateTargetUrlForProxy(apiUrl);

  if (!params.isTest && !shouldConsumeRateLimit(params.action.chatbotId)) {
    throw new Error('Rate limit exceeded for this chatbot action proxy');
  }

  const agent = await prisma.agent.findUnique({
    where: { id: params.action.chatbotId },
    select: { name: true },
  });
  const requestPayload = buildProxyRequestFromConfig({
    actionConfig: config,
    collectedInputs: params.collectedInputs,
    chatbotName: agent?.name,
    currentUrl: params.context?.currentUrl,
    sessionId: params.context?.sessionId,
    sessionData: params.context?.sessionData,
  });

  const authConfig = parseAuthConfigFromJson(config);
  const methodUpper = requestPayload.method.toUpperCase();
  const shouldAttachBody = !['GET', 'DELETE'].includes(methodUpper);
  const startedAt = Date.now();

  const doFetch = async (
    forceAuthRefresh: boolean,
  ): Promise<{ response: Response; parsedBody: unknown }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    try {
      const finalHeaders: Record<string, string> = {
        ...requestPayload.headers,
        ...(shouldAttachBody ? { 'content-type': 'application/json' } : {}),
      };
      const headersWithAuth = authConfig
        ? await injectAuthHeaders(finalHeaders, authConfig, params.action.id, forceAuthRefresh)
        : finalHeaders;
      const response = await fetch(requestPayload.url, {
        method: methodUpper,
        headers: headersWithAuth,
        body: shouldAttachBody ? JSON.stringify(requestPayload.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let parsedBody: unknown = text;
      try {
        parsedBody = text ? JSON.parse(text) : null;
      } catch {
        // Keep raw text.
      }
      return { response, parsedBody };
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        throw Object.assign(new Error('timeout'), { __timeout: true });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let { response, parsedBody } = await doFetch(false);

    if (response.status === 401 && authConfig?.type === 'oauth_bearer') {
      try {
        const retry = await doFetch(true);
        response = retry.response;
        parsedBody = retry.parsedBody;
      } catch (retryError: unknown) {
        console.warn(
          `[actions-proxy] ts=${new Date().toISOString()} actionId=${params.action.id} oauthRefreshRetryFailed=${retryError instanceof Error ? retryError.message : 'unknown'}`,
        );
      }
      if (response.status === 401) {
        const durationMs = Date.now() - startedAt;
        console.warn(
          `[actions-proxy] ts=${new Date().toISOString()} actionId=${params.action.id} statusCode=401 authExpired=true`,
        );
        return {
          success: false,
          statusCode: 401,
          responseBody: parsedBody,
          durationMs,
          error: 'auth_expired',
          message: 'Action authorization expired. Please reconnect in your dashboard.',
        };
      }
    }

    const durationMs = Date.now() - startedAt;
    console.info(
      `[actions-proxy] ts=${new Date().toISOString()} actionId=${params.action.id} statusCode=${response.status}`,
    );
    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: parsedBody,
      durationMs,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startedAt;
    if (error && typeof error === 'object' && (error as { __timeout?: boolean }).__timeout) {
      console.warn(
        `[actions-proxy] ts=${new Date().toISOString()} actionId=${params.action.id} statusCode=408 timeout=true`,
      );
      return {
        success: false,
        statusCode: 408,
        responseBody: { error: 'Proxy request timed out after 10 seconds' },
        durationMs,
      };
    }
    throw error;
  }
}

export async function executeServerSideActionProxyRuntime(params: {
  chatbotId: number;
  actionId: string;
  collectedInputs: Record<string, unknown>;
  context?: { currentUrl?: string; sessionId?: string; sessionData?: Record<string, string> };
  isTest?: boolean;
}): Promise<{
  success: boolean;
  statusCode: number;
  responseBody: unknown;
  durationMs: number;
  error?: string;
  message?: string;
}> {
  const action = await prisma.action.findFirst({
    where: {
      id: params.actionId,
      chatbotId: params.chatbotId,
      type: ActionType.CUSTOM_ACTION,
      ...(params.isTest ? {} : { isEnabled: true }),
    },
    select: { id: true, chatbotId: true, config: true },
  });
  if (!action) {
    throw new Error('Enabled server-side custom action not found');
  }
  return executeServerSideCustomAction({
    action,
    collectedInputs: parseBodyObject(params.collectedInputs),
    isTest: Boolean(params.isTest),
    context: params.context,
  });
}

router.get('/:workspaceId/agents/:chatbotId/actions', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const agent = await prisma.agent.findUnique({
      where: { id: ids.chatbotId },
      select: { workspaceId: true },
    });
    if (!agent || agent.workspaceId !== ids.workspaceId) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }

    const actions = await prisma.action.findMany({
      where: { chatbotId: ids.chatbotId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ actions: actions.map(actionToClient) });
  } catch (error) {
    console.error('List actions error:', error);
    return res.status(500).json({ error: 'Failed to list actions' });
  }
});

router.get('/:workspaceId/agents/:chatbotId/active-actions', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const actions = await prisma.action.findMany({
      where: { chatbotId: ids.chatbotId, isEnabled: true },
      orderBy: { createdAt: 'asc' },
    });
    const customButtons = actions
      .filter((a) => a.type === ActionType.CUSTOM_BUTTONS)
      .map((a) => {
        const config = parseBodyObject(a.config);
        return {
          id: a.id,
          name: a.name,
          triggerInstructions: getString(config, 'triggerInstructions'),
          buttons: Array.isArray(config.buttons)
            ? config.buttons.map((row) => {
                const button = parseBodyObject(row);
                return {
                  id: getString(button, 'id'),
                  label: getString(button, 'label').slice(0, 30),
                  url: getString(button, 'url'),
                  openInNewTab: typeof button.openInNewTab === 'boolean' ? button.openInNewTab : true,
                };
              })
            : [],
        };
      });
    const customActions = actions
      .filter((a) => a.type === ActionType.CUSTOM_ACTION)
      .map((a) => {
        const config = parseBodyObject(a.config);
        return {
          id: a.id,
          name: a.name,
          actionFunctionName: getString(config, 'actionFunctionName'),
          triggerInstructions: getString(config, 'triggerInstructions'),
          executionMode: getString(config, 'executionMode'),
          inputFields: Array.isArray(config.inputFields)
            ? config.inputFields.map((field) => {
                const row = parseBodyObject(field);
                return {
                  name: getString(row, 'name'),
                  description: getString(row, 'description'),
                  required: Boolean(row.required),
                  type: getString(row, 'type') || 'string',
                };
              })
            : [],
        };
      });
    return res.json({ customButtons, customActions });
  } catch (error) {
    console.error('Get active actions error:', error);
    return res.status(500).json({ error: 'Failed to get active actions' });
  }
});

router.get('/:workspaceId/agents/:chatbotId/actions/validate-function-name', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });
    const functionName = String(req.query.functionName ?? '').trim();
    const excludeActionId = String(req.query.excludeActionId ?? '').trim() || undefined;
    if (!functionName) return res.status(400).json({ error: 'functionName is required' });
    const isUnique = await ensureFunctionNameUnique(ids.chatbotId, functionName, excludeActionId);
    return res.json({ isUnique });
  } catch (error) {
    console.error('Validate function name error:', error);
    return res.status(500).json({ error: 'Failed to validate function name' });
  }
});

router.post('/:workspaceId/agents/:chatbotId/actions', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const payload = parseBodyObject(req.body);
    const type = parseActionType(payload.type);
    const config = parseBodyObject(payload.config);
    const errors = validateActionPayload(payload);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });
    if (!type) return res.status(400).json({ error: 'Invalid action type' });

    if (type === ActionType.CUSTOM_ACTION) {
      const functionName = getString(config, 'actionFunctionName');
      const isUnique = await ensureFunctionNameUnique(ids.chatbotId, functionName);
      if (!isUnique) {
        return res.status(409).json({ error: 'Function name already exists for this chatbot' });
      }
    }

    const action = await prisma.action.create({
      data: {
        chatbotId: ids.chatbotId,
        type,
        name: getString(payload, 'name'),
        isEnabled: Boolean(payload.isEnabled),
        config: normalizeActionConfig(type, config),
      },
    });
    return res.status(201).json({ action: actionToClient(action) });
  } catch (error) {
    console.error('Create action error:', error);
    return res.status(500).json({ error: 'Failed to create action' });
  }
});

router.get('/:workspaceId/agents/:chatbotId/actions/:actionId', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const action = await prisma.action.findFirst({
      where: {
        id: req.params.actionId,
        chatbotId: ids.chatbotId,
      },
    });
    if (!action) return res.status(404).json({ error: 'Action not found' });
    return res.json({ action: actionToClient(action) });
  } catch (error) {
    console.error('Get action error:', error);
    return res.status(500).json({ error: 'Failed to get action' });
  }
});

router.put('/:workspaceId/agents/:chatbotId/actions/:actionId', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const payload = parseBodyObject(req.body);
    const existing = await prisma.action.findFirst({
      where: { id: req.params.actionId, chatbotId: ids.chatbotId },
    });
    if (!existing) return res.status(404).json({ error: 'Action not found' });

    const lastKnownUpdatedAt = getString(payload, 'lastKnownUpdatedAt');
    if (lastKnownUpdatedAt) {
      const lastKnownDate = new Date(lastKnownUpdatedAt);
      if (!Number.isNaN(lastKnownDate.getTime()) && lastKnownDate.getTime() < existing.updatedAt.getTime()) {
        return res.status(409).json({ error: 'Action was updated in another tab. Last write wins.' });
      }
    }

    const type = parseActionType(payload.type) ?? existing.type;
    const config = parseBodyObject(payload.config);
    const validationErrors = validateActionPayload({
      ...payload,
      type,
      config,
      name: getString(payload, 'name') || existing.name,
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    if (type === ActionType.CUSTOM_ACTION) {
      const fnName = getString(config, 'actionFunctionName');
      const isUnique = await ensureFunctionNameUnique(ids.chatbotId, fnName, existing.id);
      if (!isUnique) return res.status(409).json({ error: 'Function name already exists for this chatbot' });
    }

    const updated = await prisma.action.update({
      where: { id: existing.id },
      data: {
        type,
        name: getString(payload, 'name') || existing.name,
        isEnabled: typeof payload.isEnabled === 'boolean' ? payload.isEnabled : existing.isEnabled,
        config: normalizeActionConfig(type, config),
      },
    });
    return res.json({ action: actionToClient(updated) });
  } catch (error) {
    console.error('Update action error:', error);
    return res.status(500).json({ error: 'Failed to update action' });
  }
});

router.delete('/:workspaceId/agents/:chatbotId/actions/:actionId', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const deleted = await prisma.action.deleteMany({
      where: { id: req.params.actionId, chatbotId: ids.chatbotId },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Action not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Delete action error:', error);
    return res.status(500).json({ error: 'Failed to delete action' });
  }
});

router.patch('/:workspaceId/agents/:chatbotId/actions/:actionId/toggle', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const action = await prisma.action.findFirst({
      where: { id: req.params.actionId, chatbotId: ids.chatbotId },
    });
    if (!action) return res.status(404).json({ error: 'Action not found' });
    const nextEnabled = typeof req.body?.isEnabled === 'boolean' ? req.body.isEnabled : !action.isEnabled;
    if (nextEnabled) {
      const validationErrors = validateActionPayload({
        type: action.type,
        name: action.name,
        config: action.config,
      });
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: 'Action is not fully configured', details: validationErrors });
      }
    }
    const updated = await prisma.action.update({
      where: { id: action.id },
      data: { isEnabled: nextEnabled },
    });
    return res.json({ action: actionToClient(updated) });
  } catch (error) {
    console.error('Toggle action error:', error);
    return res.status(500).json({ error: 'Failed to toggle action' });
  }
});

router.post('/:workspaceId/agents/:chatbotId/actions/:actionId/test', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const canManage = await canManageAgent(userId, ids.chatbotId);
    if (!canManage) return res.status(403).json({ error: 'Access denied' });

    const action = await prisma.action.findFirst({
      where: { id: req.params.actionId, chatbotId: ids.chatbotId, type: ActionType.CUSTOM_ACTION },
      select: { id: true, chatbotId: true, config: true },
    });
    if (!action) return res.status(404).json({ error: 'Custom action not found' });

    const testInputs = parseBodyObject(req.body?.testInputs);
    const result = await executeServerSideCustomAction({
      action,
      collectedInputs: testInputs,
      isTest: true,
      context: {
        currentUrl: getString(parseBodyObject(req.body), 'currentUrl'),
        sessionId: getString(parseBodyObject(req.body), 'sessionId'),
      },
    });
    return res.json(result);
  } catch (error) {
    console.error('Test action error:', error);
    const message = error instanceof Error ? error.message : 'Action test failed';
    return res.status(400).json({ success: false, statusCode: 400, responseBody: { error: message }, durationMs: 0 });
  }
});

router.post('/:workspaceId/agents/:chatbotId/actions/proxy', async (req, res) => {
  try {
    const ids = parseWorkspaceAndChatbotIds(req);
    if (!ids) return res.status(400).json({ error: 'Invalid workspace or chatbot ID' });
    const payload = parseBodyObject(req.body);
    const actionId = getString(payload, 'actionId');
    if (!actionId) return res.status(400).json({ error: 'actionId is required' });

    const action = await prisma.action.findFirst({
      where: {
        id: actionId,
        chatbotId: ids.chatbotId,
        type: ActionType.CUSTOM_ACTION,
        isEnabled: true,
      },
      select: { id: true, chatbotId: true, config: true },
    });
    if (!action) return res.status(404).json({ error: 'Enabled server-side custom action not found' });

    const collectedInputs = parseBodyObject(payload.collectedInputs);
    const result = await executeServerSideCustomAction({
      action,
      collectedInputs,
      isTest: false,
      context: {
        currentUrl: getString(payload, 'currentUrl'),
        sessionId: getString(payload, 'sessionId'),
      },
    });
    return res.status(result.success ? 200 : 502).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy execution failed';
    const statusCode = message.toLowerCase().includes('rate limit') ? 429 : 400;
    return res.status(statusCode).json({
      success: false,
      statusCode,
      responseBody: { error: message },
      durationMs: 0,
    });
  }
});

export default router;
