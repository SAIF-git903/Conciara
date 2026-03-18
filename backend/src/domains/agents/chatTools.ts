/**
 * Build OpenAI tools from agent Custom API actions and execute them.
 * Used by chat routes to let the model call external APIs.
 */

import type { AgentActionRow } from './actions.service.js';
import { prisma } from '../../db/prisma.js';

const MAX_TOOL_NAME_LENGTH = 64;
const TOOL_NAME_PREFIX = 'custom_api_';

/** Single input definition for a Custom API action (stored in config.inputs). */
export interface CustomApiInputDef {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

/** OpenAI tool definition (function). */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
}

/**
 * Build a safe tool name from action id. OpenAI allows [a-zA-Z0-9_].
 */
function toolNameForAction(action: AgentActionRow): string {
  const name = `${TOOL_NAME_PREFIX}${action.id}`;
  return name.length > MAX_TOOL_NAME_LENGTH ? name.slice(0, MAX_TOOL_NAME_LENGTH) : name;
}

/**
 * Parse action id from tool name (custom_api_123).
 */
export function actionIdFromToolName(name: string): number | null {
  if (!name.startsWith(TOOL_NAME_PREFIX)) return null;
  const id = parseInt(name.slice(TOOL_NAME_PREFIX.length), 10);
  return Number.isNaN(id) ? null : id;
}

/**
 * Build OpenAI tools array from enabled custom_api actions.
 * If config.inputs is defined, each input becomes a tool parameter so the model knows
 * exactly what to collect (e.g. orderId, email) and will ask the user if required ones are missing.
 */
export function buildToolsFromCustomApiActions(actions: AgentActionRow[]): OpenAITool[] {
  return actions.map((action) => {
    const config = (action.config || {}) as {
      endpoint?: string;
      method?: string;
      whenToUse?: string;
      inputs?: CustomApiInputDef[];
    };
    const whenToUse = config.whenToUse?.trim() || action.description?.trim() || '';
    let description =
      whenToUse || `Call the API for: ${action.name}. Use when the user's question relates to this action.`;
    if (config.inputs?.length) {
      const requiredNames = config.inputs.filter((i) => i.required !== false).map((i) => i.name);
      if (requiredNames.length) {
        description += ` Ask the user for any required input they haven't provided (e.g. ${requiredNames.join(', ')}).`;
      }
    }
    description = description.slice(0, 1000);

    const inputDefs = config.inputs?.filter((i) => i?.name?.trim());
    let properties: Record<string, { type: string; description?: string }>;
    let required: string[];

    if (inputDefs?.length) {
      properties = {};
      required = [];
      for (const inp of inputDefs) {
        const key = inp.name.trim();
        if (!key) continue;
        const type = (inp.type || 'string').toLowerCase();
        const jsonType =
          type === 'number' || type === 'integer'
            ? 'number'
            : type === 'boolean'
              ? 'boolean'
              : type === 'object'
                ? 'object'
                : 'string';
        properties[key] = {
          type: jsonType,
          description: inp.description?.trim()?.slice(0, 500) || `Value for ${key}`,
        };
        if (inp.required !== false) required.push(key);
      }
    } else {
      properties = {
        inputs: {
          type: 'object',
          description:
            'Key-value pairs from the user (e.g. orderId, email). Use the exact keys the API expects. Extract from the conversation.',
        },
      };
      required = ['inputs'];
    }

    return {
      type: 'function' as const,
      function: {
        name: toolNameForAction(action),
        description,
        parameters: {
          type: 'object',
          properties,
          required: required.length ? required : undefined,
        },
      },
    };
  });
}

/**
 * Normalize tool-call args into a flat key-value map for URL/body.
 * Model may send either { orderId: "123", email: "..." } (when inputs are defined) or { inputs: { orderId: "123" } }.
 */
