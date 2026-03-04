'use client'

import { useState, useRef, useCallback } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { DataSourcesTrainingCard, type TrainingStatus } from '../DataSourcesTrainingCard'

const ACCEPT_TYPES = '.pdf,.docx,.doc,.txt,.md'
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

type FileItem = { id: string; name: string; size: string; addedAt: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToItem(file: File): FileItem | null {
  if (file.size > MAX_SIZE_BYTES) return null
  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowed = ['pdf', 'docx', 'doc', 'txt', 'md']
  if (!ext || !allowed.includes(ext)) return null
  return {
    id: `${file.name}-${file.size}-${Date.now()}`,
    name: file.name,
    size: formatSize(file.size),
    addedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

function processFileList(fileList: FileList | null): FileItem[] {
  if (!fileList?.length) return []
  const items: FileItem[] = []
  for (let i = 0; i < fileList.length; i++) {
    const item = fileToItem(fileList[i])
    if (item) items.push(item)
  }
  return items
}

export default function DataSourcesFilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('trained')
  const [lastTrainedAt, setLastTrainedAt] = useState<string | null>('2 min ago')
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleTrain = () => {
    setTrainingStatus('training')
    setLastTrainedAt(null)
    setTimeout(() => {
      setTrainingStatus('trained')
      setLastTrainedAt('Just now')
    }, 2000)
  }

  const handleRemove = (id: string) => setFiles((p) => p.filter((f) => f.id !== id))
  const hasData = files.length > 0

  const addFiles = useCallback((newItems: FileItem[]) => {
    if (newItems.length === 0) return
    setFiles((prev) => [...newItems, ...prev])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragCounter(0)
      setIsDragging(false)
      const items = processFileList(e.dataTransfer.files)
      addFiles(items)
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
      const items = processFileList(e.target.files)
      addFiles(items)
      e.target.value = ''
    },
    [addFiles]
  )

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
        />
        <div className="mt-4">
          <DataSourcesTrainingCard
            status={trainingStatus}
            lastTrainedAt={lastTrainedAt}
            onTrain={handleTrain}
            disabled={!hasData}
          />
        </div>
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
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 transition ${
              isDragging
                ? 'border-slate-200 bg-slate-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <FileText className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Drag files here or click to select and upload
            </p>
            <p className="mt-1 text-xs text-slate-500">PDF, DOCX, TXT, MD · max 10 MB</p>
          </div>

          {hasData && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="divide-y divide-slate-100">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 px-4 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-slate-50/80"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{file.size} · {file.addedAt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(file.id)}
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
