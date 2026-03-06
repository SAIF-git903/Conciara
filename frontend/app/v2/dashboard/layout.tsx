'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useV2Auth } from '@/contexts/V2AuthContext'
import v2Api from '@/lib/v2-api'
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
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { getSelectedWorkspaceId, setSelectedWorkspaceId } from '@/lib/v2-workspace-selection'
import { startNewAgentFlow } from '@/lib/v2-onboarding'

// Sidebar when on dashboard (Agents list). Members cannot access workspace settings or billing.
const dashboardNavItemsOwner = [
  { href: '/v2/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
  { href: '#', label: 'Workspace settings', Icon: Settings, children: ['General', 'Members', 'Plans', 'Billing', 'API keys'] },
]
const dashboardNavItemsMember = [
  { href: '/v2/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
]

// Map sidebar child labels to routes (for Activity, Analytics, etc.)
const childHrefMap: Record<string, Record<string, string>> = {
  Activity: { 'Chat logs': '/v2/dashboard/activity/chat-logs' },
  Analytics: { Chats: '/v2/dashboard/analytics/chats' },
  'Data sources': {
    Files: '/v2/dashboard/data-sources/files',
    'Q&A': '/v2/dashboard/data-sources/qa',
    Website: '/v2/dashboard/data-sources/website',
  },
  'Workspace settings': {
    General: '/v2/dashboard/settings/general',
    Members: '/v2/dashboard/members',
    Plans: '/v2/pricing',
    Billing: '/v2/dashboard/settings/general',
    'API keys': '/v2/dashboard/settings/api-keys',
  },
  Settings: {
    General: '/v2/dashboard/settings/general',
    'API keys': '/v2/dashboard/settings/api-keys',
  },
}

// Sidebar when inside an agent (e.g. Playground, agent settings)
const agentNavItems = [
  { href: '/v2/dashboard/playground', label: 'Playground', Icon: Play },
  { href: '#', label: 'Activity', Icon: MessageSquare, children: ['Chat logs'] },
  { href: '#', label: 'Analytics', Icon: BarChart3, children: ['Chats'] },
  { href: '#', label: 'Data sources', Icon: Database, children: ['Files', 'Q&A', 'Website'] },
  { href: '/v2/dashboard/members', label: 'Members', Icon: Users },
  { href: '/v2/dashboard/connected-apps', label: 'Connected Apps', Icon: Plug },
  { href: '/v2/dashboard/settings/chatbot', label: 'Chat widget', Icon: Palette },
  { href: '#', label: 'Settings', Icon: Settings, children: ['General', 'API keys'] },
]

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useV2Auth()
  const agentIdFromUrl = searchParams.get('agent')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [openDropdown, setOpenDropdown] = useState<'workspace' | 'agent' | null>(null)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [agentSearch, setAgentSearch] = useState('')
  const workspaces = user?.workspaces?.length ? user.workspaces : [{ id: 0, name: 'My Workspace', plan: 'free', role: 'owner' as const }]
  const [currentWorkspace, setCurrentWorkspace] = useState(workspaces[0])
  const [agents, setAgents] = useState<{ id: string; name: string; workspaceId: number }[]>([])
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; workspaceId: number } | null>(null)
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const agentRef = useRef<HTMLDivElement>(null)
  const isOwner = user?.role === 'owner'
  const dashboardNavItems = isOwner ? dashboardNavItemsOwner : dashboardNavItemsMember

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/v2/signin')
      return
    }
    const hasWorkspaces = (user.workspaces?.length ?? 0) > 0
    if (!hasWorkspaces) {
      router.replace('/v2/onboarding')
    }
  }, [user, loading, router])

  // When user has multiple workspaces: require a chosen workspace; otherwise use stored or first
  useEffect(() => {
    if (workspaces.length === 0 || workspaces[0].id === 0) return
    const selectedId = getSelectedWorkspaceId()
    const selectedWorkspace = selectedId ? workspaces.find((w) => w.id === selectedId) : null
    if (workspaces.length > 1 && !selectedWorkspace) {
      router.replace('/v2/choose-workspace')
      return
    }
    const next = selectedWorkspace ?? workspaces[0]
    setCurrentWorkspace((prev) => (prev.id === next.id ? prev : next))
  }, [workspaces, router])

  // Persist workspace choice when user changes it via dropdown (so multi-workspace users keep selection)
  const handleWorkspaceSelect = (workspace: typeof workspaces[0]) => {
    setCurrentWorkspace(workspace)
    setOpenDropdown(null)
    setSelectedWorkspaceId(workspace.id)
  }

  // Load agents for the current workspace (must be before any early return to satisfy Rules of Hooks)
  useEffect(() => {
    if (currentWorkspace.id === 0) return
    v2Api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/v2/workspaces/${currentWorkspace.id}/agents`)
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

  useEffect(() => {
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    if (inWorkspace.length > 0 && (!currentAgent || !inWorkspace.find((a) => a.id === currentAgent?.id))) {
      setCurrentAgent(inWorkspace[0])
    }
  }, [currentWorkspace.id, agents, currentAgent?.id])

  // When ?agent= is set but not in list (e.g. just created from new-agent flow), refetch agents
  useEffect(() => {
    if (!agentIdFromUrl || currentWorkspace.id === 0) return
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    const found = inWorkspace.find((a) => a.id === agentIdFromUrl)
    if (!found) {
      v2Api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/v2/workspaces/${currentWorkspace.id}/agents`)
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
  }, [agentIdFromUrl, currentWorkspace.id, agents])

  // After onboarding / new-agent: select the newly created agent from ?agent= and go to playground
  useEffect(() => {
    if (!agentIdFromUrl || agents.length === 0) return
    const inWorkspace = agents.filter((a) => a.workspaceId === currentWorkspace.id)
    const found = inWorkspace.find((a) => a.id === agentIdFromUrl)
    if (found) {
      setCurrentAgent(found)
      router.replace('/v2/dashboard/playground')
    }
  }, [agentIdFromUrl, agents, currentWorkspace.id, router])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (workspaceRef.current?.contains(target) || agentRef.current?.contains(target)) return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const createAgent = useCallback(async (name?: string): Promise<{ id: string; name: string; workspaceId: number } | null> => {
    if (currentWorkspace.id === 0) return null
    try {
      const res = await v2Api.post<{ agent: { id: number; workspaceId: number; name: string } }>(
        `/v2/workspaces/${currentWorkspace.id}/agents`,
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
      await v2Api.delete(`/v2/workspaces/${currentWorkspace.id}/agents/${agentToDelete.id}`)
      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id))
      if (currentAgent?.id === agentToDelete.id) {
        const remaining = agents.filter((a) => a.workspaceId === currentWorkspace.id && a.id !== agentToDelete.id)
        setCurrentAgent(remaining[0] ?? null)
        setOpenDropdown(null)
        if (remaining.length > 0) router.push(`/v2/dashboard/playground?agent=${remaining[0].id}`)
        else router.push('/v2/dashboard')
      }
      setAgentToDelete(null)
      setDeleteConfirmText('')
    } catch {
      // keep modal open on error; could set error state
    } finally {
      setDeleteLoading(false)
    }
  }, [agentToDelete, currentWorkspace?.id, currentAgent?.id, agents, deleteConfirmText, router])

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

  const isDashboardHome = pathname === '/v2/dashboard'
  const navItems = isDashboardHome ? dashboardNavItems : agentNavItems
  const isNewAgentFlow = pathname.startsWith('/v2/dashboard/new-agent')

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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--v2-primary)] text-sm font-bold text-white">
          C
        </div>
        <span className="text-slate-300">/</span>

        {/* Workspace name / selector */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown((v) => (v === 'workspace' ? null : 'workspace'))}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="font-medium" title="Workspace">{currentWorkspace.name}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1)}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openDropdown === 'workspace' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'workspace' && (
            <div className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
              {isOwner && (
                <div className="border-b border-slate-100 px-1.5 pb-1.5">
                  <button type="button" className="flex w-full items-center justify-center gap-1 rounded border border-[var(--v2-primary)] py-1.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10">
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

        {!isDashboardHome && (
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
                        router.push('/v2/dashboard/new-agent/link')
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
                          onClick={() => { setCurrentAgent(a); setOpenDropdown(null) }}
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
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Profile">
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar - dashboard vs agent context */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <nav className="flex-1 overflow-y-auto py-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const hasChildren = 'children' in item && Array.isArray((item as { children?: string[] }).children) && (item as { children: string[] }).children.length > 0
              const isChildRoute =
                hasChildren &&
                (item as { children: string[] }).children.some(
                  (child) =>
                    pathname === (childHrefMap[item.label]?.[child] ?? '')
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
                      href={item.href}
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
                        const childHref =
                          childHrefMap[item.label]?.[child] ?? '#'
                        const isChildActive = pathname === childHref
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
              href="/v2/pricing"
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
