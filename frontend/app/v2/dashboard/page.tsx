'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, MoreHorizontal, MessageCircle, Bot } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'

function AgentCardPreview() {
  return (
    <div className="rounded-lg bg-gradient-to-br from-[var(--v2-primary)]/20 to-[var(--v2-primary)]/5 p-2.5">
      <div className="flex gap-1.5">
        <div className="h-6 w-6 shrink-0 rounded bg-white/80" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="h-2 max-w-[75%] rounded bg-white/90" />
          <div className="ml-auto h-2 w-1/2 max-w-[60%] rounded bg-[var(--v2-primary)]/30" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { currentWorkspace, agents } = useDashboard()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          New AI agent
        </button>
      </div>

      <div className="flex-1 p-6">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
              <MessageCircle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No agents yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Create your first AI agent to start building chatbots and assistants.
            </p>
            <button
              type="button"
              className="mt-6 flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--v2-primary-foreground)] hover:bg-[var(--v2-primary-hover)]"
            >
              <Plus className="h-4 w-4" />
              New AI agent
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/v2/dashboard/playground?agent=${agent.id}`}
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
                      onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === agent.id ? null : agent.id) }}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen === agent.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <Link href={`/v2/dashboard/playground?agent=${agent.id}`} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                          Open Playground
                        </Link>
                        <button type="button" className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                          Settings
                        </button>
                        <button type="button" className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
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

        {agents.length > 0 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Click a card to open Playground · {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Floating support / feedback button */}
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
