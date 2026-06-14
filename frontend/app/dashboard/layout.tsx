'use client'

import { ConciaraMark } from '@/components/branding/ConciaraMark'
import NotificationBell from '@/components/NotificationBell'
import PermissionButton from '@/components/PermissionButton'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { UpgradeProvider } from '@/contexts/UpgradeContext'
import api, { getSocketUrl } from '@/lib/api'
import { buildDashboardUrl, parseDashboardPath } from '@/lib/dashboard-url'
import { startNewAgentFlow } from '@/lib/onboarding'
import { getSelectedWorkspaceId, setSelectedWorkspaceId } from '@/lib/workspace-selection'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  Check,
  ChevronsUpDown,
  Clock,
  Command,
  CreditCard,
  Key,
  Loader2,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { io as ioClient, type Socket } from 'socket.io-client'

// Sidebar when on dashboard (Agents list). Members cannot access workspace settings or billing.
const dashboardNavItemsOwner = [
  { href: '/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
  { href: '#', label: 'Workspace settings', Icon: Settings, children: ['General', 'Members', 'Notifications', 'Audit logs', 'Plans', 'Billing', 'API keys'] },
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
    Notifications: 'settings/notifications',
    'Audit logs': 'settings/audit-logs',
    Plans: 'settings/plans',
    Billing: 'settings/billing',
    'API keys': 'settings/api-keys',
  },
  Settings: {
    General: 'settings/general',
  },
}

