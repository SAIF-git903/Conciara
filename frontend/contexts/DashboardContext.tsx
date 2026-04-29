'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'

export interface DashboardWorkspace {
  id: number
  name: string
  plan: string
  role: string
}

export interface DashboardAgent {
  id: string
  name: string
  workspaceId: number
}

/** Workspace plan limits from API (in-memory, refreshed on login / create agent / invite). */
export interface WorkspaceLimits {
  workspaceId: number
  plan: string
  maxAgents: number
  currentAgents: number
  canCreateAgent: boolean
  maxMembers: number
  currentMembers: number
  canInviteMember: boolean
  hasApiAccess: boolean
}

interface DashboardContextType {
  currentWorkspace: DashboardWorkspace
  agents: DashboardAgent[]
  /** True while agents for the current workspace are being fetched (e.g. after switching workspace). */
  agentsLoading: boolean
  currentAgent: DashboardAgent | null
  createAgent: (name?: string) => Promise<DashboardAgent | null>
  /** Open the delete-agent confirmation modal (used from layout dropdown and dashboard card menu) */
  setAgentToDelete: (agent: { id: string; name: string } | null) => void
  /** Socket for real-time training progress (null until connected). */
  socket: Socket | null
  /** Refresh sidebar credits/usage (e.g. after sending a message in playground). */
  refreshUsage?: () => void
  /** Show "upgrade plan" modal when agent limit reached. */
  openAgentLimitModal?: () => void
  /** Show "upgrade plan" modal when member limit reached. */
  openMemberLimitModal?: () => void
  workspaceLimits: WorkspaceLimits | null
  workspaceLimitsLoading: boolean
  refreshWorkspaceLimits: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  currentWorkspace,
  agents,
  agentsLoading,
  currentAgent,
  createAgent,
  setAgentToDelete,
  socket,
  refreshUsage,
  openAgentLimitModal,
  openMemberLimitModal,
  workspaceLimits,
  workspaceLimitsLoading,
  refreshWorkspaceLimits,
  children,
}: {
  currentWorkspace: DashboardWorkspace
  agents: DashboardAgent[]
  agentsLoading?: boolean
  currentAgent: DashboardAgent | null
  createAgent: (name?: string) => Promise<DashboardAgent | null>
  setAgentToDelete: (agent: { id: string; name: string } | null) => void
  socket: Socket | null
  refreshUsage?: () => void
  openAgentLimitModal?: () => void
  openMemberLimitModal?: () => void
  workspaceLimits: WorkspaceLimits | null
  workspaceLimitsLoading: boolean
  refreshWorkspaceLimits: () => Promise<void>
  children: ReactNode
}) {
  return (
    <DashboardContext.Provider value={{ currentWorkspace, agents, agentsLoading: agentsLoading ?? false, currentAgent, createAgent, setAgentToDelete, socket, refreshUsage, openAgentLimitModal, openMemberLimitModal, workspaceLimits, workspaceLimitsLoading, refreshWorkspaceLimits }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (ctx === undefined) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return ctx
}

/** Safe version that returns undefined when outside DashboardProvider (e.g. permission components used in other layouts). */
export function useDashboardOptional(): DashboardContextType | undefined {
  return useContext(DashboardContext)
}
