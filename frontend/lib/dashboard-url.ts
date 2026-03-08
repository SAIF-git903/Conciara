/**
 * Dashboard URL structure: /dashboard/[workspaceId] and /dashboard/[workspaceId]/.../...[agentId]
 * Keeps workspace and agent visible in the URL for bookmarking and sharing.
 */

/** Paths that end with /[agentId] (segment before last is the key). */
const AGENT_PATH_TAILS: Record<string, string> = {
  'playground': 'playground',
  'chatbot': 'settings/chatbot',
  'chat-logs': 'activity/chat-logs',
  'chats': 'analytics/chats',
  'files': 'data-sources/files',
  'qa': 'data-sources/qa',
  'website': 'data-sources/website',
  'connected-apps': 'connected-apps',
}

/** Parse pathname to get workspaceId and agentId when present. */
export function parseDashboardPath(pathname: string): {
  workspaceId: string | null
  agentId: string | null
  isWorkspaceHome: boolean
  isAgentRoute: boolean
} {
  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean)
  const workspaceId = segments[0] && /^\d+$/.test(segments[0]) ? segments[0] : null
  let agentId: string | null = null
  const last = segments[segments.length - 1]
  if (workspaceId && segments.length >= 2 && last && /^\d+$/.test(last)) {
    const beforeLast = segments[segments.length - 2]
    if (beforeLast && AGENT_PATH_TAILS[beforeLast]) agentId = last
  }
  const isWorkspaceHome = segments.length === 1 && workspaceId !== null
  const isAgentRoute = workspaceId !== null && agentId !== null
  return { workspaceId, agentId, isWorkspaceHome, isAgentRoute }
}

/** Build dashboard URL with workspace (and optional agent for agent-level routes). */
export function buildDashboardUrl(
  workspaceId: number,
  options?: { agentId?: number | string | null; subPath?: string }
): string {
  const base = `/dashboard/${workspaceId}`
  const { agentId, subPath } = options ?? {}
  if (agentId != null && agentId !== '' && subPath) {
    // Agent-level route: /dashboard/[workspaceId]/[subPath]/[agentId]
    return `${base}/${subPath}/${agentId}`
  }
  if (subPath && !agentId) {
    return `${base}/${subPath}`
  }
  return base
}

/** Sub-paths that require an agent (playground, chatbot, activity, etc.). */
export const AGENT_SUB_PATHS = [
  'playground',
  'settings/chatbot',
  'activity/chat-logs',
  'analytics/chats',
  'data-sources/files',
  'data-sources/qa',
  'data-sources/website',
  'connected-apps',
] as const
