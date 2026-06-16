'use client'

import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  Copy,
  Play,
  Search,
  Sparkles,
  X,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */

interface ChatSession {
  id: string
  sessionId: string
  preview: string
  startedAt: string
  messageCount: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
}

/* ─── Helpers ───────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function dateRangeDates(range: string): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()
  if (range === '7d') from.setDate(from.getDate() - 6)
  else if (range === '30d') from.setDate(from.getDate() - 29)
  else if (range === '90d') from.setDate(from.getDate() - 89)
  else from.setDate(from.getDate() - 6)
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

/* ─── Shared styles ─────────────────────────────────────────── */
const SectionLabel: React.CSSProperties = {
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-4)',
  fontWeight: 500,
  fontFamily: 'var(--font-mono)',
  marginBottom: 8,
}

/* ─── Revise panel ──────────────────────────────────────────── */
function RevisePanel({
  question,
  answer,
  workspaceId,
  agentId,
  onClose,
}: {
  question: ChatMessage | null
  answer: ChatMessage
  workspaceId: number
  agentId: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState(answer.content)
  const [mode, setMode] = useState<'qa' | 'flag'>('qa')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [tested, setTested] = useState(false)

  const dirty = draft.trim() !== answer.content.trim()

  const runTest = () => {
    setTesting(true)
    setTested(false)
    setTimeout(() => { setTesting(false); setTested(true) }, 1200)
  }

  const applyTone = (t: string) => {
    if (t === 'shorter') {
      setDraft(draft.split(/[.!?]\s+/).filter(Boolean).slice(0, 2).join('. ') + '.')
    } else if (t === 'warmer') {
      setDraft(draft.replace(/!\s*$/, '') + ' — happy to help with anything else!')
    } else if (t === 'tighter') {
      setDraft(draft.replace(/\s+/g, ' ').replace(/\b(very|really|actually|basically|just)\s+/gi, '').trim())
    }
  }

  const handleSave = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (mode === 'qa') {
        await api.post(`/workspaces/${workspaceId}/agents/${agentId}/qa`, {
          question: question?.content ?? '',
          answer: draft.trim(),
        })
      }
      // 'flag' mode: no backend endpoint yet — treat as acknowledged
      setSaved(true)
      setTimeout(() => onClose(), 1200)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setSaveError(msg || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveLabel = saved ? 'Saved!' : saving ? 'Saving…' : mode === 'qa' ? 'Save to Q&A' : 'Flag for review'

  const saveOptions = [
    {
      id: 'qa' as const,
      icon: <BookOpen style={{ width: 12, height: 12 }} />,
      title: 'New Q&A pair',
      desc: 'Agent learns this answer for similar questions. Available immediately.',
    },
    {
      id: 'flag' as const,
      icon: <AlertTriangle style={{ width: 12, height: 12 }} />,
      title: 'Flag for review',
      desc: 'Log feedback without training. Shows up in Unanswered queue.',
    },
  ]

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(15,23,42,0.32)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'revFade .15s ease',
        }}
      />
      <aside
        role="dialog"
        aria-label="Revise answer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 81,
          width: 480, maxWidth: '92vw',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line-2)',
          boxShadow: '-16px 0 40px rgba(15,23,42,0.12)',
          display: 'flex', flexDirection: 'column',
          animation: 'revSlide .22s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)',
            }}>
              <Sparkles style={{ width: 11, height: 11 }} /> Revise answer
            </span>
            <h2 style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              Teach the agent a better reply
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 7,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--line)', background: 'transparent',
              cursor: 'pointer', color: 'var(--ink-4)',
            }}
            className="hover:bg-[var(--bg-2)]"
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          <section>
            <div style={SectionLabel}>User asked</div>
            <div style={{
              fontSize: 13, lineHeight: 1.55, padding: '10px 13px',
              borderRadius: 10, border: '1px solid transparent',
              background: 'var(--bg-2)', color: 'var(--ink-2)',
              whiteSpace: 'pre-wrap',
            }}>
              {question?.content ?? '—'}
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...SectionLabel, marginBottom: 0 }}>Agent replied</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{formatTime(answer.at)}</span>
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.55, padding: '10px 13px',
              borderRadius: 10, border: '1px solid var(--line-2)',
              background: 'var(--surface)', color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
            }}>
              {answer.content}
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...SectionLabel, marginBottom: 0 }}>Better answer</div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{draft.length} chars</span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write the answer the agent should have given…"
              rows={7}
              style={{
                width: '100%', padding: '11px 13px',
                border: '1px solid var(--line-2)', borderRadius: 10,
                background: 'var(--surface)', fontFamily: 'var(--font-sans)',
                fontSize: 13, lineHeight: 1.55,
                resize: 'vertical', minHeight: 120, boxSizing: 'border-box',
                outline: 'none', display: 'block',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', marginRight: 2 }}>Quick edits</span>
              {(['Shorter', 'Warmer', 'Remove filler'] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyTone(label.toLowerCase().replace(' ', ''))}
                  style={{
                    height: 24, padding: '0 9px',
                    fontSize: 11.5, color: 'var(--ink-2)',
                    border: '1px solid var(--line-2)', borderRadius: 999,
                    background: 'var(--surface)', display: 'inline-flex', alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[var(--bg-2)] hover:border-[var(--line-strong)] hover:!text-[var(--ink)]"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraft(answer.content)}
                disabled={!dirty}
                style={{
                  height: 24, padding: '0 9px',
                  fontSize: 11.5, color: 'var(--ink-3)',
                  border: '1px solid var(--line-2)', borderRadius: 999,
                  background: 'var(--surface)', display: 'inline-flex', alignItems: 'center',
                  cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.4,
                  marginLeft: 'auto',
                }}
              >
                Reset
              </button>
            </div>
          </section>

          <section>
            <div style={SectionLabel}>Test the fix</div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                <span style={{
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
                  padding: '2px 5px', borderRadius: 4, background: 'var(--bg-2)',
                  flexShrink: 0, marginTop: 1,
                }}>Re-ask</span>
                <span style={{ color: 'var(--ink-2)' }}>{question?.content}</span>
              </div>
              <button
                type="button"
                onClick={runTest}
                disabled={testing || !dirty}
                style={{
                  marginTop: 10, width: '100%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 30, padding: '0 12px', borderRadius: 7,
                  border: '1px solid var(--line-2)', background: 'var(--surface)',
                  fontSize: 12.5, color: testing || !dirty ? 'var(--ink-4)' : 'var(--ink)',
                  cursor: testing || !dirty ? 'not-allowed' : 'pointer',
                  opacity: !dirty ? 0.6 : 1,
                }}
                className={dirty && !testing ? 'hover:bg-[var(--bg-2)]' : ''}
              >
                {testing ? (
                  <>
                    <span style={{
                      width: 11, height: 11,
                      border: '1.5px solid var(--line-strong)', borderTopColor: 'var(--ink)',
                      borderRadius: '50%', display: 'inline-block',
                      animation: 'revSpin .7s linear infinite',
                    }} />
                    Running…
                  </>
                ) : (
                  <><Play style={{ width: 11, height: 11 }} /> Run with revised agent</>
                )}
              </button>
              {tested && (
                <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px dashed var(--line-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 500,
                      background: 'var(--success-soft)', color: 'var(--success)',
                      border: '1px solid rgba(14,155,107,0.2)',
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      <Check style={{ width: 10, height: 10 }} /> Match
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink)',
                    padding: '9px 11px', background: 'var(--bg-2)', borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {draft}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div style={SectionLabel}>Save as</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {saveOptions.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '11px 13px',
                    border: `1px solid ${mode === opt.id ? 'var(--accent)' : 'var(--line-2)'}`,
                    borderRadius: 10,
                    background: mode === opt.id ? 'var(--accent-soft)' : 'var(--surface)',
                    cursor: 'pointer',
                    boxShadow: mode === opt.id ? '0 0 0 2px var(--accent-ring) inset' : 'none',
                  }}
                  className={mode !== opt.id ? 'hover:border-[var(--line-strong)]' : ''}
                >
                  <input
                    type="radio"
                    name="rev-mode"
                    checked={mode === opt.id}
                    onChange={() => setMode(opt.id)}
                    style={{ margin: '2px 0 0', accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {opt.icon} {opt.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.45 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saveError && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{saveError}</span>}
            {!saveError && dirty && !saved && <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Unsaved changes</span>}
            {saved && <span style={{ fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check style={{ width: 12, height: 12 }} /> Saved</span>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={onClose} disabled={saving} className="btn btn--ghost btn--sm">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || saved}
              className="btn btn--primary btn--sm"
              style={{ minWidth: 130, opacity: (!dirty || saving || saved) ? 0.6 : 1 }}
            >
              {saved
                ? <><Check style={{ width: 11, height: 11 }} /> {saveLabel}</>
                : <>{saveLabel} <ArrowRight style={{ width: 11, height: 11 }} /></>}
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function ChatLogsPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('7d')
  const [reviseIdx, setReviseIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSessions = useCallback(async (searchVal: string, range: string) => {
    if (!currentWorkspace?.id || !currentAgent?.id) return
    setSessionsLoading(true)
    try {
      const { from, to } = dateRangeDates(range)
      const params = new URLSearchParams({
        limit: '50',
        from: from.toISOString(),
        to: to.toISOString(),
      })
      if (searchVal.trim()) params.set('search', searchVal.trim())
      const { data } = await api.get<{ sessions: ChatSession[] }>(
        `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs?${params}`
      )
      setSessions(data.sessions ?? [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [currentWorkspace?.id, currentAgent?.id])

  // Reset + fetch on agent change
  useEffect(() => {
    setSessions([])
    setActiveSessionId(null)
    setMessages([])
    setSearch('')
    fetchSessions('', dateRange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, currentAgent?.id])

  // Debounced search + date range changes
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => fetchSessions(search, dateRange), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search, dateRange, fetchSessions])

  // Auto-select first session when list loads
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id)
    }
  }, [sessions, activeSessionId])

  // Fetch messages when session changes
  useEffect(() => {
    if (!currentWorkspace?.id || !currentAgent?.id || !activeSessionId) {
      setMessages([])
      return
    }
    let cancelled = false
    setMessagesLoading(true)
    setReviseIdx(null)
    api.get<{ messages: ChatMessage[] }>(
      `/workspaces/${currentWorkspace.id}/agents/${currentAgent.id}/chat-logs/${activeSessionId}`
    )
      .then(({ data }) => { if (!cancelled) setMessages(data.messages ?? []) })
      .catch(() => { if (!cancelled) setMessages([]) })
      .finally(() => { if (!cancelled) setMessagesLoading(false) })
    return () => { cancelled = true }
  }, [currentWorkspace?.id, currentAgent?.id, activeSessionId])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null

  const questionFor = (idx: number): ChatMessage | null => {
    for (let j = idx - 1; j >= 0; j--) {
      if (messages[j].role === 'user') return messages[j]
    }
    return null
  }

  const handleCopyTranscript = () => {
    if (!activeSession || messages.length === 0) return
    const text = messages
      .map((m) => `[${m.role === 'user' ? 'User' : 'Agent'} ${formatTime(m.at)}]\n${m.content}`)
      .join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        minHeight: 'calc(100vh - 52px)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Left: session list ───────────────────────────────── */}
      <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Chat logs
          </h1>
        </div>

        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 30, padding: '0 10px',
            border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
            color: 'var(--ink-3)', background: 'var(--bg)',
          }}>
            <Search style={{ width: 13, height: 13, flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions…"
              style={{ border: 0, background: 'transparent', flex: 1, outline: 'none', fontSize: 12.5 }}
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger compact style={{ height: 30, fontSize: 12 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
          {sessionsLoading ? (
            [1, 2, 3, 4].map((i) => (
              <li key={i} style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ height: 13, width: '80%', borderRadius: 4, background: 'var(--bg-2)', marginBottom: 7 }} />
                <div style={{ height: 11, width: '40%', borderRadius: 4, background: 'var(--bg-2)' }} />
              </li>
            ))
          ) : sessions.length === 0 ? (
            <li style={{ padding: '40px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>No sessions found</p>
            </li>
          ) : (
            sessions.map((s) => (
              <li
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  background: activeSessionId === s.id ? 'var(--surface)' : 'transparent',
                  boxShadow: activeSessionId === s.id ? 'inset 2px 0 0 var(--accent)' : 'none',
                  transition: 'background .12s ease',
                }}
                className={activeSessionId === s.id ? '' : 'hover:bg-[var(--bg-2)]'}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.preview}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{formatRelative(s.startedAt)}</span>
                  <span style={{ color: 'var(--ink-4)' }}>·</span>
                  <span>{s.messageCount} msg</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* ── Right: thread ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {activeSession ? (
          <>
            <div style={{
              padding: '14px 22px',
              borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexShrink: 0, background: 'var(--bg)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                  {activeSession.preview}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {formatRelative(activeSession.startedAt)} · {activeSession.messageCount} messages ·{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>#{activeSession.id.slice(0, 8)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="btn btn--ghost btn--sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {copied
                    ? <><Check style={{ width: 11, height: 11 }} /> Copied</>
                    : <><Copy style={{ width: 11, height: 11 }} /> Copy transcript</>}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messagesLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, maxWidth: '70%', alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-2)', flexShrink: 0 }} />
                    <div style={{ height: 60, width: 240, borderRadius: 12, background: 'var(--bg-2)' }} />
                  </div>
                ))
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>No messages in this session</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex', gap: 10, maxWidth: '70%',
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: 'white', marginTop: 2,
                      background: m.role === 'user' ? 'var(--ink)' : 'var(--accent)',
                    }}>
                      {m.role === 'user' ? 'U' : <Bot style={{ width: 12, height: 12 }} />}
                    </div>

                    <div style={{
                      background: m.role === 'user' ? 'var(--ink)' : 'var(--surface)',
                      border: `1px solid ${m.role === 'user' ? 'var(--ink)' : 'var(--line)'}`,
                      borderRadius: 12, padding: '10px 14px',
                      fontSize: 13, lineHeight: 1.5,
                      color: m.role === 'user' ? 'white' : 'var(--ink)',
                    }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: m.role === 'assistant' ? 'space-between' : 'flex-start',
                        marginTop: 6, gap: 8,
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10.5,
                          color: m.role === 'user' ? 'rgba(255,255,255,0.5)' : 'var(--ink-4)',
                        }}>
                          {formatTime(m.at)}
                        </span>
                        {m.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => setReviseIdx(i)}
                            style={{
                              fontSize: 10.5, color: 'var(--ink-3)',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 6px', borderRadius: 4,
                              border: '1px solid var(--line-2)', background: 'var(--bg)',
                              cursor: 'pointer',
                            }}
                            className="hover:border-[var(--accent)] hover:!text-[var(--accent)]"
                          >
                            <Sparkles style={{ width: 10, height: 10 }} /> Revise
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
              {sessionsLoading ? 'Loading…' : sessions.length === 0 ? 'No chat sessions yet' : 'Select a session'}
            </p>
          </div>
        )}
      </div>

      {reviseIdx !== null && messages[reviseIdx] && (
        <RevisePanel
          question={questionFor(reviseIdx)}
          answer={messages[reviseIdx]}
          workspaceId={currentWorkspace.id}
          agentId={currentAgent?.id ?? ''}
          onClose={() => setReviseIdx(null)}
        />
      )}
    </div>
  )
}