function normalizeInputs(args: Record<string, unknown>, inputNames?: string[]): Record<string, unknown> {
  if (args?.inputs && typeof args.inputs === 'object' && args.inputs !== null) {
    return args.inputs as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  const keys = inputNames?.length ? inputNames : Object.keys(args || {}).filter((k) => k !== 'inputs');
  for (const k of keys) {
    const v = (args || {})[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/**
 * Execute a custom API action: load action by id, build URL and request, return result as string.
 * URL placeholders: :orderId or {{orderId}} (replaced with collected input values).
 */
export async function executeCustomApiAction(
  agentId: number,
  actionId: number,
  args: Record<string, unknown>
): Promise<string> {
  const action = await prisma.agentAction.findFirst({
    where: { id: actionId, agentId, type: 'custom_api' },
  });
  if (!action) {
    return JSON.stringify({ error: 'Action not found or not a custom API action.' });
  }

  const config = (action.config || {}) as {
    endpoint?: string;
    method?: string;
    whenToUse?: string;
    inputs?: CustomApiInputDef[];
    /** Optional: return this instead of calling the API (for testing). Use {{orderId}} etc. to inject collected inputs. */
    mockResponse?: string;
    /** Optional: headers sent on every request (e.g. x-api-key, Authorization: Bearer <token>). Stored server-side only. */
    headers?: Record<string, string>;
  };
  const inputNames = config.inputs?.map((i) => i.name?.trim()).filter(Boolean);
  const inputs = normalizeInputs(args || {}, inputNames);

  const rawMock = config.mockResponse?.trim();
  if (rawMock) {
    let mockBody = rawMock;
    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === null) continue;
      const placeholder = `{{${key}}}`;
      mockBody = mockBody.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    }
    console.log('[Custom API action] mock response used', { actionId });
    return mockBody;
  }

  const endpoint = config.endpoint?.trim();
  if (!endpoint) {
    return JSON.stringify({ error: 'Action has no endpoint configured.' });
  }

  const method = (config.method || 'GET').toUpperCase();

  let url = endpoint;
  const pathParamsUsed = new Set<string>();

  for (const [key, value] of Object.entries(inputs)) {
    if (value === undefined || value === null) continue;
    const str = String(value);
    const colonPlaceholder = `:${key}`;
    const bracePlaceholder = `{{${key}}}`;
    if (url.includes(colonPlaceholder)) {
      pathParamsUsed.add(key);
      url = url.replace(new RegExp(colonPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodeURIComponent(str));
    }
    if (url.includes(bracePlaceholder)) {
      pathParamsUsed.add(key);
      url = url.replace(new RegExp(bracePlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), encodeURIComponent(str));
    }
  }

  if (method === 'GET') {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(inputs)) {
      if (value === undefined || value === null || pathParamsUsed.has(key)) continue;
      urlObj.searchParams.set(key, String(value));
    }
    url = urlObj.toString();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (config.headers && typeof config.headers === 'object') {
    for (const [k, v] of Object.entries(config.headers)) {
      if (k && typeof v === 'string' && v.trim()) {
        headers[k.trim()] = v.trim();
      }
    }
  }
  const fetchOptions: RequestInit = {
    method,
    headers,
  };
  if ((method === 'POST' || method === 'PUT') && Object.keys(inputs).length > 0) {
    const bodyInput = inputs.payload ?? inputs.body;
    if (
      (inputs.payload !== undefined || inputs.body !== undefined) &&
      typeof bodyInput === 'object' &&
      bodyInput !== null &&
      Object.keys(inputs).length === 1
    ) {
      fetchOptions.body = JSON.stringify(bodyInput);
    } else {
      fetchOptions.body = JSON.stringify(inputs);
    }
  }

  console.log('[Custom API action]', { actionId, method, url, inputs: Object.keys(inputs) });

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    if (!res.ok) {
      console.warn('[Custom API action] non-2xx', { actionId, status: res.status, url, bodyPreview: text.slice(0, 200) });
      return JSON.stringify({
        error: `API returned ${res.status}`,
        status: res.status,
        body: text.slice(0, 500),
      });
    }
    try {
      JSON.parse(text);
      return text;
    } catch {
      return text;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Custom API action] request failed', { actionId, url, message });
    return JSON.stringify({ error: 'Request failed', message });
  }
}
