'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import v2Api from '@/lib/v2-api'

type Crawl = {
  id: number
  url: string
  title: string | null
  description: string | null
  logoUrl: string | null
  useCase: string | null
  trainingContent: string
  metadata: Record<string, unknown>
  createdAt: string
}

function formatCrawlDate(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DataSourcesWebsitePage() {
  const { currentWorkspace, currentAgent } = useDashboard()
  const workspaceId = currentWorkspace?.id
  const agentId = currentAgent?.id

  const [crawls, setCrawls] = useState<Crawl[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState('')
  const [crawlingUrl, setCrawlingUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [recrawlingId, setRecrawlingId] = useState<number | null>(null)

  const fetchCrawls = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await v2Api.get<{ crawls: Crawl[] }>(
        `/v2/workspaces/${workspaceId}/agents/${agentId}/crawls`
      )
      setCrawls(data.crawls ?? [])
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setError(msg || (e instanceof Error ? e.message : 'Failed to load crawls'))
      setCrawls([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId, agentId])

  useEffect(() => {
    if (!workspaceId || !agentId) {
      setCrawls([])
      setLoading(false)
      return
    }
    fetchCrawls()
  }, [workspaceId, agentId, fetchCrawls])

  const addSite = useCallback(
    async (url: string) => {
      if (!workspaceId || !agentId) return
      setCrawlingUrl(url)
      setError(null)
      try {
        await v2Api.post<{ crawl: Crawl }>(`/v2/workspaces/${workspaceId}/crawl`, {
          url: url.trim(),
          agentId,
        })
        setNewUrl('')
        await fetchCrawls()
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : null
        setError(msg || (e instanceof Error ? e.message : 'Crawl failed'))
      } finally {
        setCrawlingUrl(null)
      }
    },
    [workspaceId, agentId, fetchCrawls]
  )

  const handleRemove = useCallback(
    async (crawlId: number) => {
      if (!workspaceId) return
      setDeletingId(crawlId)
      setError(null)
      try {
        await v2Api.delete(`/v2/workspaces/${workspaceId}/crawls/${crawlId}`)
        setCrawls((prev) => prev.filter((c) => c.id !== crawlId))
      } catch {
        setError('Failed to delete website')
      } finally {
        setDeletingId(null)
      }
    },
    [workspaceId]
  )

  const handleRecrawl = useCallback(
    async (crawl: Crawl) => {
      if (!workspaceId || !agentId) return
      setRecrawlingId(crawl.id)
      setError(null)
      try {
        await v2Api.post(`/v2/workspaces/${workspaceId}/crawl`, {
          url: crawl.url,
          agentId,
        })
        await fetchCrawls()
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : null
        setError(msg || (e instanceof Error ? e.message : 'Re-crawl failed'))
      } finally {
        setRecrawlingId(null)
      }
    },
    [workspaceId, agentId, fetchCrawls]
  )

  const hasData = crawls.length > 0
  const isCrawling = crawlingUrl !== null

  if (!currentWorkspace || !currentAgent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-slate-500">
        <Globe className="h-10 w-10" />
        <p className="text-sm">Select an agent to manage website sources.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Website</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add URLs to crawl. The agent uses the indexed content to answer questions in chat.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Add website URL card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Globe className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="website-url" className="block text-sm font-medium text-slate-700">
                  Add website URL
                </label>
                <p className="text-xs text-slate-500">We’ll crawl and index the page for your agent.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="website-url"
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newUrl.trim() && !isCrawling) addSite(newUrl.trim())
                  }
                }}
                placeholder="https://example.com or https://example.com/docs"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              />
              <button
                type="button"
                onClick={() => newUrl.trim() && !isCrawling && addSite(newUrl.trim())}
                disabled={!newUrl.trim() || isCrawling}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--v2-primary)] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isCrawling && crawlingUrl === newUrl.trim() ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Crawling…
                  </>
                ) : (
                  'Crawl'
                )}
              </button>
            </div>
          </div>

          {/* Website list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : !hasData && !crawlingUrl ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Globe className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">No websites yet</p>
              <p className="mt-1 text-xs text-slate-500">Add a URL above to crawl and index its content.</p>
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-sm font-medium text-slate-700">Crawled websites</h2>
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {crawlingUrl && !crawls.some((c) => c.url === crawlingUrl) && (
                    <div className="flex items-center gap-4 px-4 py-3 bg-amber-50/70">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{crawlingUrl}</p>
                        <p className="text-xs text-amber-700">Crawling…</p>
                      </div>
                      <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Crawling
                      </span>
                    </div>
                  )}
                  {crawls.map((crawl) => {
                    const isRecrawling = recrawlingId === crawl.id
                    const isDeleting = deletingId === crawl.id
                    return (
                      <div
                        key={crawl.id}
                        className="flex items-center gap-4 px-4 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {crawl.title || crawl.url}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {crawl.url} · {formatCrawlDate(crawl.createdAt)}
                          </p>
                        </div>
                        <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Indexed
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRecrawl(crawl)}
                          disabled={isRecrawling || isCrawling}
                          className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                          aria-label="Re-crawl"
                          title="Re-crawl"
                        >
                          {isRecrawling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(crawl.id)}
                          disabled={isDeleting}
                          className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          aria-label="Remove"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
