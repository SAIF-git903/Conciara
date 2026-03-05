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
  createAgent: (name?: string) => Promise<DashboardAgent | null>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({
  currentWorkspace,
  agents,
  createAgent,
  children,
}: {
  currentWorkspace: DashboardWorkspace
  agents: DashboardAgent[]
  createAgent: (name?: string) => Promise<DashboardAgent | null>
  children: ReactNode
}) {
  return (
    <DashboardContext.Provider value={{ currentWorkspace, agents, createAgent }}>
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
