'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import api, { getSocketUrl } from '@/lib/api'
import { io as ioClient, type Socket } from 'socket.io-client'
import {
  Bot,
  ChevronDown,
  ChevronsUpDown,
  Clock,
  UserRound,
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
  Loader2,
  X,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UpgradeProvider } from '@/contexts/UpgradeContext'
import { getSelectedWorkspaceId, setSelectedWorkspaceId } from '@/lib/workspace-selection'
import { startNewAgentFlow } from '@/lib/onboarding'
import { parseDashboardPath, buildDashboardUrl } from '@/lib/dashboard-url'
import { ConciaraMark } from '@/components/branding/ConciaraMark'
import CreditUsageWidget from '@/components/CreditUsageWidget'
import PermissionButton from '@/components/PermissionButton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

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
    Plans: 'settings/plans',
    Billing: 'settings/billing',
    'API keys': 'settings/api-keys',
  },
  Settings: {
    General: 'settings/general',
  },
}

// Sidebar when inside an agent (e.g. Playground, agent settings)
const agentNavItems = [
  { href: '/dashboard/playground', label: 'Playground', Icon: Play },
  { href: '#', label: 'Activity', Icon: MessageSquare, children: ['Chat logs'] },
  { href: '#', label: 'Analytics', Icon: BarChart3, children: ['Chats'] },
  { href: '#', label: 'Data sources', Icon: Database, children: ['Files', 'Q&A', 'Website'] },
  { href: '/dashboard/connected-apps', label: 'Connected Apps', Icon: Plug },
  { href: '/dashboard/actions', label: 'Actions', Icon: Zap },
  { href: '/dashboard/settings/chatbot', label: 'Chat widget', Icon: Palette },
  { href: '#', label: 'Settings', Icon: Settings, children: ['General'] },
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
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<{ id: string; name: string; workspaceId: number } | null>(null)
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false)
  const [createWorkspaceName, setCreateWorkspaceName] = useState('')
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false)
  const [createWorkspaceError, setCreateWorkspaceError] = useState('')
  // Removed plansModal state - no longer used for frontend permissions
  // Removed workspace limits state - no longer used for frontend permissions
  const createWorkspaceInputRef = useRef<HTMLInputElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const agentRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const currentWorkspaceIdRef = useRef<number | undefined>(undefined)
  currentWorkspaceIdRef.current = currentWorkspace?.id
  const isOwner = user?.role === 'owner'
  const dashboardNavItems = isOwner ? dashboardNavItemsOwner : dashboardNavItemsMember

  // Training progress: shown only on agent pages (not on agents list); driven by socket + one initial crawl-stats
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'training' | 'complete'>('idle')
  const [trainingProgress, setTrainingProgress] = useState<{ fedLinks: number; totalLinks: number }>({ fedLinks: 0, totalLinks: 0 })
  const trainingCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [workspaceLimits, setWorkspaceLimits] = useState<any>(null)
  const [workspaceLimitsLoading, setWorkspaceLimitsLoading] = useState(false)

  // Credits usage for sidebar (current workspace)
  const [usage, setUsage] = useState<{
    includedCredits: number
    bonusCredits: number
    usedCredits: number
    remaining: number
    periodEnd: string
  } | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const fetchUsage = useCallback(async () => {
    const workspaceId = currentWorkspaceIdRef.current
    if (workspaceId == null || workspaceId === 0) {
      setUsage(null)
      return
    }
    setUsageLoading(true)
    try {
      const { data } = await api.get<{ includedCredits: number; bonusCredits: number; usedCredits: number; remaining: number; periodEnd: string }>(
        `/workspaces/${workspaceId}/usage`
      )
      if (currentWorkspaceIdRef.current === workspaceId) {
        setUsage(data ?? null)
      }
    } catch {
      if (currentWorkspaceIdRef.current === workspaceId) {
        setUsage(null)
      }
    } finally {
      if (currentWorkspaceIdRef.current === workspaceId) {
        setUsageLoading(false)
      }
    }
  }, [])

  const refreshWorkspaceLimits = useCallback(async () => {
    const workspaceId = currentWorkspaceIdRef.current
    if (workspaceId == null || workspaceId === 0) {
      setWorkspaceLimits(null)
      return
    }
    setWorkspaceLimitsLoading(true)
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/limits`)
      if (currentWorkspaceIdRef.current === workspaceId) {
        setWorkspaceLimits(data)
      }
    } catch (e) {
      if (currentWorkspaceIdRef.current === workspaceId) {
        console.error('Failed to fetch workspace limits', e)
        setWorkspaceLimits(null)
      }
    } finally {
      if (currentWorkspaceIdRef.current === workspaceId) {
        setWorkspaceLimitsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchUsage()
    refreshWorkspaceLimits()
  }, [currentWorkspace?.id, fetchUsage, refreshWorkspaceLimits])

  // Refetch usage when window gains focus (e.g. after sending a message, or returning from pricing).
  // Defer so we read the latest workspace id after React has committed (avoids stale 18/usage when switching to 20).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onFocus = () => {
      const id = currentWorkspaceIdRef.current
      if (id != null && id !== 0) {
        setTimeout(() => fetchUsage(), 0)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchUsage])

  // Listen for subscription updates (billing page return, Paddle overlay completion)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSubscriptionUpdate = (event: CustomEvent) => {
      const { workspaceId: updatedWorkspaceId } = event.detail || {}
      // Always refresh user so workspace plans in nav are up to date
      refreshUser().catch(() => {})
      if (updatedWorkspaceId === currentWorkspaceIdRef.current) {
        fetchUsage()
        refreshWorkspaceLimits()
      }
    }

    window.addEventListener('subscription-updated', handleSubscriptionUpdate as EventListener)
    return () => window.removeEventListener('subscription-updated', handleSubscriptionUpdate as EventListener)
  }, [fetchUsage, refreshWorkspaceLimits, refreshUser])

  const usagePeriodEndFormatted = usage?.periodEnd
    ? new Date(usage.periodEnd).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null

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

  // Socket: connect when user is present (dashboard); expose via context for e.g. Data sources page
  useEffect(() => {
    if (!user) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return
    const s = ioClient(getSocketUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    setSocket(s)
    return () => {
      s.disconnect()
      setSocket(null)
    }
  }, [user])

  // Subscribe socket to workspace room for real-time credits updates
  const subscribedWorkspaceIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!socket || !currentWorkspace?.id || currentWorkspace.id === 0) return
    const id = currentWorkspace.id
    if (subscribedWorkspaceIdRef.current === id) return
    const prev = subscribedWorkspaceIdRef.current
    if (prev != null) {
      socket.emit('unsubscribe-workspace', prev)
      subscribedWorkspaceIdRef.current = null
    }
    socket.emit('subscribe-workspace', id, (res: { ok?: boolean }) => {
      if (res?.ok) subscribedWorkspaceIdRef.current = id
    })
    return () => {
      socket.emit('unsubscribe-workspace', id)
      if (subscribedWorkspaceIdRef.current === id) subscribedWorkspaceIdRef.current = null
    }
  }, [socket, currentWorkspace?.id])

  // Agent page only: one initial crawl-stats + subscribe to socket for training progress; show progress only here
  useEffect(() => {
    const workspaceId = currentWorkspace?.id
    const agentId = currentAgent?.id
    const onAgentPage = parsed.isAgentRoute && !!agentId && !!workspaceId
    if (!onAgentPage || typeof agentId !== 'string') return

    if (!socket) return

    // Reset training UI for this agent so we never show another agent's progress
    setTrainingStatus('idle')
    setTrainingProgress({ fedLinks: 0, totalLinks: 0 })

    let cancelled = false

    const onProgress = (payload: { agentId: number; trainedLinksSoFar: number; totalLinks: number }) => {
      if (cancelled || String(payload.agentId) !== agentId) return
      setTrainingProgress({ fedLinks: payload.trainedLinksSoFar, totalLinks: payload.totalLinks })
      setTrainingStatus('training')
    }
    const onComplete = (payload: { agentId: number }) => {
      if (cancelled || String(payload.agentId) !== agentId) return
      setTrainingStatus('complete')
      if (trainingCompleteTimeoutRef.current) clearTimeout(trainingCompleteTimeoutRef.current)
      trainingCompleteTimeoutRef.current = setTimeout(() => {
        setTrainingStatus('idle')
        trainingCompleteTimeoutRef.current = null
      }, 6000)
    }

    api
      .get<{
        trainingInProgress: boolean
        trainedLinksSoFar: number | null
        totalLinksProgress: number | null
        linkCount: number
      }>(`/workspaces/${workspaceId}/agents/${agentId}/crawl-stats`)
      .then(({ data }) => {
        if (cancelled) return
        const fed = data.trainedLinksSoFar ?? 0
        const total = data.totalLinksProgress ?? data.linkCount ?? 0
        setTrainingProgress({ fedLinks: fed, totalLinks: total })
        if (data.trainingInProgress) {
          setTrainingStatus('training')
        } else {
          // This agent is not training — clear any stale state from another agent
          setTrainingStatus('idle')
        }
      })
      .catch(() => { })

    socket.emit('subscribe-agent', agentId)
    socket.on('crawl-training-progress', onProgress)
    socket.on('crawl-training-complete', onComplete)

    return () => {
      cancelled = true
      socket.emit('unsubscribe-agent', agentId)
      socket.off('crawl-training-progress', onProgress)
      socket.off('crawl-training-complete', onComplete)
      if (trainingCompleteTimeoutRef.current) {
        clearTimeout(trainingCompleteTimeoutRef.current)
        trainingCompleteTimeoutRef.current = null
      }
    }
  }, [currentWorkspace?.id, currentAgent?.id, parsed.isAgentRoute, socket])

  // Sync currentWorkspace from URL when path has workspaceId
  useEffect(() => {
    if (workspaces.length === 0 || workspaces[0].id === 0) return
    if (workspaceIdFromPath != null) {
      const w = workspaces.find((x) => x.id === workspaceIdFromPath)
      if (w) {
        setCurrentWorkspace((prev) => (prev.id === w.id && prev.name === w.name && prev.plan === w.plan ? prev : w))
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
    setCurrentWorkspace((prev) => (prev.id === next.id && prev.plan === next.plan ? prev : next))
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
    if (parsed.workspaceId || !pathname?.startsWith('/dashboard/') || pathname.includes('/new-agent')) return
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
    const workspaceId = currentWorkspace.id
    if (workspaceId === 0) {
      setAgents([])
      setAgentsLoading(false)
      return
    }
    let cancelled = false
    setAgentsLoading(true)
    api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/workspaces/${workspaceId}/agents`)
      .then((res) => {
        if (cancelled || currentWorkspaceIdRef.current !== workspaceId) return
        const list = (res.data.agents ?? []).map((a) => ({
          id: String(a.id),
          name: a.name,
          workspaceId: a.workspaceId,
        }))
        setAgents(list)
      })
      .catch(() => {
        if (cancelled || currentWorkspaceIdRef.current !== workspaceId) return
        setAgents([])
      })
      .finally(() => {
        if (cancelled || currentWorkspaceIdRef.current !== workspaceId) return
        setAgentsLoading(false)
      })
    return () => {
      cancelled = true
    }
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
    const workspaceId = currentWorkspace.id
    if (!aid || workspaceId === 0) return
    const inWorkspace = agents.filter((a) => a.workspaceId === workspaceId)
    const found = inWorkspace.find((a) => a.id === aid)
    if (!found) {
      let cancelled = false
      api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(`/workspaces/${workspaceId}/agents`)
        .then((res) => {
          if (cancelled || currentWorkspaceIdRef.current !== workspaceId) return
          const list = (res.data.agents ?? []).map((a) => ({
            id: String(a.id),
            name: a.name,
            workspaceId: a.workspaceId,
          }))
          setAgents(list)
        })
        .catch(() => { })
      return () => {
        cancelled = true
      }
    }
  }, [agentIdFromUrl, agentIdFromPath, currentWorkspace.id, agents])

  // Redirect old agent routes (e.g. /dashboard/playground) to /dashboard/[w]/playground/[a]
  useEffect(() => {
    if (!parsed.workspaceId && pathname && pathname.startsWith('/dashboard/') && !pathname.includes('/new-agent')) {
      const rest = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] ?? ''
      const isOldAgentRoute = ['playground', 'settings', 'activity', 'analytics', 'data-sources', 'connected-apps', 'actions'].includes(rest)
      if (isOldAgentRoute && currentWorkspace.id) {
        const agentId = agentIdFromUrl || currentAgent?.id
        if (agentId) {
          const sub = pathname.includes('chatbot') ? 'settings/chatbot' : pathname.includes('chat-logs') ? 'activity/chat-logs' : pathname.includes('chats') ? 'analytics/chats' : pathname.includes('data-sources/files') ? 'data-sources/files' : pathname.includes('data-sources/qa') ? 'data-sources/qa' : pathname.includes('data-sources/website') ? 'data-sources/website' : pathname.includes('connected-apps') ? 'connected-apps' : pathname.includes('/actions') ? 'actions' : 'playground'
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
      // Removed fetchWorkspaceLimits call
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
    (parsed.workspaceId && pathname === `/dashboard/${parsed.workspaceId}/usage`) ||
    (parsed.workspaceId && pathname === `/dashboard/${parsed.workspaceId}/members`) ||
    (parsed.workspaceId && pathname?.startsWith(`/dashboard/${parsed.workspaceId}/settings/`) && !pathname.includes('chatbot') && !parsed.isAgentRoute)
  const navItems = isWorkspaceLevelRoute ? dashboardNavItems : agentNavItems
  const isNewAgentFlow = pathname.includes('/new-agent')
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
    if (item.href === '/dashboard/actions') return agentBase('actions')
    if (item.href === '/dashboard/settings/chatbot') return agentBase('settings/chatbot')
    if (item.label === 'Usage' && currentWorkspace.id) return buildDashboardUrl(currentWorkspace.id, { subPath: 'usage' })
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
        <UpgradeProvider>
            <DashboardProvider currentWorkspace={currentWorkspace} agents={agentsInWorkspace} agentsLoading={agentsLoading} currentAgent={currentAgent} createAgent={createAgent} setAgentToDelete={setAgentToDelete} socket={socket} refreshUsage={fetchUsage} openAgentLimitModal={undefined} openMemberLimitModal={undefined} workspaceLimits={workspaceLimits} workspaceLimitsLoading={workspaceLimitsLoading} refreshWorkspaceLimits={refreshWorkspaceLimits}>
            {children}
          </DashboardProvider>
        </UpgradeProvider>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-white">
      <header className="relative z-40 flex min-h-[3.25rem] shrink-0 items-center gap-2 border-b border-slate-200/80 bg-[rgb(248,250,252)] px-3 sm:gap-3 sm:px-5">
        <nav className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-label="Workspace">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-sm ring-1 ring-slate-900/5 transition-[box-shadow,transform] duration-200 hover:shadow-md active:scale-[0.98]"
            aria-label="Conciara home"
          >
            <ConciaraMark size={20} tone="onDark" />
          </Link>

          <span className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

          {/* Workspace: name links home; only chevron opens the menu */}
          <div className="relative flex min-w-0 items-stretch rounded-lg" ref={workspaceRef}>
            <Link
              href={dashboardBase}
              className="flex min-w-0 max-w-[min(36vw,12rem)] sm:max-w-[15rem] items-center gap-2 py-2 pl-2 pr-2 text-sm text-slate-800 sm:pl-2.5"
              title="Agents and workspace home"
            >
              <span className="min-w-0 truncate font-medium tracking-tight">{currentWorkspace.name}</span>
              <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                {currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1)}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpenDropdown((v) => (v === 'workspace' ? null : 'workspace'))}
              className={`flex shrink-0 items-center rounded-md px-2 py-1 text-slate-400 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-700 ${
                openDropdown === 'workspace' ? 'bg-slate-100/90 text-slate-700' : ''
              }`}
              aria-expanded={openDropdown === 'workspace'}
              aria-haspopup="true"
              aria-label="Open workspace list"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            </button>
            <AnimatePresence>
              {openDropdown === 'workspace' && (
                <motion.div
                  key="workspace-menu"
                  role="menu"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-full z-50 mt-1.5 w-64 origin-top-left overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.2)] backdrop-blur-md"
                >
                  {isOwner && (
                    <div className="border-b border-slate-100 px-2 pb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateWorkspaceOpen(true)
                          setOpenDropdown(null)
                          setCreateWorkspaceName('')
                          setCreateWorkspaceError('')
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--v2-primary)] py-2 text-xs font-medium text-[var(--v2-primary)] transition-colors duration-200 hover:bg-[var(--v2-primary)]/10"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        New workspace
                      </button>
                    </div>
                  )}
                  <div className="px-2 pt-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                      <input
                        type="text"
                        value={workspaceSearch}
                        onChange={(e) => setWorkspaceSearch(e.target.value)}
                        placeholder="Find workspace…"
                        className="w-full rounded-lg border border-slate-200/90 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/15"
                      />
                    </div>
                  </div>
                  <div className="mt-1 max-h-36 overflow-auto px-1">
                    {filteredWorkspaces.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleWorkspaceSelect(w)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors duration-150 ${
                          currentWorkspace.id === w.id
                            ? 'bg-slate-100 font-medium text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="min-w-0 truncate">{w.name}</span>
                        {currentWorkspace.id === w.id && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--v2-primary)]" aria-hidden />
                        )}
                      </button>
                    ))}
                    {filteredWorkspaces.length === 0 && (
                      <p className="px-2 py-3 text-center text-xs text-slate-500">No matches</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isWorkspaceLevelRoute && (
            <>
              <span className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
              <div className="relative min-w-0" ref={agentRef}>
                <div className="flex min-w-0 items-stretch rounded-lg">
                  {currentAgent?.id ?? agentIdFromPath ? (
                    <Link
                      href={buildDashboardUrl(currentWorkspace.id, {
                        agentId: (currentAgent?.id ?? agentIdFromPath) as string,
                        subPath: 'playground',
                      })}
                      className="flex min-w-0 max-w-[min(36vw,11rem)] sm:max-w-[15rem] items-center py-2 pl-2 pr-2 text-sm text-slate-800 transition-colors duration-200 hover:bg-slate-50/80 sm:pl-2.5"
                      title="Open Playground"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium tracking-tight">
                        {currentAgent?.name ?? 'Agent'}
                      </span>
                    </Link>
                  ) : (
                    <span className="flex min-w-0 max-w-[min(36vw,11rem)] items-center py-2 pl-2 pr-2 text-sm text-slate-500 sm:pl-2.5">
                      <span className="min-w-0 flex-1 truncate">Agent</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenDropdown((v) => (v === 'agent' ? null : 'agent'))}
                    className={`flex shrink-0 items-center rounded-md px-2 py-1 text-slate-400 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-700 ${
                      openDropdown === 'agent' ? 'bg-slate-100/90 text-slate-700' : ''
                    }`}
                    aria-expanded={openDropdown === 'agent'}
                    aria-haspopup="true"
                    aria-label="Open agent list"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                  </button>
                </div>
                <AnimatePresence>
                  {openDropdown === 'agent' && (
                    <motion.div
                      key="agent-menu"
                      role="menu"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute left-0 top-full z-50 mt-1.5 w-64 origin-top-left overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.2)] backdrop-blur-md"
                    >
                      <div className="border-b border-slate-100 px-2 pb-2">
                        <PermissionButton
                          feature="createAgent"
                          onClick={() => {
                            setOpenDropdown(null)
                            startNewAgentFlow(currentWorkspace.id)
                            router.push(buildDashboardUrl(currentWorkspace.id) + '/new-agent/link')
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 rounded-lg border-[var(--v2-primary)] text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10"
                          showCrownIcon
                        >
                          <Plus className="h-3.5 w-3.5" /> New agent
                        </PermissionButton>
                      </div>
                      <div className="px-2 pt-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                          <input
                            type="text"
                            value={agentSearch}
                            onChange={(e) => setAgentSearch(e.target.value)}
                            placeholder="Find agent…"
                            className="w-full rounded-lg border border-slate-200/90 bg-slate-50 py-2 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/15"
                          />
                        </div>
                      </div>
                      <div className="mt-1 max-h-36 overflow-auto px-1">
                        {agentsLoading ? (
                          <>
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-2.5" aria-hidden>
                                <div className="h-4 w-8 shrink-0 rounded bg-slate-200/80" />
                                <div className="h-4 flex-1 rounded bg-slate-100" />
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            {filteredAgents.map((a) => (
                              <div
                                key={a.id}
                                className={`flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-left text-xs ${
                                  currentAgent?.id === a.id
                                    ? 'bg-slate-100 font-medium text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setCurrentAgent(a)
                                    setOpenDropdown(null)
                                    router.push(buildDashboardUrl(currentWorkspace.id, { agentId: a.id, subPath: 'playground' }))
                                  }}
                                  className="min-w-0 flex-1 truncate text-left transition-colors duration-150"
                                >
                                  {a.name}
                                </button>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  {currentAgent?.id === a.id && (
                                    <Check className="h-3.5 w-3.5 text-[var(--v2-primary)]" aria-hidden />
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAgentToDelete({ id: a.id, name: a.name })
                                      setOpenDropdown(null)
                                    }}
                                    className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                                    aria-label={`Delete ${a.name}`}
                                    title="Remove agent"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {filteredAgents.length === 0 && (
                              <p className="px-2 py-3 text-center text-xs text-slate-500">No matches</p>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/docs"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Product documentation"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${
                userMenuOpen ? 'bg-slate-100 text-slate-900' : ''
              }`}
              aria-label="Account"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  key="account-menu"
                  role="menu"
                  aria-label="Account"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full z-50 mt-1.5 w-52 origin-top-right overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.2)] backdrop-blur-md"
                >
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    Account
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <UpgradeProvider>
        <DashboardProvider currentWorkspace={currentWorkspace} agents={agentsInWorkspace} agentsLoading={agentsLoading} currentAgent={currentAgent} createAgent={createAgent} setAgentToDelete={setAgentToDelete} socket={socket} refreshUsage={fetchUsage} openAgentLimitModal={undefined} openMemberLimitModal={undefined} workspaceLimits={workspaceLimits} workspaceLimitsLoading={workspaceLimitsLoading} refreshWorkspaceLimits={refreshWorkspaceLimits}>
          <div className="flex min-h-0 flex-1">
            {/* Left sidebar — matches main dashboard surface; clear active / nested hierarchy */}
            <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200/80 bg-[rgb(248,250,252)]">
              <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-3" aria-label="Dashboard">
                {navItems.map((item) => {
                  const itemHref = getNavHref(item)
                  const isActive = !('children' in item && (item as { children?: string[] }).children?.length) && pathname === itemHref
                  const hasChildren = 'children' in item && Array.isArray((item as { children?: string[] }).children) && (item as { children: string[] }).children.length > 0
                  const isChildRoute =
                    hasChildren &&
                    (item as { children: string[] }).children.some(
                      (child) => pathname === getChildHrefForActive(item, child)
                    )
                  const sectionValue = `nav-${item.label}`
                  const isSectionOpen = Boolean(expanded[item.label] || isChildRoute)

                  if (!hasChildren) {
                    return (
                      <div key={item.label}>
                        <Link
                          href={itemHref}
                          className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(248,250,252)] ${
                            isActive
                              ? 'bg-white font-semibold text-slate-900 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/55'
                              : 'font-medium text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                          }`}
                        >
                          <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center" aria-hidden>
                            <item.Icon
                              className={`h-4 w-4 ${isActive ? 'text-[var(--v2-primary)]' : 'text-slate-400'}`}
                              strokeWidth={2}
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      </div>
                    )
                  }

                  return (
                    <Accordion
                      key={item.label}
                      type="single"
                      collapsible
                      value={isSectionOpen ? sectionValue : ''}
                      onValueChange={(v) => {
                        const nextOpen = v === sectionValue
                        if (isChildRoute && !nextOpen) return
                        setExpanded((prev) => ({ ...prev, [item.label]: nextOpen }))
                      }}
                    >
                      <AccordionItem value={sectionValue} className="w-full border-0">
                        {/* Parent row stays neutral: no “active” or “open” fill — only the child link shows selection. */}
                        <AccordionTrigger className="w-full min-w-0 gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100/90 hover:text-slate-900 hover:no-underline focus-visible:ring-2 focus-visible:ring-[var(--v2-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(248,250,252)] data-[state=open]:bg-transparent data-[state=open]:text-slate-600 data-[state=open]:shadow-none data-[state=open]:ring-0">
                          <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center" aria-hidden>
                            <item.Icon className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </AccordionTrigger>
                        <AccordionContent className="ml-4 space-y-px border-l border-slate-200/70 pb-0.5 pl-2.5 pt-1">
                          {(item as { children: string[] }).children.map((child) => {
                            const childHref = getNavHref(item, child)
                            const isChildActive = pathname === getChildHrefForActive(item, child)
                            return (
                              <Link
                                key={child}
                                href={childHref}
                                className={`block rounded-md py-1.5 pl-2 pr-1.5 text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-primary)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(248,250,252)] ${
                                  isChildActive
                                    ? 'bg-white font-semibold text-slate-900 shadow-[0_2px_6px_-2px_rgba(15,23,42,0.1)] ring-1 ring-slate-300/55'
                                    : 'text-slate-500 hover:bg-slate-100/90 hover:text-slate-800'
                                }`}
                              >
                                {child}
                              </Link>
                            )
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )
                })}
              </nav>
              <div className="border-t border-slate-200/80 bg-[rgb(248,250,252)] p-3">
                {currentWorkspace.id ? (
                  <CreditUsageWidget />
                ) : (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Credits</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Select a workspace to see usage.</p>
                    <Link
                      href="/pricing"
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors duration-200 hover:bg-slate-50"
                    >
                      <span aria-hidden>↑</span> Upgrade
                    </Link>
                  </>
                )}
              </div>
            </aside>

            {/* Main content area */}
            <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
          </main>
            </div>
          </div>
        </DashboardProvider>
      </UpgradeProvider>

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

      {/* Removed PlansModal - no longer used for frontend permissions */}

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
                  New workspace
                </h3>
                <p className="mt-1 text-sm text-slate-600">Separate agents, data, and billing by workspace.</p>
                <label htmlFor="create-workspace-name" className="mt-4 block text-sm font-medium text-slate-700">
                  Name
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
                    {createWorkspaceLoading ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training progress — only on agent pages (not on agents list); real-time via socket */}
      {parsed.isAgentRoute && (trainingStatus === 'training' || trainingStatus === 'complete') && (
        <div className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)]" aria-live="polite">
          {trainingStatus === 'training' ? (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--v2-primary)]/10">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--v2-primary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Training website content</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {trainingProgress.totalLinks > 0
                    ? `${trainingProgress.fedLinks}/${trainingProgress.totalLinks} links (${Math.min(100, Math.round((trainingProgress.fedLinks / trainingProgress.totalLinks) * 100))}%). `
                    : ''}
                  You can chat now.
                </p>
                {trainingProgress.totalLinks > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[var(--v2-primary)] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((trainingProgress.fedLinks / trainingProgress.totalLinks) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Training complete</p>
                <p className="mt-0.5 text-xs text-slate-600">Website content is ready.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (trainingCompleteTimeoutRef.current) {
                    clearTimeout(trainingCompleteTimeoutRef.current)
                    trainingCompleteTimeoutRef.current = null
                  }
                  setTrainingStatus('idle')
                }}
                className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
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
