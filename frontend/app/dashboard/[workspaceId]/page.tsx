'use client'

import PermissionButton from '@/components/PermissionButton'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import { startNewAgentFlow } from '@/lib/onboarding'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Command,
  Copy,
  MoreHorizontal,
  Play,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const MARK_COLORS = [
  'var(--accent)',
  '#0e9b6b',
  '#b86a17',
  '#c33665',
  '#7c3aed',
  '#0284c7',
]

function getMarkColor(id: string) {
  let n = 0
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0
  return MARK_COLORS[n % MARK_COLORS.length]
}

const DT: React.CSSProperties = {
  fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
}
const DD: React.CSSProperties = { fontSize: 12, color: 'var(--ink-2)', margin: 0 }

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatModel(model: string | null | undefined): string {
  if (!model) return '—'
  if (model.startsWith('gpt-4o')) return 'GPT-4o'
  if (model.startsWith('gpt-4')) return 'GPT-4'
  if (model.startsWith('gpt-3.5')) return 'GPT-3.5'
  return model
}

function AgentCardSkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg" style={{ background: 'var(--bg-2)' }} aria-hidden />
            <div className="h-6 w-6 rounded" style={{ background: 'var(--bg-2)' }} aria-hidden />
          </div>
          <div className="space-y-2 mb-3">
            <div className="h-4 w-3/4 rounded" style={{ background: 'var(--line-2)' }} aria-hidden />
            <div className="h-3 w-full rounded" style={{ background: 'var(--bg-2)' }} aria-hidden />
          </div>
          <div className="h-px mt-3" style={{ background: 'var(--line)' }} aria-hidden />
          <div className="flex gap-1 mt-3">
            <div className="h-8 flex-1 rounded-lg" style={{ background: 'var(--bg-2)' }} aria-hidden />
            <div className="h-8 flex-1 rounded-lg" style={{ background: 'var(--bg-2)' }} aria-hidden />
          </div>
        </div>
      ))}
    </div>
  )
}

function NewAgentTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border text-left flex flex-col p-4 transition-colors"
      style={{
        borderStyle: 'dashed',
        borderColor: hovered ? 'var(--accent)' : 'var(--line-strong)',
        background: hovered ? 'var(--surface-2)' : 'transparent',
        minHeight: 220,
        gap: 12,
        alignItems: 'flex-start',
        justifyContent: 'center',
        color: hovered ? 'var(--ink)' : 'var(--ink-2)',
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center"
        style={{
          borderRadius: 'var(--r-md)',
          border: `1px dashed ${hovered ? 'var(--accent)' : 'var(--line-strong)'}`,
          background: 'var(--surface-2)',
          color: hovered ? 'var(--accent)' : 'var(--ink-2)',
        }}
      >
        <Plus className="h-5 w-5" />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Create a new agent</p>
        <p style={{ fontSize: '12.5px', color: 'var(--ink-3)', marginTop: 4 }}>Start blank or from a template</p>
      </div>
    </button>
  )
}

