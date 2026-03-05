/** Keys used during v2 onboarding to pass workspace/agent between steps */

export const ONBOARDING_WORKSPACE_KEY = 'v2_onboarding_workspace_id'
export const ONBOARDING_AGENT_KEY = 'v2_onboarding_agent_id'
export const ONBOARDING_LINK_DONE_KEY = 'v2_onboarding_link_done'
export const ONBOARDING_CRAWL_ID_KEY = 'v2_onboarding_crawl_id'
export const ONBOARDING_AGENT_NAME_KEY = 'v2_onboarding_agent_name'
export const ONBOARDING_AGENT_LOGO_KEY = 'v2_onboarding_agent_logo_url'

export function getOnboardingWorkspaceId(): number | null {
  if (typeof window === 'undefined') return null
  const id = sessionStorage.getItem(ONBOARDING_WORKSPACE_KEY)
  return id ? parseInt(id, 10) : null
}

export function setOnboardingWorkspaceId(id: number): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_WORKSPACE_KEY, String(id))
}

export function getOnboardingAgentId(): number | null {
  if (typeof window === 'undefined') return null
  const id = sessionStorage.getItem(ONBOARDING_AGENT_KEY)
  return id ? parseInt(id, 10) : null
}

export function setOnboardingAgentId(id: number): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_AGENT_KEY, String(id))
}

export function getOnboardingLinkDone(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(ONBOARDING_LINK_DONE_KEY) === '1'
}

export function setOnboardingLinkDone(): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_LINK_DONE_KEY, '1')
}

export function getOnboardingCrawlId(): number | null {
  if (typeof window === 'undefined') return null
  const id = sessionStorage.getItem(ONBOARDING_CRAWL_ID_KEY)
  return id ? parseInt(id, 10) : null
}

export function setOnboardingCrawlId(id: number): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_CRAWL_ID_KEY, String(id))
}

export function getOnboardingAgentName(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ONBOARDING_AGENT_NAME_KEY)
}

export function setOnboardingAgentName(name: string): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_AGENT_NAME_KEY, name)
}

export function getOnboardingAgentLogoUrl(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ONBOARDING_AGENT_LOGO_KEY)
}

export function setOnboardingAgentLogoUrl(url: string): void {
  if (typeof window !== 'undefined') sessionStorage.setItem(ONBOARDING_AGENT_LOGO_KEY, url)
}

export function clearOnboardingKeys(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(ONBOARDING_WORKSPACE_KEY)
    sessionStorage.removeItem(ONBOARDING_AGENT_KEY)
    sessionStorage.removeItem(ONBOARDING_LINK_DONE_KEY)
    sessionStorage.removeItem(ONBOARDING_CRAWL_ID_KEY)
    sessionStorage.removeItem(ONBOARDING_AGENT_NAME_KEY)
    sessionStorage.removeItem(ONBOARDING_AGENT_LOGO_KEY)
  }
}

/** Redirect to workspace step and clear onboarding state (e.g. after 403 or invalid workspace). */
export function resetOnboardingAndGoToWorkspace(router: { replace: (url: string) => void }): void {
  clearOnboardingKeys()
  router.replace('/v2/onboarding/workspace?session=reset')
}

/** Start "new agent" flow from dashboard: set workspace and clear step keys so Link → Configure → Personality run fresh. */
export function startNewAgentFlow(workspaceId: number): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ONBOARDING_WORKSPACE_KEY, String(workspaceId))
  sessionStorage.removeItem(ONBOARDING_LINK_DONE_KEY)
  sessionStorage.removeItem(ONBOARDING_CRAWL_ID_KEY)
  sessionStorage.removeItem(ONBOARDING_AGENT_NAME_KEY)
  sessionStorage.removeItem(ONBOARDING_AGENT_LOGO_KEY)
}

/** Redirect to dashboard when new-agent flow has no/invalid workspace (e.g. 403). */
export function redirectNewAgentToDashboard(router: { replace: (url: string) => void }): void {
  clearOnboardingKeys()
  router.replace('/v2/dashboard')
}
