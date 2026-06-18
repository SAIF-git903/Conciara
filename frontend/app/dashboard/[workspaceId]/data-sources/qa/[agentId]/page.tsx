'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { BookOpen, Upload, Loader2, Pencil, Trash2, X, BarChart2, CheckCircle2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import QaAnswerEditor from '@/components/QaAnswerEditor'

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

function formatLastAsked(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

/* ─── Shared label style ──────────────────────────────────── */
const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'var(--ink-4)',
  fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 6,
}

export default function DataSourcesQAPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [pairs, setPairs]           = useState<QAPair[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [question, setQuestion]     = useState('')
  const [answer, setAnswer]         = useState('')
  const [editing, setEditing]       = useState<QAPair | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [usageQaId, setUsageQaId]   = useState<number | null>(null)
  const [usageData, setUsageData]   = useState<UsageDay[]>([])
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [importing, setImporting]   = useState(false)
  const [importDone, setImportDone] = useState<number | null>(null)
  const [answerEditorNonce, setAnswerEditorNonce] = useState(0)
  const csvInputRef = useRef<HTMLInputElement>(null)

  const workspaceId = currentWorkspace?.id
  const agentId     = currentAgent?.id

  const fetchQa = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<{ entries: QAPair[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/qa`
      )
      setPairs(data.entries ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Q&A')
      setPairs([])
    } finally { setLoading(false) }
  }, [workspaceId, agentId])

  useEffect(() => { fetchQa() }, [fetchQa])

  const fetchUsage = useCallback(async (qaId: number) => {
    if (!workspaceId || !agentId) return
    setUsageLoading(true); setUsageError(null)
    try {
      const { data } = await api.get<{ usage: UsageDay[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/qa/${qaId}/usage?days=14`
      )
      setUsageData(Array.isArray(data?.usage) ? data.usage : [])
    } catch (e: unknown) {
      const res = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: unknown }; status?: number } }).response : undefined
      const msg = res?.data?.error
      setUsageError(typeof msg === 'string' ? msg : (res?.status === 404 ? 'Usage not found' : (e instanceof Error ? e.message : 'Failed to load usage')))
      setUsageData([])
    } finally { setUsageLoading(false) }
  }, [workspaceId, agentId])

  useEffect(() => {
    if (usageQaId) fetchUsage(usageQaId)
    else { setUsageData([]); setUsageError(null) }
  }, [usageQaId, fetchUsage])

  const handleSave = async () => {
    const q = question.trim(); const a = answer.trim()
    if (!q || !a || !workspaceId || !agentId) return
    setSaving(true); setError(null)
    try {
      await api.post(`/workspaces/${workspaceId}/agents/${agentId}/qa`, { question: q, answer: a })
      setQuestion(''); setAnswer(''); setAnswerEditorNonce((n) => n + 1)
      await fetchQa()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to save'))
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editing || !workspaceId || !agentId) return
    const q = editQuestion.trim(); const a = editAnswer.trim()
    if (!q || !a) return
    setSaving(true); setError(null)
    try {
      await api.put(`/workspaces/${workspaceId}/agents/${agentId}/qa/${editing.id}`, { question: q, answer: a })
      setEditing(null); await fetchQa()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to update'))
    } finally { setSaving(false) }
  }

  const handleRemove = async (id: number) => {
    if (!workspaceId || !agentId || deletingId !== null) return
    setDeletingId(id); setError(null)
    try {
      await api.delete(`/workspaces/${workspaceId}/agents/${agentId}/qa/${id}`)
      await fetchQa()
      if (editing?.id === id) setEditing(null)
      if (usageQaId === id) setUsageQaId(null)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { error?: unknown } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Failed to delete'))
    } finally { setDeletingId(null) }
  }

  const parseCsvRow = (row: string): string[] => {
    const result: string[] = []
    let i = 0
    while (i < row.length) {
      if (row[i] === '"') {
        let field = ''; i++
        while (i < row.length) {
          if (row[i] === '"' && row[i + 1] === '"') { field += '"'; i += 2 }
          else if (row[i] === '"') { i++; break }
          else { field += row[i]; i++ }
        }
        result.push(field)
        if (row[i] === ',') i++
      } else {
        const end = row.indexOf(',', i)
        if (end === -1) { result.push(row.slice(i)); break }
        else { result.push(row.slice(i, end)); i = end + 1 }
      }
    }
    return result
  }

  const handleImportCSV = async (file: File) => {
    if (!workspaceId || !agentId || importing) return
    setImporting(true); setError(null); setImportDone(null)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      if (lines.length < 2) { setError('CSV must have a header row and at least one data row.'); return }
      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().trim())
      const qIdx = headers.findIndex((h) => h === 'question' || h === 'q')
      const aIdx = headers.findIndex((h) => h === 'answer' || h === 'a')
      if (qIdx === -1 || aIdx === -1) {
        setError('CSV must have "question" and "answer" columns (or "q" and "a").')
        return
      }
      const rows = lines.slice(1).map((l) => parseCsvRow(l))
        .filter((cols) => cols[qIdx]?.trim() && cols[aIdx]?.trim())
      if (rows.length === 0) { setError('No valid rows found in the CSV.'); return }
      let imported = 0
      for (const cols of rows) {
        try {
          await api.post(`/workspaces/${workspaceId}/agents/${agentId}/qa`, {
            question: cols[qIdx].trim(),
            answer: cols[aIdx].trim(),
          })
          imported++
        } catch { /* skip invalid rows */ }
      }
      await fetchQa()
      setImportDone(imported)
      setTimeout(() => setImportDone(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const canSave = question.trim() && answer.trim()

  if (!currentAgent || !currentWorkspace) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Select an agent to manage Q&amp;A.</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 28px 48px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>Q&amp;A pairs</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5, maxWidth: '58ch' }}>
              Exact question–answer pairs the agent prioritizes over training data. No retraining needed.
            </p>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f) }}
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className="btn btn--secondary btn--sm"
            style={{ flexShrink: 0, marginTop: 2 }}
          >
            {importing
              ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Importing…</>
              : importDone !== null
              ? <><CheckCircle2 style={{ width: 12, height: 12, color: 'var(--success)' }} /> {importDone} imported</>
              : <><Upload style={{ width: 12, height: 12 }} /> Import CSV</>}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'var(--danger-soft)', border: '1px solid rgba(195,54,101,0.15)', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* New Q&A card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>New Q&amp;A</span>
          </div>
          <div style={{ padding: 18 }}>

            {/* Question */}
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabel}>Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What are your business hours?"
                style={{
                  width: '100%', height: 36, padding: '0 11px',
                  border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                  background: 'var(--surface)', fontSize: 13, color: 'var(--ink)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color .12s, box-shadow .12s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none' }}
                disabled={saving}
              />
            </div>

            {/* Answer */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ ...fieldLabel, marginBottom: 0 }}>Answer</label>
              </div>
              <QaAnswerEditor
                instanceKey={`create-${answerEditorNonce}`}
                value={answer}
                onChange={setAnswer}
                placeholder="e.g. We're open Monday to Friday, 9am to 5pm EST."
                disabled={saving}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setQuestion(''); setAnswer(''); setAnswerEditorNonce((n) => n + 1) }}
                className="btn btn--ghost btn--sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                className="btn btn--primary btn--sm"
              >
                {saving ? 'Saving…' : 'Save Q&A'}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Q&A card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
              Existing Q&amp;A · {pairs.length}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 style={{ width: 18, height: 18, color: 'var(--ink-4)' }} className="animate-spin" />
            </div>
          ) : pairs.length === 0 ? (
            /* Empty state */
            <div style={{ textAlign: 'center', padding: '36px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-2)', color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <BookOpen style={{ width: 16, height: 16 }} />
              </div>
              <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink-2)' }}>No Q&amp;A pairs yet</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-4)', maxWidth: '44ch', lineHeight: 1.5 }}>
                Add one above. They'll be matched against incoming questions and answered verbatim.
              </div>
            </div>
          ) : (
            pairs.map((pair, idx) => (
              <div
                key={pair.id}
                style={{ padding: '12px 18px', borderTop: idx === 0 ? 'none' : '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                className="group hover:bg-[var(--bg-2)]"
              >
                {/* Index */}
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
                }}>
                  {idx + 1}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{pair.question}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5, marginBottom: 6 }}>
                    {pair.answer}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--ink-4)', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{pair.timesAsked}× asked</span>
                    <span style={{ color: 'var(--ink-5)' }}>·</span>
                    <span>Last: {formatLastAsked(pair.lastAskedAt)}</span>
                    <button
                      type="button"
                      onClick={() => setUsageQaId(usageQaId === pair.id ? null : pair.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--accent)', fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    >
                      <BarChart2 style={{ width: 12, height: 12 }} /> Usage
                    </button>
                  </div>

                  {/* Usage chart */}
                  {usageQaId === pair.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-3)', margin: '0 0 8px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Asks · last 14 days
                      </p>
                      {usageLoading ? (
                        <Loader2 style={{ width: 14, height: 14, color: 'var(--ink-4)' }} className="animate-spin" />
                      ) : usageError ? (
                        <p style={{ fontSize: 12, color: 'var(--danger)' }}>{usageError}</p>
                      ) : usageData.length > 0 ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
                            {(() => {
                              const max = Math.max(1, ...usageData.map((u) => u.count))
                              return usageData.map((d) => (
                                <div
                                  key={d.date}
                                  title={`${d.date}: ${d.count}`}
                                  style={{
                                    flex: 1, borderRadius: '3px 3px 0 0', minWidth: 0,
                                    background: d.count === 0 ? 'var(--line)' : 'var(--accent)',
                                    opacity: d.count === 0 ? 0.5 : 0.85,
                                    height: d.count === 0 ? 3 : Math.max(6, Math.round((d.count / max) * 48)),
                                  }}
                                />
                              ))
                            })()}
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--ink-5)', margin: '4px 0 0', fontFamily: 'var(--font-mono)' }}>
                            {usageData[0]?.date} – {usageData[usageData.length - 1]?.date}
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>No usage in the last 14 days.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setEditing(pair); setEditQuestion(pair.question); setEditAnswer(pair.answer) }}
                    aria-label="Edit"
                    style={{ width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer' }}
                    className="hover:bg-[var(--bg-2)] hover:!text-[var(--ink)]"
                  >
                    <Pencil style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(pair.id)}
                    disabled={deletingId !== null}
                    aria-label="Delete"
                    style={{ width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: deletingId !== null ? 'not-allowed' : 'pointer', opacity: deletingId !== null && deletingId !== pair.id ? 0.4 : 1 }}
                    className={deletingId === null ? 'hover:bg-[var(--danger-soft)] hover:!text-[var(--danger)]' : ''}
                  >
                    {deletingId === pair.id
                      ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                      : <Trash2 style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,18,0.45)', padding: 20, backdropFilter: 'blur(2px)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line-2)', boxShadow: '0 28px 64px rgba(0,0,0,0.18)', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 650, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>Edit Q&amp;A</h3>
              <button type="button" onClick={() => setEditing(null)} style={{ width: 28, height: 28, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)' }} className="hover:bg-[var(--bg-2)]">
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={fieldLabel}>Question</label>
                <input
                  type="text"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 11px', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', background: 'var(--surface)', fontSize: 13, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>Answer</label>
                <QaAnswerEditor instanceKey={`edit-${editing.id}`} value={editAnswer} onChange={setEditAnswer} placeholder="Answer…" disabled={saving} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setEditing(null)} className="btn btn--ghost btn--sm">Cancel</button>
                <button type="button" onClick={handleUpdate} disabled={!editQuestion.trim() || !editAnswer.trim() || saving} className="btn btn--primary btn--sm">
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
