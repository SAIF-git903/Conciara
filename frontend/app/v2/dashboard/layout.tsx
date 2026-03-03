'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  ChevronDown,
  Clock,
  Gift,
  RefreshCw,
  HelpCircle,
  User,
  Settings,
  Search,
  Plus,
  Check,
  Play,
  MessageSquare,
  BarChart3,
  Database,
  Zap,
  Users,
  Rocket,
} from 'lucide-react'
import type { ReactNode } from 'react'

// Mock data - replace with real data later
const MOCK_WORKSPACES = [
  { id: '1', name: 'Test12345', plan: 'Free' },
  { id: '2', name: 'Acme Support', plan: 'Pro' },
  { id: '3', name: 'Marketing Team', plan: 'Free' },
]
const MOCK_AGENTS = [
  { id: '1', name: 'ConversaTree', workspaceId: '1' },
  { id: '2', name: 'Support Bot', workspaceId: '1' },
  { id: '3', name: 'Sales Assistant', workspaceId: '2' },
]

// Sidebar when on dashboard (Agents list)
const dashboardNavItems = [
  { href: '/v2/dashboard', label: 'Agents', Icon: Bot },
  { href: '#', label: 'Usage', Icon: Clock },
  { href: '#', label: 'Workspace settings', Icon: Settings, children: ['General', 'Members', 'Plans', 'Billing', 'API keys'] },
]

// Sidebar when inside an agent (e.g. Playground, agent settings)
const agentNavItems = [
  { href: '/v2/dashboard/playground', label: 'Playground', Icon: Play },
  { href: '#', label: 'Activity', Icon: MessageSquare, children: ['Chat logs', 'Chats'] },
  { href: '#', label: 'Analytics', Icon: BarChart3, children: ['Reports', 'Usage'] },
  { href: '#', label: 'Data sources', Icon: Database, children: ['Files', 'Q&A', 'Website'] },
  { href: '#', label: 'Actions', Icon: Zap },
  { href: '#', label: 'Contacts', Icon: Users },
  { href: '#', label: 'Deploy', Icon: Rocket },
  { href: '#', label: 'Settings', Icon: Settings, children: ['General', 'API keys'] },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [openDropdown, setOpenDropdown] = useState<'workspace' | 'agent' | null>(null)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [agentSearch, setAgentSearch] = useState('')
  const [currentWorkspace, setCurrentWorkspace] = useState(MOCK_WORKSPACES[0])
  const [currentAgent, setCurrentAgent] = useState(MOCK_AGENTS[0])
  const workspaceRef = useRef<HTMLDivElement>(null)
  const agentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (workspaceRef.current?.contains(target) || agentRef.current?.contains(target)) return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleExpanded = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const filteredWorkspaces = MOCK_WORKSPACES.filter((w) =>
    w.name.toLowerCase().includes(workspaceSearch.toLowerCase())
  )
  const filteredAgents = MOCK_AGENTS.filter((a) =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  )

  const isDashboardHome = pathname === '/v2/dashboard'
  const navItems = isDashboardHome ? dashboardNavItems : agentNavItems

  return (
    <div className="flex h-full w-full min-h-0 flex-col bg-white">
      {/* Full-width top header - workspace and agent dropdowns */}
      <header className="relative flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--v2-primary)] text-sm font-bold text-white">
          C
        </div>
        <span className="text-slate-300">/</span>

        {/* Workspace selector */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown((v) => (v === 'workspace' ? null : 'workspace'))}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="font-medium">{currentWorkspace.name}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{currentWorkspace.plan}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openDropdown === 'workspace' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'workspace' && (
            <div className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-1.5 pb-1.5">
                <button type="button" className="flex w-full items-center justify-center gap-1 rounded border border-[var(--v2-primary)] py-1.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10">
                  <Plus className="h-3 w-3" /> Create workspace
                </button>
              </div>
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
                    onClick={() => { setCurrentWorkspace(w); setOpenDropdown(null) }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
                      currentWorkspace.id === w.id ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
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
                <span className="font-medium">{currentAgent.name}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">Agent</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${openDropdown === 'agent' ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === 'agent' && (
            <div className="absolute left-0 top-full z-50 mt-0.5 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-1.5 pb-1.5">
                <button type="button" className="flex w-full items-center justify-center gap-1 rounded border border-[var(--v2-primary)] py-1.5 text-xs font-medium text-[var(--v2-primary)] hover:bg-[var(--v2-primary)]/10">
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
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setCurrentAgent(a); setOpenDropdown(null) }}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${
                      currentAgent.id === a.id ? 'bg-slate-200 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{a.name}</span>
                    {currentAgent.id === a.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
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
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="History">
            <Clock className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Rewards">
            <Gift className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </button>
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
              const hasChildren = 'children' in item && item.children?.length
              const isExpanded = hasChildren && expanded[item.label]

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
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                        isActive
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
                    {(item as { children: string[] }).children.map((child) => (
                      <Link
                        key={child}
                        href="#"
                        className="block py-1.5 text-xs text-slate-500 hover:text-slate-700"
                      >
                        {child}
                      </Link>
                    ))}
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
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
