'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AlertCircle, ChevronRight, Loader2, ScrollText, Sparkles, Trash2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

const ACCEPT_TYPES = '.pdf,.docx,.doc,.txt,.md'
const MAX_SIZE_BYTES = 10 * 1024 * 1024

type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed'

interface AgentDocument {
  id: number
  agentId: number
  workspaceId: number
  fileName: string
  fileSize: number
  mimeType: string
  status: DocumentStatus
  errorMessage: string | null
  chunkCount: number
  createdAt: string
  updatedAt: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusBadge: Record<DocumentStatus, { label: string; bg: string; color: string }> = {
  ready:      { label: 'Trained',    bg: 'var(--success-soft)', color: 'var(--success)' },
  pending:    { label: 'Queued',     bg: 'var(--warn-soft)',    color: 'var(--warn)'    },
  processing: { label: 'Processing', bg: 'var(--accent-soft)',  color: 'var(--accent)'  },
  failed:     { label: 'Failed',     bg: 'var(--danger-soft)',  color: 'var(--danger)'  },
}

export default function DataSourcesFilesPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [documents, setDocuments]   = useState<AgentDocument[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [training, setTraining]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const [filter, setFilter]         = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const workspaceId = currentWorkspace?.id
  const agentId     = currentAgent?.id

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<{ documents: AgentDocument[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/documents`
      )
      setDocuments(data.documents ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
      setDocuments([])
    } finally { setLoading(false) }
  }, [workspaceId, agentId])

  useEffect(() => {
    fetchDocuments()
    const t = setInterval(fetchDocuments, 5000)
    return () => clearInterval(t)
  }, [fetchDocuments])

  const pendingCount = documents.filter((d) => d.status === 'pending').length
  const canTrain     = pendingCount > 0 && !training

  const uploadFile = useCallback(async (file: File) => {
    if (!workspaceId || !agentId) return
    if (file.size > MAX_SIZE_BYTES) { setError('File too large. Max 10 MB.'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf','docx','doc','txt','md'].includes(ext)) {
      setError('Unsupported type. Use PDF, DOCX, TXT, or MD.')
      return
    }
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/workspaces/${workspaceId}/agents/${agentId}/documents`, form,
        { headers: { 'Content-Type': undefined } as Record<string, string | undefined> })
      await fetchDocuments()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Upload failed'))
    } finally { setUploading(false) }
  }, [workspaceId, agentId, fetchDocuments])

  const handleTrain = useCallback(async () => {
    if (!workspaceId || !agentId || !canTrain) return
    setTraining(true); setError(null)
    try {
      await api.post(`/workspaces/${workspaceId}/agents/${agentId}/documents/train`)
      await fetchDocuments()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Training failed'))
    } finally { setTraining(false) }
  }, [workspaceId, agentId, canTrain, fetchDocuments])

  const handleRemove = useCallback(async (documentId: number) => {
    if (!workspaceId || !agentId) return
    try {
      await api.delete(`/workspaces/${workspaceId}/agents/${agentId}/documents/${documentId}`)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    } catch { setError('Failed to delete document') }
  }, [workspaceId, agentId])

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) return
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      if (f.size <= MAX_SIZE_BYTES) uploadFile(f)
    }
  }, [uploadFile])

  const handleDrop       = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragCounter(0); setIsDragging(false); addFiles(e.dataTransfer.files) }, [addFiles])
  const handleDragOver   = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy' }, [])
  const handleDragEnter  = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragCounter((c) => c + 1); if (e.dataTransfer.types.includes('Files')) setIsDragging(true) }, [])
  const handleDragLeave  = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragCounter((c) => { const next = c - 1; if (next <= 0) setIsDragging(false); return Math.max(0, next) }) }, [])
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { addFiles(e.target.files); e.target.value = '' }, [addFiles])

  const filtered = filter.trim()
    ? documents.filter((d) => d.fileName.toLowerCase().includes(filter.toLowerCase()))
    : documents

  if (!currentAgent) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Select an agent to manage files.</p>
      </div>
    )
  }

  return (
    <div
      style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}
      onDrop={handleDrop} onDragOver={handleDragOver}
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
    >
      <input ref={inputRef} type="file" multiple className="hidden" accept={ACCEPT_TYPES} onChange={handleInputChange} disabled={uploading} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 28px 48px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>Files</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5, maxWidth: '58ch' }}>
              Upload documents the agent can reference. PDF, DOCX, TXT, MD up to 10 MB each.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
            {pendingCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                height: 24, padding: '0 9px', borderRadius: 4,
                fontSize: 11.5, fontWeight: 500,
                background: 'var(--warn-soft)', color: 'var(--warn)',
                fontFamily: 'var(--font-mono)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', display: 'inline-block', flexShrink: 0 }} />
                {pendingCount} file{pendingCount !== 1 ? 's' : ''} pending training
              </span>
            )}
            <button
              type="button"
              onClick={handleTrain}
              disabled={!canTrain}
              className="btn btn--primary btn--sm"
            >
              {training
                ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Training…</>
                : <><Sparkles style={{ width: 12, height: 12 }} /> Train agent</>
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'var(--danger-soft)', border: '1px solid rgba(195,54,101,0.15)', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Dropzone */}
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            padding: '32px 22px',
            background: isDragging ? 'var(--accent-soft)' : 'var(--surface)',
            border: `1.5px dashed ${isDragging ? 'var(--accent)' : 'var(--line-strong)'}`,
            borderRadius: 'var(--r-lg)',
            display: 'flex', alignItems: 'center', gap: 18,
            justifyContent: 'center', flexDirection: 'column',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'border-color .15s, background .15s',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--r-md)',
            background: 'var(--bg)', border: '1px solid var(--line)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)',
          }}>
            {uploading
              ? <Loader2 style={{ width: 20, height: 20 }} className="animate-spin" />
              : <ScrollText style={{ width: 20, height: 20 }} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)', marginBottom: 3 }}>
              {uploading ? 'Uploading…' : 'Drag files here or click to upload'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>PDF, DOCX, TXT, MD · max 10 MB · up to 20 MB total on Standard</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!uploading) inputRef.current?.click() }}
            disabled={uploading}
            className="btn btn--secondary btn--sm"
          >
            Choose files
          </button>
        </div>

        {/* Files card */}
        {(loading && documents.length === 0) ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 style={{ width: 20, height: 20, color: 'var(--ink-4)' }} className="animate-spin" />
          </div>
        ) : documents.length > 0 && (
          <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                Uploaded · {documents.length}
              </span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter…"
                style={{
                  width: 180, height: 28, padding: '0 10px',
                  border: '1px solid var(--line-2)', borderRadius: 6,
                  background: 'var(--bg)', fontSize: 12, color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>

            {/* File rows */}
            {filtered.map((doc) => {
              const badge = statusBadge[doc.status]
              return (
                <div
                  key={doc.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderTop: '1px solid var(--line)' }}
                  className="hover:bg-[var(--bg-2)]"
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ScrollText style={{ width: 14, height: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.fileName}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                      {formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                      {doc.status === 'ready' && doc.chunkCount > 0 && ` · ${doc.chunkCount} chunks`}
                      {doc.status === 'processing' && ' · Processing…'}
                      {doc.status === 'failed' && doc.errorMessage && ` · ${doc.errorMessage}`}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
                    borderRadius: 4, fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
                    background: badge.bg, color: badge.color, flexShrink: 0,
                  }}>
                    {doc.status === 'processing'
                      ? <><Loader2 style={{ width: 10, height: 10, marginRight: 4 }} className="animate-spin" />{badge.label}</>
                      : badge.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(doc.id)}
                    aria-label="Remove"
                    style={{ width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer', flexShrink: 0 }}
                    className="hover:bg-[var(--bg-2)] hover:!text-[var(--danger)]"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )
            })}

            {filtered.length === 0 && filter && (
              <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 13, color: 'var(--ink-4)' }}>
                No files match &ldquo;{filter}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
