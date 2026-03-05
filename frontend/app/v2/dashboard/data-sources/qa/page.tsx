'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  HelpCircle,
  Pencil,
  Trash2,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Code,
  Quote,
  BarChart3,
  X,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import v2Api from '@/lib/v2-api'

type QAPair = {
  id: number
  agentId: number
  workspaceId: number
  question: string
  answer: string
  timesAsked: number
  lastAskedAt: string | null
  createdAt: string
  updatedAt: string
}

type UsageDay = { date: string; count: number }

const MARKDOWN_ACTIONS: { icon: typeof Bold; wrap: [string, string]; label: string }[] = [
  { icon: Bold, wrap: ['**', '**'], label: 'Bold' },
  { icon: Italic, wrap: ['*', '*'], label: 'Italic' },
  { icon: Underline, wrap: ['<u>', '</u>'], label: 'Underline' },
  { icon: Link, wrap: ['[', '](url)'], label: 'Link' },
  { icon: List, wrap: ['\n- ', ''], label: 'Bullet list' },
  { icon: ListOrdered, wrap: ['\n1. ', ''], label: 'Numbered list' },
  { icon: Code, wrap: ['`', '`'], label: 'Code' },
  { icon: Quote, wrap: ['\n> ', ''], label: 'Quote' },
]

function insertAtCursor(textarea: HTMLTextAreaElement, before: string, after: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
  textarea.value = newValue
  textarea.focus()
  textarea.setSelectionRange(start + before.length, end + before.length)
  return newValue
}

function formatLastAsked(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return d.toLocaleDateString()
}

