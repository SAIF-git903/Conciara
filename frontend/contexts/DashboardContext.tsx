'use client'

import { createContext, useContext, type ReactNode } from 'react'

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

interface DashboardContextType {
  currentWorkspace: DashboardWorkspace
  agents: DashboardAgent[]
  currentAgent: DashboardAgent | null
  createAgent: (name?: string) => Promise<DashboardAgent | null>
  /** Open the delete-agent confirmation modal (used from layout dropdown and dashboard card menu) */
  setAgentToDelete: (agent: { id: string; name: string } | null) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  currentWorkspace,
  agents,
  currentAgent,
  createAgent,
  setAgentToDelete,
  children,
}: {
  currentWorkspace: DashboardWorkspace
  agents: DashboardAgent[]
  currentAgent: DashboardAgent | null
  createAgent: (name?: string) => Promise<DashboardAgent | null>
  setAgentToDelete: (agent: { id: string; name: string } | null) => void
  children: ReactNode
}) {
  return (
    <DashboardContext.Provider value={{ currentWorkspace, agents, currentAgent, createAgent, setAgentToDelete }}>
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
