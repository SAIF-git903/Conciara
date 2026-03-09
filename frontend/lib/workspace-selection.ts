/** Persist which workspace the user chose to work in (e.g. after login when they have multiple). */

const SELECTED_WORKSPACE_ID_KEY = 'selected_workspace_id'

export function getSelectedWorkspaceId(): number | null {
  if (typeof window === 'undefined') return null
  const id = sessionStorage.getItem(SELECTED_WORKSPACE_ID_KEY)
  return id ? parseInt(id, 10) : null
}

export function setSelectedWorkspaceId(workspaceId: number): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SELECTED_WORKSPACE_ID_KEY, String(workspaceId))
  }
}