export default function DataSourcesQAPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [pairs, setPairs] = useState<QAPair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [editing, setEditing] = useState<QAPair | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [usageQaId, setUsageQaId] = useState<number | null>(null)
  const [usageData, setUsageData] = useState<UsageDay[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const answerRef = useRef<HTMLTextAreaElement>(null)

  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const fetchQa = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await v2Api.get<{ entries: QAPair[] }>(
        `/v2/workspaces/${workspaceId}/agents/${agentId}/qa`
      )
      setPairs(data.entries ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Q&A')
      setPairs([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, agentId])

  useEffect(() => {
    fetchQa()
  }, [fetchQa])

  const fetchUsage = useCallback(
    async (qaId: number) => {
      if (!workspaceId || !agentId) return
      setUsageLoading(true)
      setUsageError(null)
      try {
        const { data } = await v2Api.get<{ usage: UsageDay[] }>(
          `/v2/workspaces/${workspaceId}/agents/${agentId}/qa/${qaId}/usage?days=14`
        )
        setUsageData(Array.isArray(data?.usage) ? data.usage : [])
      } catch (e: unknown) {
        const res = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: unknown }; status?: number } }).response : undefined
        const msg = res?.data?.error
        const status = res?.status
        const errStr = typeof msg === 'string' ? msg : (status === 404 ? 'Usage endpoint not found' : (e instanceof Error ? e.message : 'Failed to load usage'))
        setUsageError(errStr)
        setUsageData([])
      } finally {
        setUsageLoading(false)
      }
    },
    [workspaceId, agentId]
  )

  useEffect(() => {
    if (usageQaId) fetchUsage(usageQaId)
    else {
      setUsageData([])
      setUsageError(null)
    }
  }, [usageQaId, fetchUsage])

  const handleSave = async () => {
    const q = question.trim()
    const a = answer.trim()
    if (!q || !a || !workspaceId || !agentId) return
    setSaving(true)
    setError(null)
    try {
      await v2Api.post(`/v2/workspaces/${workspaceId}/agents/${agentId}/qa`, { question: q, answer: a })
      setQuestion('')
      setAnswer('')
      await fetchQa()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing || !workspaceId || !agentId) return
    const q = editQuestion.trim()
    const a = editAnswer.trim()
    if (!q || !a) return
    setSaving(true)
    setError(null)
    try {
      await v2Api.put(
        `/v2/workspaces/${workspaceId}/agents/${agentId}/qa/${editing.id}`,
        { question: q, answer: a }
      )
      setEditing(null)
      await fetchQa()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to update'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: number) => {
    if (!workspaceId || !agentId) return
    if (!confirm('Delete this Q&A entry?')) return
    setError(null)
    try {
      await v2Api.delete(`/v2/workspaces/${workspaceId}/agents/${agentId}/qa/${id}`)
      await fetchQa()
      if (editing?.id === id) setEditing(null)
      if (usageQaId === id) setUsageQaId(null)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to delete'))
    }
  }

  const handleFormat = (before: string, after: string) => {
    const el = answerRef.current
    if (!el) return
    const newValue = insertAtCursor(el, before, after)
    setAnswer(newValue)
  }

  const hasData = pairs.length > 0
  const canSave = question.trim() && answer.trim()

  if (!currentAgent || !currentWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select an agent from the header to manage Q&A.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Q&A</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add question–answer pairs for exact answers. The agent prioritizes these when users ask matching questions. No training needed—entries are used immediately.
          </p>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Add new Q&A card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label htmlFor="qa-question" className="block text-sm font-medium text-slate-700">
                  Question
                </label>
                <input
                  id="qa-question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are your business hours?"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="qa-answer" className="block text-sm font-medium text-slate-700">
                    Answer
                  </label>
                  <span className="text-xs text-slate-500">Markdown supported</span>
                </div>
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-white focus-within:border-[var(--v2-primary)] focus-within:ring-1 focus-within:ring-[var(--v2-primary)]">
                  <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
                    {MARKDOWN_ACTIONS.map(({ icon: Icon, wrap, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleFormat(wrap[0], wrap[1])}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        title={label}
                        aria-label={label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="qa-answer"
                    ref={answerRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g. We're open Monday to Friday, 9am to 5pm EST."
                    rows={5}
                    className="w-full resize-y rounded-b-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setQuestion(''); setAnswer('') }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Q&A'}
                </button>
              </div>
            </div>
          </div>

          {/* Existing Q&A */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Existing Q&A</h2>
              {hasData && (
                <span className="text-xs text-slate-500">{pairs.length} pair{pairs.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {loading ? (
              <div className="mt-4 py-8 text-center text-sm text-slate-500">Loading…</div>
            ) : !hasData ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <HelpCircle className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No Q&A pairs yet. Add one above.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {pairs.map((pair, index) => (
                    <div
                      key={pair.id}
                      className="group flex items-start gap-4 px-4 py-3 transition-colors hover:bg-slate-50/80 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-medium text-slate-900">{pair.question}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{pair.answer}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>{pair.timesAsked} time{pair.timesAsked !== 1 ? 's' : ''} asked</span>
                          <span>Last: {formatLastAsked(pair.lastAskedAt)}</span>
                          <button
                            type="button"
                            onClick={() => setUsageQaId(usageQaId === pair.id ? null : pair.id)}
                            className="inline-flex items-center gap-1 font-medium text-[var(--v2-primary)] hover:underline"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Usage
                          </button>
                        </div>
                        {usageQaId === pair.id && (
                          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                            <p className="mb-2 text-xs font-medium text-slate-600">Asks over last 14 days</p>
                            {usageLoading ? (
                              <p className="text-xs text-slate-500">Loading…</p>
                            ) : usageError ? (
                              <p className="text-xs text-red-600">{usageError}</p>
                            ) : usageData.length > 0 ? (
                              <>
                                <div className="flex items-end gap-0.5" style={{ height: 32 }}>
                                  {usageData.map((d) => {
                                    const maxCount = Math.max(1, ...usageData.map((u) => u.count))
                                    return (
                                      <div
                                        key={d.date}
                                        className="flex-1 rounded-t bg-[var(--v2-primary)]/70 min-w-0"
                                        style={{ height: `${Math.max(2, (d.count / maxCount) * 100)}%` }}
                                        title={`${d.date}: ${d.count}`}
                                      />
                                    )
                                  })}
                                </div>
                                <p className="mt-1 text-xs text-slate-400">
                                  {usageData[0]?.date} – {usageData[usageData.length - 1]?.date}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500">No usage in the last 14 days. Usage is recorded when the agent uses this Q&A in a reply.</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(pair)
                            setEditQuestion(pair.question)
                            setEditAnswer(pair.answer)
                          }}
                          className="rounded p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(pair.id)}
                          className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Q&A</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Question</label>
                <input
                  type="text"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Answer</label>
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!editQuestion.trim() || !editAnswer.trim() || saving}
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
