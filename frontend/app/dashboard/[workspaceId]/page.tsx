'use client'

/**
 * Agents dashboard (workspace home) — UX refinements:
 * - Clearer typographic hierarchy (eyebrow → title → actions) and calmer page rhythm
 * - More breathing room in header and grid; content max-width feels intentional on wide screens
 * - Cards: softer elevation, refined borders, premium hover (shadow + border only — no layout shift)
 * - Empty / loading states aligned with the same visual language
 * - Motion: only the agent ⋯ menu uses Framer Motion (subtle enter/exit so it doesn’t pop harshly)
 */

import PermissionButton from '@/components/PermissionButton'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import { startNewAgentFlow } from '@/lib/onboarding'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, MessageCircle, MoreHorizontal, Plus, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function AgentCardSkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="mb-4 aspect-video rounded-xl bg-slate-100" aria-hidden />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-3/4 max-w-[200px] rounded-md bg-slate-200/90" aria-hidden />
              <div className="h-3 w-1/2 max-w-[120px] rounded bg-slate-100" aria-hidden />
            </div>
            <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" aria-hidden />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function WorkspaceHomePage() {
  const router = useRouter()
  const { currentWorkspace, agents, agentsLoading, setAgentToDelete } = useDashboard()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleNewAgent = () => {
    startNewAgentFlow(currentWorkspace.id)
    router.push(buildDashboardUrl(currentWorkspace.id) + '/new-agent/link')
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
    <div className="flex h-full flex-col overflow-auto bg-[rgb(250,251,253)]">
      <div className="shrink-0 border-b border-slate-200/80 bg-white/90 px-6 py-5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {currentWorkspace.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
              Agents
            </h1>
          </div>
          <PermissionButton
            feature="createAgent"
            onClick={handleNewAgent}
            variant="primary"
            className="shrink-0 bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-[var(--v2-primary-hover)] hover:shadow-[0_4px_14px_-4px_rgba(15,23,42,0.12)]"
            showCrownIcon
          >
            <Plus className="h-4 w-4" />
            New AI agent
          </PermissionButton>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 px-6 py-8 sm:px-8 sm:py-10">
        {agentsLoading ? (
          <div className="w-full">
            <AgentCardSkeletonGrid />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white px-8 py-20 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-200/80">
              <MessageCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
            </div>
            <h2 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">No agents yet</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Create your first AI agent to start building chatbots and assistants.
            </p>
            <PermissionButton
              feature="createAgent"
              onClick={handleNewAgent}
              variant="primary"
              className="mt-8 bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-[var(--v2-primary-hover)]"
              showCrownIcon
            >
              <Plus className="h-4 w-4" />
              New AI agent
            </PermissionButton>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {agents.map((agent) => (
                <div key={agent.id} className="min-w-0">
                  <Link
                    href={buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'playground' })}
                    className="group relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,border-color] duration-500 ease-out hover:border-slate-300/90 hover:shadow-[0_8px_28px_-6px_rgba(15,23,42,0.1)]"
                  >
                    <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/90 ring-1 ring-inset ring-slate-200/50">
                      <Bot
                        className="h-12 w-12 text-slate-300 transition-colors duration-500 group-hover:text-[var(--v2-primary)]/75"
                        strokeWidth={1.25}
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900 transition-colors duration-300 group-hover:text-[var(--v2-primary)]">
                          {agent.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">Open in Playground</p>
                      </div>
                      <div ref={menuOpen === agent.id ? menuRef : undefined} className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setMenuOpen(menuOpen === agent.id ? null : agent.id)
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {menuOpen === agent.id && (
                            <motion.div
                              role="menu"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute right-0 top-full z-10 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setMenuOpen(null)
                                  router.push(
                                    buildDashboardUrl(currentWorkspace.id, {
                                      agentId: agent.id,
                                      subPath: 'settings/chatbot',
                                    })
                                  )
                                }}
                              >
                                <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                                Settings
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setAgentToDelete({ id: agent.id, name: agent.name })
                                  setMenuOpen(null)
                                }}
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {!agentsLoading && agents.length > 0 && (
          <p className="mt-10 text-center text-xs font-medium text-slate-400">
            Click a card to open Playground · {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
