'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import {
  Bot,
  ChevronDown,
  Clock,
  User,
  Settings,
  Search,
  Plus,
  Check,
  Play,
  MessageSquare,
  BarChart3,
  Database,
  Users,
  Plug,
  Palette,
  BookOpen,
  Trash2,
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { getSelectedWorkspaceId, setSelectedWorkspaceId } from '@/lib/workspace-selection'
import { startNewAgentFlow } from '@/lib/onboarding'
import { parseDashboardPath, buildDashboardUrl } from '@/lib/dashboard-url'

// Sidebar when on dashboard (Agents list). Members cannot access workspace settings or billing.
const dashboardNavItemsOwner = [
  { href: '/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
  { href: '#', label: 'Workspace settings', Icon: Settings, children: ['General', 'Members', 'Plans', 'Billing', 'API keys'] },
]
const dashboardNavItemsMember = [
  { href: '/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
]

// Map sidebar child labels to path segments (used with buildDashboardUrl)
const childPathMap: Record<string, Record<string, string>> = {
  Activity: { 'Chat logs': 'activity/chat-logs' },
  Analytics: { Chats: 'analytics/chats' },
  'Data sources': {
    Files: 'data-sources/files',
    'Q&A': 'data-sources/qa',
    Website: 'data-sources/website',
  },
  'Workspace settings': {
    General: 'settings/general',
    Members: 'members',
    Plans: '/pricing',
    Billing: 'settings/general',
    'API keys': 'settings/api-keys',
  },
  Settings: {
    General: 'settings/general',
    'API keys': 'settings/api-keys',
  },
}

// Sidebar when inside an agent (e.g. Playground, agent settings)
const agentNavItems = [
  { href: '/dashboard/playground', label: 'Playground', Icon: Play },
  { href: '#', label: 'Activity', Icon: MessageSquare, children: ['Chat logs'] },
  { href: '#', label: 'Analytics', Icon: BarChart3, children: ['Chats'] },
  { href: '#', label: 'Data sources', Icon: Database, children: ['Files', 'Q&A', 'Website'] },
  { href: '/dashboard/connected-apps', label: 'Connected Apps', Icon: Plug },
  { href: '/dashboard/settings/chatbot', label: 'Chat widget', Icon: Palette },
  { href: '#', label: 'Settings', Icon: Settings, children: ['General', 'API keys'] },
]

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, logout, refreshUser } = useAuth()
  const agentIdFromUrl = searchParams.get('agent')
  const parsed = parseDashboardPath(pathname ?? '')
  const workspaceIdFromPath = parsed.workspaceId ? parseInt(parsed.workspaceId, 10) : null
  const agentIdFromPath = parsed.agentId ?? null
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [openDropdown, setOpenDropdown] = useState<'workspace' | 'agent' | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [agentSearch, setAgentSearch] = useState('')
  const workspaces = user?.workspaces?.length ? user.workspaces : [{ id: 0, name: 'My Workspace', plan: 'free', role: 'owner' as const }]
  const [currentWorkspace, setCurrentWorkspace] = useState(workspaces[0])
  const [agents, setAgents] = useState<{ id: string; name: string; workspaceId: number }[]>([])
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; workspaceId: number } | null>(null)
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [createWorkspaceName, setCreateWorkspaceName] = useState('')
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false)
  const [createWorkspaceError, setCreateWorkspaceError] = useState('')
  const createWorkspaceInputRef = useRef<HTMLInputElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const agentRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const isOwner = user?.role === 'owner'
  const dashboardNavItems = isOwner ? dashboardNavItemsOwner : dashboardNavItemsMember

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/signin')
      return
    }
    const hasWorkspaces = (user.workspaces?.length ?? 0) > 0
    if (!hasWorkspaces) {
      router.replace('/onboarding')
    }
  }, [user, loading, router])

  // Sync currentWorkspace from URL when path has workspaceId
  useEffect(() => {
    if (workspaces.length === 0 || workspaces[0].id === 0) return
    if (workspaceIdFromPath != null) {
      const w = workspaces.find((x) => x.id === workspaceIdFromPath)
      if (w) {
        setCurrentWorkspace((prev) => (prev.id === w.id && prev.name === w.name ? prev : w))
        setSelectedWorkspaceId(w.id)
        return
      }
    }
    const selectedId = getSelectedWorkspaceId()
    const selectedWorkspace = selectedId ? workspaces.find((w) => w.id === selectedId) : null
    if (workspaces.length > 1 && !selectedWorkspace) {
      router.replace('/choose-workspace')
      return
    }
    const next = selectedWorkspace ?? workspaces[0]
    setCurrentWorkspace((prev) => (prev.id === next.id ? prev : next))
  }, [workspaces, router, workspaceIdFromPath])

  // Redirect /dashboard (no workspace in path) to /dashboard/[workspaceId]
  useEffect(() => {
    if (pathname !== '/dashboard' || !user?.workspaces?.length) return
    const selectedId = getSelectedWorkspaceId()
    const first = user.workspaces[0]
    const wId = selectedId && user.workspaces.some((w) => w.id === selectedId) ? selectedId : first.id
    router.replace(buildDashboardUrl(wId))
  }, [pathname, user?.workspaces, router])

  // Redirect old workspace-level paths (e.g. /dashboard/members) to /dashboard/[workspaceId]/...
  useEffect(() => {
    if (parsed.workspaceId || !pathname?.startsWith('/dashboard/') || pathname.startsWith('/dashboard/new-agent')) return
    const rest = pathname.replace(/^\/dashboard\/?/, '')
    const wId = currentWorkspace.id
    if (!wId) return
    if (rest === 'members') {
      router.replace(buildDashboardUrl(wId, { subPath: 'members' }))
      return
    }
    if (rest === 'settings/general' || rest === 'settings/api-keys') {
      router.replace(buildDashboardUrl(wId, { subPath: rest }))
    }
  }, [pathname, parsed.workspaceId, currentWorkspace.id, router])

  // Persist workspace choice and navigate to URL with workspace
  const handleWorkspaceSelect = (workspace: typeof workspaces[0]) => {
    setCurrentWorkspace(workspace)
    setOpenDropdown(null)
    setSelectedWorkspaceId(workspace.id)
    router.push(buildDashboardUrl(workspace.id))
  }

  // Load agents for the current workspace (must be before any early return to satisfy Rules of Hooks)
  useEffect(() => {
    if (currentWorkspace.id === 0) return
    api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/workspaces/${currentWorkspace.id}/agents`)
      .then((res) => {
        const list = (res.data.agents ?? []).map((a) => ({
          id: String(a.id),
          name: a.name,
          workspaceId: a.workspaceId,
        }))
        setAgents(list)
      })
      .catch(() => setAgents([]))
  }, [currentWorkspace.id])

  // Sync currentAgent from URL when path has agentId, or default to first in workspace
  useEffect(() => {
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    const fromPath = agentIdFromPath ? inWorkspace.find((a) => a.id === agentIdFromPath) : null
    if (fromPath) {
      setCurrentAgent((prev) => (prev?.id === fromPath.id ? prev : fromPath))
      return
    }
    if (inWorkspace.length > 0 && (!currentAgent || !inWorkspace.find((a) => a.id === currentAgent?.id))) {
      setCurrentAgent(inWorkspace[0])
    }
  }, [currentWorkspace.id, agents, currentAgent?.id, agentIdFromPath])

  // When ?agent= is set but not in list (e.g. just created from new-agent flow), refetch agents
  useEffect(() => {
    const aid = agentIdFromUrl || agentIdFromPath
    if (!aid || currentWorkspace.id === 0) return
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    const found = inWorkspace.find((a) => a.id === aid)
    if (!found) {
      api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/workspaces/${currentWorkspace.id}/agents`)
        .then((res) => {
          const list = (res.data.agents ?? []).map((a) => ({
            id: String(a.id),
            name: a.name,
            workspaceId: a.workspaceId,
          }))
          setAgents(list)
        })
        .catch(() => { })
    }
  }, [agentIdFromUrl, agentIdFromPath, currentWorkspace.id, agents])

  // Redirect old agent routes (e.g. /dashboard/playground) to /dashboard/[w]/playground/[a]
  useEffect(() => {
    if (!parsed.workspaceId && pathname && pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/new-agent')) {
      const rest = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] ?? ''
      const isOldAgentRoute = ['playground', 'settings', 'activity', 'analytics', 'data-sources', 'connected-apps'].includes(rest)
      if (isOldAgentRoute && currentWorkspace.id) {
        const agentId = agentIdFromUrl || currentAgent?.id
        if (agentId) {
          const sub = pathname.includes('chatbot') ? 'settings/chatbot' : pathname.includes('chat-logs') ? 'activity/chat-logs' : pathname.includes('chats') ? 'analytics/chats' : pathname.includes('data-sources/files') ? 'data-sources/files' : pathname.includes('data-sources/qa') ? 'data-sources/qa' : pathname.includes('data-sources/website') ? 'data-sources/website' : pathname.includes('connected-apps') ? 'connected-apps' : 'playground'
          router.replace(buildDashboardUrl(currentWorkspace.id, { agentId, subPath: sub }))
        } else if (rest === 'playground') {
          const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
          if (inWorkspace.length > 0) router.replace(buildDashboardUrl(currentWorkspace.id, { agentId: inWorkspace[0].id, subPath: 'playground' }))
        }
      }
    }
  }, [pathname, parsed.workspaceId, currentWorkspace.id, currentAgent?.id, agentIdFromUrl, router, agents])

  // After onboarding / new-agent: select the newly created agent from ?agent= and go to playground
  useEffect(() => {
    const aid = agentIdFromUrl || agentIdFromPath
    if (!aid || agents.length === 0) return
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    const found = inWorkspace.find((a) => a.id === aid)
    if (found) {
      setCurrentAgent(found)
      if (!parsed.agentId) router.replace(buildDashboardUrl(currentWorkspace.id, { agentId: found.id, subPath: 'playground' }))
    }
  }, [agentIdFromUrl, agentIdFromPath, agents, currentWorkspace.id, router, parsed.agentId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (workspaceRef.current?.contains(target) || agentRef.current?.contains(target) || userMenuRef.current?.contains(target)) return
      setOpenDropdown(null)
      setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const createAgent = useCallback(async (name?: string): Promise<{ id: string; name: string; workspaceId: number } | null> => {
    if (currentWorkspace.id === 0) return null
    try {
      const res = await api.post<{ agent: { id: number; workspaceId: number; name: string } }>(
        `/workspaces/${currentWorkspace.id}/agents`,
        { name: (name?.trim() || 'My Agent') }
      )
      const agent = res.data.agent
      const newAgent = { id: String(agent.id), name: agent.name, workspaceId: agent.workspaceId }
      setAgents((prev) => [...prev, newAgent])
      return newAgent
    } catch {
      return null
    }
  }, [currentWorkspace.id])

  useEffect(() => {
    if (agentToDelete) setDeleteConfirmText('')
  }, [agentToDelete])

  const handleConfirmDelete = useCallback(async () => {
    if (!agentToDelete || !currentWorkspace?.id || deleteConfirmText.trim() !== agentToDelete.name.trim()) return
    setDeleteLoading(true)
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/agents/${agentToDelete.id}`)
      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id))
      if (currentAgent?.id === agentToDelete.id) {
        const remaining = agents.filter((a) => a.workspaceId === currentWorkspace.id && a.id !== agentToDelete.id)
        setCurrentAgent(remaining[0] ?? null)
        setOpenDropdown(null)
        if (remaining.length > 0) router.push(buildDashboardUrl(currentWorkspace.id, { agentId: remaining[0].id, subPath: 'playground' }))
        else router.push(buildDashboardUrl(currentWorkspace.id))
      }
      setAgentToDelete(null)
      setDeleteConfirmText('')
    } catch {
      // keep modal open on error; could set error state
    } finally {
      setDeleteLoading(false)
    }
  }, [agentToDelete, currentWorkspace?.id, currentAgent?.id, agents, deleteConfirmText, router])

  useEffect(() => {
    if (createWorkspaceOpen) {
      createWorkspaceInputRef.current?.focus()
    }
  }, [createWorkspaceOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && createWorkspaceOpen && !createWorkspaceLoading) {
        setCreateWorkspaceOpen(false)
        setCreateWorkspaceError('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createWorkspaceOpen, createWorkspaceLoading])

  const handleCreateWorkspace = useCallback(async () => {
    const name = createWorkspaceName.trim()
    if (!name) {
      setCreateWorkspaceError('Workspace name is required')
      return
    }
    setCreateWorkspaceError('')
    setCreateWorkspaceLoading(true)
    try {
      const { data } = await api.post<{ workspace: { id: number; name: string; plan: string; role: string } }>('/workspaces', { name })
      await refreshUser()
      setSelectedWorkspaceId(data.workspace.id)
      setCurrentWorkspace({
        id: data.workspace.id,
        name: data.workspace.name,
        plan: data.workspace.plan,
        role: 'owner',
      })
      setCreateWorkspaceOpen(false)
      setCreateWorkspaceName('')
      router.push(buildDashboardUrl(data.workspace.id))
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Failed to create workspace'
      setCreateWorkspaceError(message || 'Failed to create workspace')
    } finally {
      setCreateWorkspaceLoading(false)
    }
  }, [createWorkspaceName, refreshUser, router])

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
      </div>
    )
  }

  const hasWorkspaces = (user.workspaces?.length ?? 0) > 0
  if (!hasWorkspaces) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
      </div>
    )
  }

  const selectedId = getSelectedWorkspaceId()
  const selectedWorkspace = selectedId ? workspaces.find((w) => w.id === selectedId) : null
  const needsWorkspaceChoice = workspaces.length > 1 && !selectedWorkspace
  if (needsWorkspaceChoice) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
      </div>
    )
  }

  const toggleExpanded = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(workspaceSearch.toLowerCase())
  )
  const agentsInWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
  const filteredAgents = agentsInWorkspace.filter((a) =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  )

  const isDashboardHome = parsed.isWorkspaceHome
  const isWorkspaceLevelRoute =
    isDashboardHome ||
    (parsed.workspaceId && pathname === `/dashboard/${parsed.workspaceId}/members`) ||
    (parsed.workspaceId && pathname?.startsWith(`/dashboard/${parsed.workspaceId}/settings/`) && !pathname.includes('chatbot'))
  const navItems = isWorkspaceLevelRoute ? dashboardNavItems : agentNavItems
  const isNewAgentFlow = pathname.startsWith('/dashboard/new-agent')
  const dashboardBase = currentWorkspace.id ? buildDashboardUrl(currentWorkspace.id) : '/dashboard'
  const agentBase = currentWorkspace.id && currentAgent?.id ? (sub: string) => buildDashboardUrl(currentWorkspace.id, { agentId: currentAgent.id, subPath: sub }) : (sub: string) => `/dashboard/${sub}`
  const getNavHref = (item: { label: string; href: string }, child?: string): string => {
    const isWorkspaceNav = isWorkspaceLevelRoute
    if (child) {
      const pathSeg = childPathMap[item.label]?.[child]
      if (pathSeg === '/pricing') return '/pricing'
      if (isWorkspaceNav && currentWorkspace.id) return pathSeg ? buildDashboardUrl(currentWorkspace.id, { subPath: pathSeg }) : '#'
      if (!isWorkspaceNav && currentWorkspace.id && currentAgent?.id && pathSeg) return buildDashboardUrl(currentWorkspace.id, { agentId: currentAgent.id, subPath: pathSeg })
      return pathSeg ? '#' : '#'
    }
    if (item.href === '/dashboard') return dashboardBase
    if (item.href === '/dashboard/playground') return agentBase('playground')
    if (item.href === '/dashboard/connected-apps') return agentBase('connected-apps')
    if (item.href === '/dashboard/settings/chatbot') return agentBase('settings/chatbot')
    if (item.href === '#') return item.href
    if (isWorkspaceNav) return dashboardBase
    return agentBase('playground')
  }
  const getChildHrefForActive = (item: { label: string }, child: string): string => {
    const pathSeg = childPathMap[item.label]?.[child]
    if (pathSeg === '/pricing') return '/pricing'
    if (isWorkspaceLevelRoute && currentWorkspace.id) return pathSeg ? buildDashboardUrl(currentWorkspace.id, { subPath: pathSeg }) : ''
    if (currentWorkspace.id && currentAgent?.id && pathSeg) return buildDashboardUrl(currentWorkspace.id, { agentId: currentAgent.id, subPath: pathSeg })
    return ''
  }

  if (isNewAgentFlow) {
    return (
      <div
        className="flex h-[100vh] min-h-0 w-full flex-col overflow-hidden bg-white px-6 sm:px-8 lg:px-10"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top, 2rem))',
        }}
      >
        <DashboardProvider currentWorkspace={currentWorkspace} agents={agentsInWorkspace} currentAgent={currentAgent} createAgent={createAgent} setAgentToDelete={setAgentToDelete}>
          {children}
        </DashboardProvider>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-white">
      {/* Full-width top header - workspace name and agent dropdowns */}
      <header className="relative flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <Link
          href={dashboardBase}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--v2-primary)] text-sm font-bold text-white hover:opacity-90 transition"
          aria-label="Dashboard"
        >
          C
        </Link>
        <span className="text-slate-300">/</span>

        {/* Workspace name (clickable → dashboard) + dropdown trigger */}
        <div className="relative flex items-center gap-0.5" ref={workspaceRef}>
          <Link
            href={dashboardBase}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            title="Go to dashboard"
          >
            <span className="font-medium">{currentWorkspace.name}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1)}</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpenDropdown((v) => (v === 'workspace' ? null : 'workspace'))}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Switch workspace"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === 'workspace' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'workspace' && (
            <div className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
              {isOwner && (
                <div className="border-b border-slate-100 px-1.5 pb-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateWorkspaceOpen(true)
                      setOpenDropdown(null)
                      setCreateWorkspaceName('')
                      setCreateWorkspaceError('')
                    }}
                    className="flex w-full items-center justify-center gap-1 rounded border border-[var(--v2-primary)] py-1.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10"
                  >
                    <Plus className="h-3 w-3" /> Create workspace
                  </button>
                </div>
              )}
              <div className="px-1.5 pt-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={workspaceSearch}
                    onChange={(e) => setWorkspaceSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-xs placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                  />
                </div>
              </div>
              <div className="mt-1 max-h-36 overflow-auto px-0.5">
                {filteredWorkspaces.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWorkspaceSelect(w)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${currentWorkspace.id === w.id ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <span>{w.name}</span>
                    {currentWorkspace.id === w.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
                {filteredWorkspaces.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-slate-500">No workspaces found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {!isWorkspaceLevelRoute && (
          <>
            <span className="text-slate-300">/</span>
            {/* Agent selector - only when inside an agent */}
            <div className="relative" ref={agentRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === 'agent' ? null : 'agent'))}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span className="font-medium">{currentAgent?.name ?? 'Agent'}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">Agent</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openDropdown === 'agent' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'agent' && (
                <div className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-1.5 pb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        startNewAgentFlow(currentWorkspace.id)
                        setOpenDropdown(null)
                        router.push('/dashboard/new-agent/link')
                      }}
                      className="flex w-full items-center justify-center gap-1 rounded border border-[var(--v2-primary)] py-1.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10"
                    >
                      <Plus className="h-3 w-3" /> Create agent
                    </button>
                  </div>
                  <div className="px-1.5 pt-1.5">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full rounded border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-xs placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                      />
                    </div>
                  </div>
                  <div className="mt-1 max-h-36 overflow-auto px-0.5">
                    {filteredAgents.map((a) => (
                      <div
                        key={a.id}
                        className={`flex w-full items-center justify-between gap-1 rounded px-2 py-1.5 text-left text-xs ${currentAgent?.id === a.id ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <button
                          type="button"
                          onClick={() => { setCurrentAgent(a); setOpenDropdown(null); router.push(buildDashboardUrl(currentWorkspace.id, { agentId: a.id, subPath: 'playground' })) }}
                          className="min-w-0 flex-1 text-left truncate"
                        >
                          {a.name}
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {currentAgent?.id === a.id && <Check className="h-3.5 w-3.5 text-slate-600" />}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setAgentToDelete({ id: a.id, name: a.name }); setOpenDropdown(null) }}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label={`Delete ${a.name}`}
                            title="Delete agent"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredAgents.length === 0 && (
                      <p className="px-2 py-3 text-center text-xs text-slate-500">No agents found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/docs"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Documentation"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Account menu"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <User className="h-4 w-4" />
            </button>
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                role="menu"
                aria-label="Account menu"
              >
                <Link
                  href="/account"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  Account settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); logout() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar - dashboard vs agent context */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <nav className="flex-1 overflow-y-auto py-3">
            {navItems.map((item) => {
              const itemHref = getNavHref(item)
              const isActive = !('children' in item && (item as { children?: string[] }).children?.length) && pathname === itemHref
              const hasChildren = 'children' in item && Array.isArray((item as { children?: string[] }).children) && (item as { children: string[] }).children.length > 0
              const isChildRoute =
                hasChildren &&
                (item as { children: string[] }).children.some(
                  (child) => pathname === getChildHrefForActive(item, child)
                )
              const isExpanded =
                hasChildren && (expanded[item.label] || isChildRoute)

              return (
                <div key={item.label} className="px-2">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.label)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <item.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {item.label}
                      <ChevronDown
                        className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={itemHref}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${isActive
                          ? 'bg-slate-200 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                      <item.Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-500'}`} strokeWidth={2} />
                      {item.label}
                    </Link>
                  )}
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                      {(item as { children: string[] }).children.map((child) => {
                        const childHref = getNavHref(item, child)
                        const isChildActive = pathname === getChildHrefForActive(item, child)
                        return (
                          <Link
                            key={child}
                            href={childHref}
                            className={`block py-1.5 text-xs ${isChildActive
                                ? 'font-medium text-slate-900'
                                : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            {child}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium text-slate-500">Credits 0 / 50</p>
            <p className="mt-0.5 text-xs text-slate-400">Resets on Apr 1, 2026 at 5:00 AM</p>
            <Link
              href="/pricing"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span>↑</span> Upgrade
            </Link>
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DashboardProvider currentWorkspace={currentWorkspace} agents={agentsInWorkspace} currentAgent={currentAgent} createAgent={createAgent} setAgentToDelete={setAgentToDelete}>
              {children}
            </DashboardProvider>
          </main>
        </div>
      </div>

      {/* Delete agent confirmation modal */}
      {agentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !deleteLoading && setAgentToDelete(null)}>
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Delete &quot;{agentToDelete.name}&quot;?</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This action cannot be undone. This will permanently delete this agent and all its data, including training files, Q&A, website crawls, and chat widget settings.
                </p>
                <p className="mt-3 text-sm font-medium text-slate-700">Type the agent name to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={agentToDelete.name}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setAgentToDelete(null); setDeleteConfirmText('') }}
                    disabled={deleteLoading}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading || deleteConfirmText.trim() !== agentToDelete.name.trim()}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create workspace modal */}
      {createWorkspaceOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !createWorkspaceLoading && (setCreateWorkspaceOpen(false), setCreateWorkspaceError(''))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-workspace-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--v2-primary)]/10 text-[var(--v2-primary)]">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="create-workspace-title" className="text-lg font-semibold text-slate-900">
                  Create workspace
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Add a new workspace to organize agents and data separately.
                </p>
                <label htmlFor="create-workspace-name" className="mt-4 block text-sm font-medium text-slate-700">
                  Workspace name
                </label>
                <input
                  id="create-workspace-name"
                  ref={createWorkspaceInputRef}
                  type="text"
                  value={createWorkspaceName}
                  onChange={(e) => setCreateWorkspaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                  placeholder="e.g. Marketing, Support"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
                  disabled={createWorkspaceLoading}
                  autoComplete="off"
                />
                {createWorkspaceError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {createWorkspaceError}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!createWorkspaceLoading) {
                        setCreateWorkspaceOpen(false)
                        setCreateWorkspaceError('')
                      }
                    }}
                    disabled={createWorkspaceLoading}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={createWorkspaceLoading || !createWorkspaceName.trim()}
                    className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {createWorkspaceLoading ? 'Creating…' : 'Create workspace'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const dashboardLayoutFallback = (
  <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
  </div>
)

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={dashboardLayoutFallback}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}