function DesignIcon({ name, active, size = 16 }: { name: string; active: boolean; size?: number }) {
  const c = active ? 'var(--accent)' : 'var(--ink-4)'
  const sw = active ? 2.2 : 1.75
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'play':
      return <svg {...p} stroke="none"><path d="M6 4v16l14-8z" fill={c} /></svg>
    case 'scroll':
      return <svg {...p}><path d="M8 21h8a3 3 0 0 0 3-3V7a4 4 0 0 1-4-4H7a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3z" /><path d="M8 7h7M8 11h7M8 15h5" /></svg>
    case 'usage':
      return <svg {...p}><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-6" /></svg>
    case 'book':
      return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
    case 'external':
      return <svg {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" /></svg>
    case 'file':
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></svg>
    case 'globe':
      return <svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    case 'plug':
      return <svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
    case 'spark':
      return <svg {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
    case 'bot':
      return <svg {...p}><rect x="4" y="7" width="16" height="13" rx="3" /><path d="M12 7V3M9 3h6" /><circle cx="9" cy="13" r=".8" fill={c} stroke="none" /><circle cx="15" cy="13" r=".8" fill={c} stroke="none" /><path d="M9 17h6" /></svg>
    case 'settings':
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
    default:
      return null
  }
}

// Sidebar when inside an agent (e.g. Playground, agent settings)
const agentNavItems = [
  { href: '/dashboard/playground', label: 'Playground', icon: 'play' },
  { href: '#', label: 'Activity', icon: 'scroll', children: ['Chat logs'] },
  { href: '#', label: 'Analytics', icon: 'usage', children: ['Chats'] },
  { href: '#', label: 'Data sources', icon: 'file', children: ['Files', 'Q&A', 'Website'] },
  { href: '/dashboard/connected-apps', label: 'Connected Apps', icon: 'plug' },
  { href: '/dashboard/actions', label: 'Actions', icon: 'spark' },
  { href: '/dashboard/settings/chatbot', label: 'Chat widget', icon: 'bot' },
  { href: '#', label: 'Settings', icon: 'settings', children: ['General'] },
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

  const refreshAgentsForWorkspace = useCallback(async (workspaceId: number) => {
    if (!workspaceId || workspaceId === 0) {
      setAgents([])
      setAgentsLoading(false)
      return
    }
    setAgentsLoading(true)
    try {
      const res = await api.get<{ agents: Array<{ id: number; workspaceId: number; name: string }> }>(
        `/workspaces/${workspaceId}/agents`
      )
      if (currentWorkspaceIdRef.current !== workspaceId) return
      const list = (res.data.agents ?? []).map((a) => ({
        id: String(a.id),
        name: a.name,
        workspaceId: a.workspaceId,
      }))
      setAgents(list)
    } catch {
      if (currentWorkspaceIdRef.current !== workspaceId) return
      setAgents([])
    } finally {
      if (currentWorkspaceIdRef.current === workspaceId) {
        setAgentsLoading(false)
      }
    }
  }, [])

  const bumpWorkspaceAgentUsage = useCallback((delta: number) => {
    if (!delta) return
    setWorkspaceLimits((prev: any) => {
      if (!prev || typeof prev.currentAgents !== 'number' || typeof prev.maxAgents !== 'number') return prev
      const nextCurrentAgents = Math.max(0, prev.currentAgents + delta)
      return {
        ...prev,
        currentAgents: nextCurrentAgents,
        canCreateAgent: nextCurrentAgents < prev.maxAgents,
      }
    })
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
      refreshUser().catch(() => { })
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
          // This agent is not training �" clear any stale state from another agent
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
    refreshAgentsForWorkspace(workspaceId)
  }, [currentWorkspace.id, refreshAgentsForWorkspace])

  // Onboarding creates agents outside this layout's createAgent helper, so listen and refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onAgentCreated = (
      event: Event
    ) => {
      const custom = event as CustomEvent<{
        workspaceId?: number
        agent?: { id: string; name: string; workspaceId: number }
      }>
      const workspaceId = custom.detail?.workspaceId
      if (!workspaceId || workspaceId !== currentWorkspaceIdRef.current) return
      const createdAgent = custom.detail?.agent
      if (createdAgent) {
        setAgents((prev) => (prev.some((a) => a.id === createdAgent.id) ? prev : [...prev, createdAgent]))
      }
      refreshAgentsForWorkspace(workspaceId).catch(() => { })
      refreshWorkspaceLimits().catch(() => { })
    }
    window.addEventListener('dashboard-agent-created', onAgentCreated as EventListener)
    return () => window.removeEventListener('dashboard-agent-created', onAgentCreated as EventListener)
  }, [refreshAgentsForWorkspace, refreshWorkspaceLimits])

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
      // Keep permissions in sync immediately, then reconcile with server.
      bumpWorkspaceAgentUsage(1)
      refreshWorkspaceLimits().catch(() => { })
      return newAgent
    } catch {
      return null
    }
  }, [currentWorkspace.id, bumpWorkspaceAgentUsage, refreshWorkspaceLimits])

  useEffect(() => {
    if (agentToDelete) setDeleteConfirmText('')
  }, [agentToDelete])

  const handleConfirmDelete = useCallback(async () => {
    if (!agentToDelete || !currentWorkspace?.id || deleteConfirmText.trim() !== agentToDelete.name.trim()) return
    setDeleteLoading(true)
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/agents/${agentToDelete.id}`)
      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id))
      // Keep permissions in sync immediately, then reconcile with server.
      bumpWorkspaceAgentUsage(-1)
      refreshWorkspaceLimits().catch(() => { })
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
  }, [agentToDelete, currentWorkspace?.id, currentAgent?.id, agents, deleteConfirmText, router, bumpWorkspaceAgentUsage, refreshWorkspaceLimits])

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  const hasWorkspaces = (user.workspaces?.length ?? 0) > 0
  if (!hasWorkspaces) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  const selectedId = getSelectedWorkspaceId()
  const selectedWorkspace = selectedId ? workspaces.find((w) => w.id === selectedId) : null
  const needsWorkspaceChoice = workspaces.length > 1 && !selectedWorkspace
  if (needsWorkspaceChoice) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
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
        className="flex h-[100vh] min-h-0 w-full flex-col overflow-hidden px-6 sm:px-8 lg:px-10"
        style={{ background: 'var(--bg)', paddingTop: 'max(2rem, env(safe-area-inset-top, 2rem))' }}
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
    <div className="flex h-full w-full min-h-0 flex-col" style={{ background: 'var(--bg)' }}>
      {/* �"��"� Topbar �"��"� 52px sticky */}
      <header className="relative z-40 flex h-[52px] shrink-0 items-center gap-3 border-b" style={{ borderColor: 'var(--line)', background: 'var(--bg)', padding: '0 14px 0 12px' }}>
        {/* Workspace switcher */}
        <div className="relative flex min-w-0 items-center" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown((v) => (v === 'workspace' ? null : 'workspace'))}
            className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--bg-2)]"
            style={{ color: 'var(--ink)' }}
            aria-expanded={openDropdown === 'workspace'}
            aria-haspopup="true"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]" style={{ background: 'var(--ink)', color: '#fff' }}>
              <ConciaraMark size={15} tone="onDark" />
            </span>
            <span className="flex min-w-0 flex-col" style={{ gap: 1 }}>
              <span className="min-w-0 max-w-[10rem] truncate leading-none" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{currentWorkspace.name}</span>
              <span className="leading-none flex items-start" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.01em' }}>{currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1)}</span>
            </span>
            <ChevronsUpDown className="h-[12px] w-[12px] shrink-0" style={{ color: 'var(--ink-4)' }} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {openDropdown === 'workspace' && (
              <motion.div
                key="workspace-menu"
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-full z-50 mt-1.5 w-64 origin-top-left overflow-hidden rounded-xl py-1.5 shadow-[0_12px_40px_-8px_rgba(26,26,29,0.18)]"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                {isOwner && (
                  <div className="border-b px-2 pb-2" style={{ borderColor: 'var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateWorkspaceOpen(true)
                        setOpenDropdown(null)
                        setCreateWorkspaceName('')
                        setCreateWorkspaceError('')
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors"
                      style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      New workspace
                    </button>
                  </div>
                )}
                <div className="px-2 pt-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--ink-4)' }} aria-hidden />
                    <input
                      type="text"
                      value={workspaceSearch}
                      onChange={(e) => setWorkspaceSearch(e.target.value)}
                      placeholder="Find workspace…"
                      className="w-full rounded-lg py-2 pl-8 pr-2 text-xs outline-none"
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
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
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs transition-colors"
                      style={{
                        background: currentWorkspace.id === w.id ? 'var(--bg-2)' : 'transparent',
                        color: currentWorkspace.id === w.id ? 'var(--ink)' : 'var(--ink-2)',
                        fontWeight: currentWorkspace.id === w.id ? 500 : 400,
                      }}
                    >
                      <span className="min-w-0 truncate">{w.name}</span>
                      {currentWorkspace.id === w.id && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden />}
                    </button>
                  ))}
                  {filteredWorkspaces.length === 0 && (
                    <p className="px-2 py-3 text-center text-xs" style={{ color: 'var(--ink-4)' }}>No matches</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent breadcrumb (agent routes only) */}
        {!isWorkspaceLevelRoute && (
          <>
            <span className="h-5 w-px shrink-0" style={{ background: 'var(--line-strong)' }} aria-hidden />
            <div className="relative" ref={agentRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((v) => (v === 'agent' ? null : 'agent'))}
                className="flex items-center gap-[7px] rounded-lg transition-colors hover:bg-[var(--bg-2)]"
                style={{ height: 32, paddingLeft: 8, paddingRight: 10, maxWidth: '13rem' }}
                aria-expanded={openDropdown === 'agent'}
                aria-haspopup="true"
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center rounded-[6px]"
                  style={{ width: 20, height: 20, background: 'var(--accent)' }}
                >
                  <Bot className="h-[11px] w-[11px]" style={{ color: 'white' }} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
                  {currentAgent?.name ?? 'Agent'}
                </span>
                <ChevronsUpDown className="h-[12px] w-[12px] shrink-0" style={{ color: 'var(--ink-4)' }} strokeWidth={2} />
              </button>
              <AnimatePresence>
                {openDropdown === 'agent' && (
                  <motion.div
                    key="agent-menu"
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 top-full z-50 mt-1.5 w-64 origin-top-left overflow-hidden rounded-xl py-1.5 shadow-[0_12px_40px_-8px_rgba(26,26,29,0.18)]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                  >
                    <div className="border-b px-2 pb-2" style={{ borderColor: 'var(--line)' }}>
                      <PermissionButton
                        feature="createAgent"
                        onClick={() => {
                          setOpenDropdown(null)
                          startNewAgentFlow(currentWorkspace.id)
                          router.push(buildDashboardUrl(currentWorkspace.id) + '/new-agent/link')
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 rounded-lg border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] text-xs font-medium"
                        showCrownIcon
                      >
                        <Plus className="h-3.5 w-3.5" /> New agent
                      </PermissionButton>
                    </div>
                    <div className="px-2 pt-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--ink-4)' }} aria-hidden />
                        <input
                          type="text"
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          placeholder="Find agent…"
                          className="w-full rounded-lg py-2 pl-8 pr-2 text-xs outline-none"
                          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 max-h-36 overflow-auto px-1">
                      {agentsLoading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-2.5" aria-hidden>
                              <div className="h-4 w-8 shrink-0 rounded" style={{ background: 'var(--line-2)' }} />
                              <div className="h-4 flex-1 rounded" style={{ background: 'var(--bg-2)' }} />
                            </div>
                          ))}
                        </>
                      ) : (
                        <>
                          {filteredAgents.map((a) => (
                            <div
                              key={a.id}
                              className="flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-left text-xs transition-colors"
                              style={{
                                background: currentAgent?.id === a.id ? 'var(--bg-2)' : 'transparent',
                                color: currentAgent?.id === a.id ? 'var(--ink)' : 'var(--ink-2)',
                              }}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setCurrentAgent(a)
                                  setOpenDropdown(null)
                                  router.push(buildDashboardUrl(currentWorkspace.id, { agentId: a.id, subPath: 'playground' }))
                                }}
                                className="min-w-0 flex-1 truncate text-left transition-colors"
                              >
                                {a.name}
                              </button>
                              <div className="flex shrink-0 items-center gap-0.5">
                                {currentAgent?.id === a.id && <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} aria-hidden />}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAgentToDelete({ id: a.id, name: a.name })
                                    setOpenDropdown(null)
                                  }}
                                  className="rounded-md p-1 transition-colors hover:bg-red-50 hover:text-red-600"
                                  style={{ color: 'var(--ink-4)' }}
                                  aria-label={`Delete ${a.name}`}
                                  title="Remove agent"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>
                            </div>
                          ))}
                          {filteredAgents.length === 0 && (
                            <p className="px-2 py-3 text-center text-xs" style={{ color: 'var(--ink-4)' }}>No matches</p>
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

        {/* Right side: cmd pill + credits + notifications + avatar */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* Command palette pill */}
          <button
            type="button"
            className="hidden md:flex items-center gap-2 h-[30px] px-2.5 rounded-lg border text-xs transition-colors hover:bg-[var(--bg-2)]"
            style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--ink-3)' }}
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" style={{ color: 'var(--ink-4)' }} />
            <span className="hidden lg:inline">Search…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded px-1 text-[10px]" style={{ background: 'var(--bg-2)', color: 'var(--ink-4)', border: '1px solid var(--line)' }}>
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Credits pill */}
          {usage && (
            <div className="hidden lg:inline-flex items-center gap-[10px] h-[30px] rounded-full border" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', paddingLeft: 10, paddingRight: 4 }}>
              <span className="uppercase tracking-[0.06em]" style={{ fontSize: 11, color: 'var(--ink-3)' }}>Credits</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>
                {usage.usedCredits.toLocaleString()}<span style={{ color: 'var(--ink-4)' }}>/{(usage.includedCredits + usage.bonusCredits).toLocaleString()}</span>
              </span>
              <div className="h-1 w-14 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(((usage.usedCredits) / (usage.includedCredits + usage.bonusCredits || 1)) * 100))}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
              <Link href={buildDashboardUrl(currentWorkspace.id, { subPath: 'settings/plans' })} className="inline-flex items-center h-6 rounded-full font-medium transition-opacity hover:opacity-80" style={{ paddingLeft: 10, paddingRight: 10, background: 'var(--ink)', color: 'white', fontSize: 11.5 }}>
                Upgrade
              </Link>
            </div>
          )}

          <NotificationBell workspaceId={currentWorkspace?.id} />

          {/* Avatar / user menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ink)' }}
              aria-label="Account"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  key="account-menu"
                  role="menu"
                  aria-label="Account"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full z-50 mt-1.5 w-52 origin-top-right overflow-hidden rounded-xl py-1 shadow-[0_12px_40px_-8px_rgba(26,26,29,0.18)]"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                >
                  <div className="border-b px-3 py-2.5" style={{ borderColor: 'var(--line)' }}>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{user?.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-3)' }}>{currentWorkspace.plan} plan</p>
                  </div>
                  <Link
                    href="/account"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-2)]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    <Settings className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-4)' }} aria-hidden />
                    Account settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); logout() }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-2)]"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    <LogOut className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-4)' }} aria-hidden />
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
            {/* �"��"� Sidebar �"��"� 248px flat nav groups */}
            <motion.aside
              className="flex w-[248px] shrink-0 flex-col border-r"
              style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <nav className="flex flex-1 flex-col overflow-y-auto px-[10px] py-[14px]" aria-label="Dashboard">
                {/* Agent nav: back link first */}
                {!isWorkspaceLevelRoute && (
                  <Link
                    href={dashboardBase}
                    className="mb-2 flex items-center gap-[8px] rounded-[6px] h-[28px] px-[10px] text-[12px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to workspace
                  </Link>
                )}

                {/* Flat nav groups */}
                {isWorkspaceLevelRoute ? (
                  <>
                    {/* Workspace group */}
                    <p className="uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Workspace</p>
                    {[
                      { href: '/dashboard', label: 'Agents', Icon: Bot },
                      { href: 'usage', label: 'Usage', Icon: BarChart3 },
                    ].map(({ href, label, Icon }) => {
                      const fullHref = href === '/dashboard' ? dashboardBase : buildDashboardUrl(currentWorkspace.id, { subPath: href })
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--ink-4)' }} strokeWidth={active ? 2.2 : 1.75} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    {/* Settings group (owner only) */}
                    {isOwner && (
                      <>
                        <p className="mt-4 uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Settings</p>
                        {[
                          { sub: 'settings/general', label: 'General', Icon: Settings },
                          { sub: 'members', label: 'Members', Icon: Users },
                          { sub: 'settings/notifications', label: 'Notifications', Icon: Bell },
                          { sub: 'settings/plans', label: 'Plans', Icon: Zap },
                          { sub: 'settings/billing', label: 'Billing', Icon: CreditCard },
                          { sub: 'settings/api-keys', label: 'API keys', Icon: Key },
                        ].map(({ sub, label, Icon }) => {
                          const fullHref = buildDashboardUrl(currentWorkspace.id, { subPath: sub })
                          const active = pathname === fullHref
                          return (
                            <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                              {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                              <Icon className="h-4 w-4 shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--ink-4)' }} strokeWidth={active ? 2.2 : 1.75} />
                              <span className="min-w-0 flex-1 truncate">{label}</span>
                            </Link>
                          )
                        })}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Agent nav groups */}
                    {[
                      { label: 'Playground', icon: 'play', sub: 'playground' },
                    ].map(({ label, icon, sub }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    <p className="mt-3 uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Activity</p>
                    {[{ label: 'Chat logs', sub: 'activity/chat-logs', icon: 'scroll' }].map(({ label, sub, icon }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    <p className="mt-3 uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Analytics</p>
                    {[{ label: 'Chats', sub: 'analytics/chats', icon: 'usage' }].map(({ label, sub, icon }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    <p className="mt-3 uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Data sources</p>
                    {[
                      { label: 'Files', sub: 'data-sources/files', icon: 'file' },
                      { label: 'Q&A', sub: 'data-sources/qa', icon: 'book' },
                      { label: 'Website', sub: 'data-sources/website', icon: 'globe' },
                    ].map(({ label, sub, icon }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    {[
                      { label: 'Connected Apps', sub: 'connected-apps', icon: 'plug' },
                      { label: 'Actions', sub: 'actions', icon: 'spark' },
                      { label: 'Chat widget', sub: 'settings/chatbot', icon: 'bot' },
                    ].map(({ label, sub, icon }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref || pathname?.startsWith(fullHref + '/')
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mt-0.5 mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}

                    <p className="mt-3 uppercase" style={{ fontSize: '10.5px', letterSpacing: '0.08em', padding: '4px 10px 6px', fontWeight: 500, color: 'var(--ink-4)' }}>Settings</p>
                    {[{ label: 'General', sub: 'settings/general', icon: 'settings' }].map(({ label, sub, icon }) => {
                      const fullHref = agentBase(sub)
                      const active = pathname === fullHref
                      return (
                        <Link key={label} href={fullHref} className="relative flex items-center gap-[10px] rounded-[6px] h-[30px] px-[10px] text-[13px] transition-colors mb-0.5 hover:bg-[var(--bg-2)]" style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', fontWeight: active ? 500 : 400, background: active ? 'var(--surface)' : 'transparent', boxShadow: active ? '0 0 0 1px var(--line-2), 0 1px 1px rgba(0,0,0,0.02)' : undefined }}>
                          {active && <span style={{ position: 'absolute', left: -10, top: 6, bottom: 6, width: 2, background: 'var(--accent)', borderRadius: 2 }} />}
                          <DesignIcon name={icon} active={active} />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>

              {/* Period note footer */}
              {usagePeriodEndFormatted && (
                <div style={{ padding: 10, borderTop: '1px dashed var(--line-2)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                    Period ends {usagePeriodEndFormatted}
                  </div>
                </div>
              )}
            </motion.aside>

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(26,26,29,0.5)' }} onClick={() => !deleteLoading && setAgentToDelete(null)}>
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Delete &quot;{agentToDelete.name}&quot;?</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                  This action cannot be undone. This will permanently delete this agent and all its data, including training files, Q&A, website crawls, and chat widget settings.
                </p>
                <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>Type the agent name to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={agentToDelete.name}
                  className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--danger)]/20"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--surface)' }}
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setAgentToDelete(null); setDeleteConfirmText('') }}
                    disabled={deleteLoading}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading || deleteConfirmText.trim() !== agentToDelete.name.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'var(--danger)' }}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,29,0.5)' }}
          onClick={() => !createWorkspaceLoading && (setCreateWorkspaceOpen(false), setCreateWorkspaceError(''))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-workspace-title"
        >
          <div
            className="w-full max-w-md rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="create-workspace-title" className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                  New workspace
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Separate agents, data, and billing by workspace.</p>
                <label htmlFor="create-workspace-name" className="mt-4 block text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
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
                  className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--surface)' }}
                  disabled={createWorkspaceLoading}
                  autoComplete="off"
                />
                {createWorkspaceError && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--danger)' }} role="alert">
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
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={createWorkspaceLoading || !createWorkspaceName.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'var(--accent)' }}
                  >
                    {createWorkspaceLoading ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training progress �" only on agent pages (not on agents list); real-time via socket */}
      {parsed.isAgentRoute && (trainingStatus === 'training' || trainingStatus === 'complete') && (
        <div className="fixed bottom-4 right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)]" aria-live="polite">
          {trainingStatus === 'training' ? (
            <div className="flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)' }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Training website content</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>
                  {trainingProgress.totalLinks > 0
                    ? `${trainingProgress.fedLinks}/${trainingProgress.totalLinks} links (${Math.min(100, Math.round((trainingProgress.fedLinks / trainingProgress.totalLinks) * 100))}%). `
                    : ''}
                  You can chat now.
                </p>
                {trainingProgress.totalLinks > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((trainingProgress.fedLinks / trainingProgress.totalLinks) * 100))}%`, background: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--success-soft)' }}>
                <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Training complete</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-3)' }}>Website content is ready.</p>
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
                className="shrink-0 rounded p-1.5 transition-colors hover:bg-[var(--bg-2)]"
                style={{ color: 'var(--ink-4)' }}
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
  <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--bg)' }}>
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
  </div>
)

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={dashboardLayoutFallback}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}