function OnboardingRail({ hasAgents }: { hasAgents: boolean }) {
  const [dismissed, setDismissed] = useState(false)
  const tasks = [
    { done: true, label: 'Create your workspace' },
    { done: hasAgents, label: 'Build your first agent' },
    { done: false, label: 'Connect a data source', action: 'Connect' },
    { done: false, label: 'Invite a teammate', action: 'Invite' },
    { done: false, label: 'Embed on your website', action: 'Get snippet' },
  ]
  const completed = tasks.filter((t) => t.done).length

  if (dismissed) return null

  return (
    <aside className="rounded-xl border p-4 sticky top-6" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="flex items-start justify-between" style={{ marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', margin: 0 }}>Get started</p>
          <p style={{ fontSize: '13.5px', fontWeight: 600, marginTop: 4, color: 'var(--ink)', margin: '4px 0 0' }}>{completed} of {tasks.length} complete</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
          style={{ color: 'var(--ink-4)' }}
          aria-label="Dismiss"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div style={{ height: 3, borderRadius: 3, background: 'var(--bg-2)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${(completed / tasks.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 'inherit', transition: 'width .3s ease' }} />
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {tasks.map((t, i) => (
          <li
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', fontSize: 13,
              borderTop: i > 0 ? '1px dashed var(--line)' : undefined,
            }}
          >
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `1px solid ${t.done ? 'var(--accent)' : 'var(--line-strong)'}`,
                background: t.done ? 'var(--accent)' : 'var(--bg)',
                color: t.done ? '#fff' : 'var(--ink-3)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {t.done
                ? <Check className="h-[11px] w-[11px]" strokeWidth={3} />
                : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>{i + 1}</span>
              }
            </span>
            <span
              style={{
                flex: 1,
                color: t.done ? 'var(--ink-3)' : 'var(--ink-2)',
                textDecoration: t.done ? 'line-through' : undefined,
                textDecorationColor: 'var(--line-strong)',
              }}
            >
              {t.label}
            </span>
            {!t.done && t.action && (
              <button
                type="button"
                style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--accent)', padding: '2px 8px', borderRadius: 4 }}
                className="transition-colors hover:bg-[var(--accent-soft)]"
              >
                {t.action}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div style={{ height: 1, background: 'var(--line)', margin: '14px 0 8px' }} />

      <a href="/docs" className="flex items-center justify-between py-1.5 transition-colors hover:text-[var(--ink)]" style={{ fontSize: '12.5px', color: 'var(--ink-2)', textDecoration: 'none' }}>
        <span className="flex items-center gap-2">
          <BookOpen className="h-[13px] w-[13px]" style={{ color: 'var(--ink-4)' }} />
          Read the docs
        </span>
        <ArrowUpRight className="h-[13px] w-[13px]" style={{ color: 'var(--ink-4)' }} />
      </a>
      <a href="#" className="flex items-center justify-between py-1.5 transition-colors hover:text-[var(--ink)]" style={{ fontSize: '12.5px', color: 'var(--ink-2)', textDecoration: 'none' }}>
        <span className="flex items-center gap-2">
          <Command className="h-[13px] w-[13px]" style={{ color: 'var(--ink-4)' }} />
          Keyboard shortcuts
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', padding: '1px 5px', border: '1px solid var(--line-2)', borderRadius: 4, color: 'var(--ink-3)', background: 'var(--bg)' }}>?</span>
      </a>
    </aside>
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
    <div className="flex h-full flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div className="shrink-0 border-b px-6 py-5 sm:px-8" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-4)', margin: 0 }}>
              {currentWorkspace.name}
            </p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>Agents</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
              AI agents that act on behalf of your team. Click any agent to open its playground, training data, or analytics.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border text-[13px] font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: 'var(--line-2)', color: 'var(--ink)', background: 'var(--surface)', boxShadow: '0 1px 0 rgba(0,0,0,0.02)' }}
            >
              <Copy className="h-[14px] w-[14px]" />
              Templates
            </button>
            <PermissionButton
              feature="createAgent"
              onClick={handleNewAgent}
              variant="primary"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--ink)' }}
              showCrownIcon
            >
              <Plus className="h-[14px] w-[14px]" />
              New agent
            </PermissionButton>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          {agentsLoading ? (
            <AgentCardSkeletonGrid />
          ) : agents.length === 0 ? (
            <div
              className="flex flex-col items-center rounded-xl border py-14 text-center px-8"
              style={{ borderStyle: 'dashed', borderColor: 'var(--line-strong)', background: 'var(--surface)' }}
            >
              <div style={{ marginBottom: 14 }}>
                <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
                  <rect x="20" y="14" width="80" height="58" rx="10" stroke="var(--line-strong)" strokeWidth="1.2" strokeDasharray="2 4"/>
                  <rect x="40" y="34" width="40" height="20" rx="4" fill="var(--bg-2)"/>
                  <circle cx="50" cy="44" r="2" fill="var(--ink-4)"/>
                  <circle cx="70" cy="44" r="2" fill="var(--ink-4)"/>
                  <path d="M50 6v8M70 6v8" stroke="var(--ink-5)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>No agents yet</h3>
              <p style={{ marginTop: 8, maxWidth: '36ch', color: 'var(--ink-3)', fontSize: '13.5px', lineHeight: 1.6 }}>
                Create your first agent in under a minute. Connect data sources, write a system prompt, and ship.
              </p>
              <div className="mt-7 flex items-center gap-2">
                <PermissionButton
                  feature="createAgent"
                  onClick={handleNewAgent}
                  variant="primary"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: 'var(--ink)' }}
                  showCrownIcon
                >
                  <Plus className="h-[14px] w-[14px]" />
                  New agent
                </PermissionButton>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border text-[13px] font-medium transition-colors hover:bg-[var(--surface-2)]"
                  style={{ borderColor: 'var(--line-2)', color: 'var(--ink-2)' }}
                >
                  Browse templates
                  <ArrowRight className="h-[14px] w-[14px]" />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {agents.map((agent, i) => {
                  const color = getMarkColor(agent.id)
                  return (
                    <motion.article
                      key={agent.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-xl border flex flex-col p-4 relative transition-[border-color,box-shadow] duration-150"
                      style={{ borderColor: 'var(--line)', background: 'var(--surface)', textAlign: 'left', gap: 12 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line-strong)'
                        e.currentTarget.style.boxShadow = '0 1px 0 rgba(0,0,0,0.02), 0 8px 20px -16px rgba(0,0,0,0.16)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* Card top */}
                      <div className="flex items-start justify-between">
                        <div
                          className="flex h-9 w-9 items-center justify-center text-white"
                          style={{ background: color, borderRadius: 'var(--r-md)' }}
                        >
                          <Bot className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </div>
                        <div ref={menuOpen === agent.id ? menuRef : undefined} className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpen(menuOpen === agent.id ? null : agent.id)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
                            style={{ color: 'var(--ink-4)' }}
                            aria-label="Options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          <AnimatePresence>
                            {menuOpen === agent.id && (
                              <motion.div
                                role="menu"
                                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute right-0 top-full z-10 mt-1.5 w-44 overflow-hidden rounded-xl border p-1 shadow-[0_10px_32px_-8px_rgba(26,26,29,0.16)]"
                                style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-2)]"
                                  style={{ color: 'var(--ink-2)' }}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    router.push(buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'settings/general' }))
                                  }}
                                >
                                  <Settings className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ink-4)' }} />
                                  Settings
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--danger-soft)]"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => {
                                    setAgentToDelete({ id: agent.id, name: agent.name })
                                    setMenuOpen(null)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>{agent.name}</h3>
                      </div>

                      {/* Meta grid */}
                      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', margin: 0, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <dt style={DT}>Status</dt>
                          <dd style={DD}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                              Active
                            </span>
                          </dd>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <dt style={DT}>Model</dt>
                          <dd style={DD}>{formatModel(agent.model)}</dd>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <dt style={DT}>Messages</dt>
                          <dd style={DD}>{agent.messageCount != null ? agent.messageCount.toLocaleString() : '—'}</dd>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <dt style={DT}>Last run</dt>
                          <dd style={DD}>{formatRelativeTime(agent.lastRunAt)}</dd>
                        </div>
                      </dl>

                      {/* Action row */}
                      <div
                        className="flex items-center"
                        style={{ borderTop: '1px solid var(--line)', marginLeft: -16, marginRight: -16, marginBottom: -16 }}
                      >
                        <Link
                          href={buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'playground' })}
                          className="flex flex-1 items-center justify-center gap-1.5 h-[34px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                          style={{ fontSize: '12.5px', color: 'var(--ink)' }}
                        >
                          <Play className="h-[11px] w-[11px]" />
                          Open playground
                        </Link>
                        <span className="w-px self-stretch" style={{ background: 'var(--line)' }} />
                        <Link
                          href={buildDashboardUrl(currentWorkspace.id, { agentId: agent.id, subPath: 'settings/chatbot' })}
                          className="flex flex-1 items-center justify-center gap-1.5 h-[34px] font-medium transition-colors hover:bg-[var(--bg-2)]"
                          style={{ fontSize: '12.5px', color: 'var(--ink-3)' }}
                        >
                          <Settings className="h-[12px] w-[12px]" />
                          Configure
                        </Link>
                      </div>
                    </motion.article>
                  )
                })}

                <NewAgentTile onClick={handleNewAgent} />
              </div>

              <OnboardingRail hasAgents={agents.length > 0} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
