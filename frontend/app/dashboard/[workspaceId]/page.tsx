'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MoreHorizontal, MessageCircle, Bot, Settings, Trash2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { startNewAgentFlow } from '@/lib/onboarding'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import PermissionButton from '@/components/PermissionButton'

export default function WorkspaceHomePage() {
  const router = useRouter()
  const { currentWorkspace, agents, agentsLoading, setAgentToDelete } = useDashboard()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleNewAgent = () => {
    startNewAgentFlow(currentWorkspace.id)
    router.push('/dashboard/new-agent/link')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenuOpen(null)
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{currentWorkspace.name}</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agents</h1>
        </div>
        <PermissionButton
          feature="createAgent"
          onClick={handleNewAgent}
          variant="primary"
          className="bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-sm hover:bg-[var(--v2-primary-hover)]"
          showCrownIcon
        >
          <Plus className="h-4 w-4" />
          New AI agent
        </PermissionButton>
      </div>

      <div className="flex-1 p-6">
        {agentsLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 aspect-video animate-pulse rounded-lg bg-slate-100" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No agents yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first AI agent to start building chatbots and assistants.
            </p>
            <PermissionButton
              feature="createAgent"
              onClick={handleNewAgent}
              variant="primary"
              className="mt-6 bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] hover:bg-[var(--v2-primary-hover)]"
              showCrownIcon
            >
              <Plus className="h-4 w-4" />
              New AI agent
            </PermissionButton>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'playground' })}
                className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                  <Bot className="h-12 w-12 text-slate-300 group-hover:text-[var(--v2-primary)]/70" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-[var(--v2-primary)]">
                      {agent.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">Open in Playground</p>
                  </div>
                  <div ref={menuOpen === agent.id ? menuRef : undefined} className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(menuOpen === agent.id ? null : agent.id) }}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen === agent.id && (
                      <div
                        className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(null); router.push(buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'settings/chatbot' })) }}
                        >
                          <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                          Settings
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-100"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAgentToDelete({ id: agent.id, name: agent.name }); setMenuOpen(null) }}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!agentsLoading && agents.length > 0 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Click a card to open Playground · {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-lg transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl"
        aria-label="Chat support"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  )
}
