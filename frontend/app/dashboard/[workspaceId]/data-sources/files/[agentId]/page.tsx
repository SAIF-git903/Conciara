'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FileText, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { DataSourcesTrainingCard, type TrainingStatus } from '../../DataSourcesTrainingCard'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

const ACCEPT_TYPES = '.pdf,.docx,.doc,.txt,.md'
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

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
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DataSourcesFilesPage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const [documents, setDocuments] = useState<AgentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [training, setTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ documents: AgentDocument[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/documents`
      )
      setDocuments(data.documents ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, agentId])

  useEffect(() => {
    fetchDocuments()
    const t = setInterval(fetchDocuments, 5000)
    return () => clearInterval(t)
  }, [fetchDocuments])

  const hasReady = documents.some((d) => d.status === 'ready')
  const hasPending = documents.some((d) => d.status === 'pending')
  const trainingStatus: TrainingStatus = training ? 'training' : hasReady ? 'trained' : hasPending ? 'idle' : 'idle'
  const lastReady = documents.filter((d) => d.status === 'ready').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
  const lastTrainedAt = lastReady
    ? (() => {
        const d = new Date(lastReady.updatedAt)
        const diff = (Date.now() - d.getTime()) / 1000
        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
        return formatDate(lastReady.updatedAt)
      })()
    : null
  const canTrain = hasPending && !training

  const uploadFile = useCallback(
    async (file: File) => {
      if (!workspaceId || !agentId) return
      if (file.size > MAX_SIZE_BYTES) {
        setError('File too large. Max 10 MB.')
        return
      }
      const ext = file.name.split('.').pop()?.toLowerCase()
      const allowed = ['pdf', 'docx', 'doc', 'txt', 'md']
      if (!ext || !allowed.includes(ext)) {
        setError('Unsupported type. Use PDF, DOCX, TXT, or MD.')
        return
      }
      setUploading(true)
      setError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        await api.post(
          `/workspaces/${workspaceId}/agents/${agentId}/documents`,
          form,
          { headers: { 'Content-Type': undefined } as Record<string, string | undefined> }
        )
        await fetchDocuments()
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
        const errorStr: string = typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Upload failed')
        setError(errorStr)
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, agentId, fetchDocuments]
  )

  const handleTrain = useCallback(async () => {
    if (!workspaceId || !agentId || !canTrain) return
    setTraining(true)
    setError(null)
    try {
      await api.post<{ trained: number }>(`/workspaces/${workspaceId}/agents/${agentId}/documents/train`)
      await fetchDocuments()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { error?: string } } }).response?.data?.error
      const errorStr: string = typeof msg === 'string' ? msg : (e instanceof Error ? e.message : 'Training failed')
      setError(errorStr)
    } finally {
      setTraining(false)
    }
  }, [workspaceId, agentId, canTrain, fetchDocuments])

  const handleRemove = useCallback(
    async (documentId: number) => {
      if (!workspaceId || !agentId) return
      try {
        await api.delete(`/workspaces/${workspaceId}/agents/${agentId}/documents/${documentId}`)
        setDocuments((prev) => prev.filter((d) => d.id !== documentId))
      } catch {
        setError('Failed to delete document')
      }
    },
    [workspaceId, agentId]
  )

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        if (file.size <= MAX_SIZE_BYTES) uploadFile(file)
      }
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCounter(0)
      setIsDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((c) => c + 1)
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter((c) => {
      const next = c - 1
      if (next <= 0) setIsDragging(false)
      return Math.max(0, next)
    })
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files)
      e.target.value = ''
    },
    [addFiles]
  )

  if (!currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select an agent from the header to manage files.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Files</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Upload documents. The agent uses this content to answer questions.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ACCEPT_TYPES}
          onChange={handleFileInputChange}
          disabled={uploading}
        />
        <div className="mt-4">
          <DataSourcesTrainingCard
            status={trainingStatus}
            lastTrainedAt={lastTrainedAt}
            onTrain={handleTrain}
            disabled={!canTrain}
          />
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div
        className="flex-1 overflow-auto p-6"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className="mx-auto max-w-3xl space-y-6 relative">
          {isDragging && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--v2-primary)] bg-[var(--v2-primary)]/10 transition"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v2-primary)]/20 text-[var(--v2-primary)]">
                <FileText className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">Drop files here</p>
              <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, MD · max 10 MB</p>
            </div>
          )}
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition ${
              uploading ? 'cursor-not-allowed opacity-60' : ''
            } ${isDragging ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {uploading ? 'Uploading…' : 'Drag files here or click to upload'}
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, MD · max 10 MB</p>
          </div>

          {loading && documents.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : documents.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-4 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-slate-50/80"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                        {doc.status === 'ready' && doc.chunkCount > 0 && ` · ${doc.chunkCount} chunks`}
                        {doc.status === 'processing' && ' · Processing…'}
                        {doc.status === 'pending' && ' · Queued'}
                        {doc.status === 'failed' && doc.errorMessage && ` · ${doc.errorMessage}`}
                      </p>
                    </div>
                    {doc.status === 'processing' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
                    <button
                      type="button"
                      onClick={() => handleRemove(doc.id)}
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
