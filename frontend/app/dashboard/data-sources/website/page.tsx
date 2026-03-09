'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Globe,
  Trash2,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Info,
  Zap,
  Check,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

const DURATION_MS = 380
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useAnimatedNumber(
  target: number | null,
  options: { decimals?: number; duration?: number } = {}
): number | null {
  const { decimals = 0, duration = DURATION_MS } = options
  const [display, setDisplay] = useState<number | null>(target)
  const rafRef = useRef<number | null>(null)
  const currentRef = useRef<number | null>(target)

  useEffect(() => {
    if (target === null) {
      currentRef.current = null
      setDisplay(null)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      return
    }
    const startValue = currentRef.current ?? target
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(t)
      const next = startValue + (target - startValue) * eased
      currentRef.current = next
      setDisplay(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        currentRef.current = target
        setDisplay(target)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  if (target === null) return null
  if (display === null) return target
  const rounded = decimals === 0 ? Math.round(display) : Number(display.toFixed(decimals))
  return rounded
}

type CrawlPage = { url: string; title?: string }

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
  pagesCrawled?: number
  crawledPages?: CrawlPage[]
}

function formatCrawlDate(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 3600 * 2) return '1 hour ago'
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Link is "New" until the agent has been trained (or was added after last train). */
function isLinkNew(crawlCreatedAt: string, lastTrainedAt: string | null): boolean {
  if (!lastTrainedAt) return true
  return new Date(crawlCreatedAt) > new Date(lastTrainedAt)
}

/** Base URL (origin + path for display). */
function baseUrlDisplay(url: string): string {
  try {
    const u = new URL(url)
    return u.origin + (u.pathname === '/' ? '/' : u.pathname)
  } catch {
    return url
  }
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
  const [expandedCrawlId, setExpandedCrawlId] = useState<number | null>(null)
  const [crawlMenuId, setCrawlMenuId] = useState<number | null>(null)
  type CrawlStats = {
    linkCount: number
    crawlSizeBytes: number
    totalLimitBytes: number | null
    trainedSizeBytes: number | null
    lastTrainedAt: string | null
    trainedLinkCount: number | null
    hasUnappliedChanges: boolean
    linksNotFedCount?: number
    trainingInProgress: boolean
    trainedSizeBytesSoFar: number | null
    trainedLinksSoFar: number | null
    totalLinksProgress: number | null
  }
  const [crawlStats, setCrawlStats] = useState<CrawlStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainError, setTrainError] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCrawlStats = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setStatsLoading(true)
    try {
      const { data } = await api.get<CrawlStats>(
        `/workspaces/${workspaceId}/agents/${agentId}/crawl-stats`
      )
      setCrawlStats(data)
      return data
    } catch {
      setCrawlStats(null)
      return null
    } finally {
      setStatsLoading(false)
    }
  }, [workspaceId, agentId])

  const fetchCrawls = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ crawls: Crawl[] }>(
        `/workspaces/${workspaceId}/agents/${agentId}/crawls`
      )
      setCrawls(data.crawls ?? [])
      await fetchCrawlStats()
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
  }, [workspaceId, agentId, fetchCrawlStats])

  useEffect(() => {
    if (!workspaceId || !agentId) {
      setCrawls([])
      setCrawlStats(null)
      setLoading(false)
      return
    }
    fetchCrawls()
  }, [workspaceId, agentId, fetchCrawls])

  useEffect(() => {
    if (workspaceId && agentId) fetchCrawlStats()
  }, [workspaceId, agentId, fetchCrawlStats])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  const handleRetrain = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setIsTraining(true)
    setTrainError(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    try {
      await api.post<{ started?: boolean; error?: string }>(
        `/workspaces/${workspaceId}/agents/${agentId}/train-from-crawls`
      )
      await fetchCrawlStats()
      pollIntervalRef.current = setInterval(async () => {
        const next = await fetchCrawlStats()
        if (next && !next.trainingInProgress) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setIsTraining(false)
        }
      }, 1500)
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string; details?: string } } }).response?.data?.details ||
            (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setTrainError(msg || (e instanceof Error ? e.message : 'Training failed'))
      setIsTraining(false)
    }
  }, [workspaceId, agentId, fetchCrawlStats])

  const addSite = useCallback(
    async (url: string) => {
      if (!workspaceId || !agentId) return
      setCrawlingUrl(url)
      setError(null)
      try {
        await api.post<{ crawl: Crawl }>(`/workspaces/${workspaceId}/crawl`, {
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
      setCrawlMenuId(null)
      setError(null)
      try {
        await api.delete(`/workspaces/${workspaceId}/crawls/${crawlId}`)
        setCrawls((prev) => prev.filter((c) => c.id !== crawlId))
        if (expandedCrawlId === crawlId) setExpandedCrawlId(null)
      } catch {
        setError('Failed to delete website')
      } finally {
        setDeletingId(null)
      }
    },
    [workspaceId, expandedCrawlId]
  )

  const handleRecrawl = useCallback(
    async (crawl: Crawl) => {
      if (!workspaceId || !agentId) return
      setRecrawlingId(crawl.id)
      setCrawlMenuId(null)
      setError(null)
      try {
        await api.post(`/workspaces/${workspaceId}/crawl`, {
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

  // Derived stats for Data sources (and animation targets)
  const linkCount = crawlStats?.linkCount ?? 0
  const trainedLinkCount = crawlStats?.trainedLinkCount ?? null
  const linksFed = trainedLinkCount ?? 0
  const linksNotFed =
    crawlStats?.linksNotFedCount ?? (trainedLinkCount == null ? linkCount : Math.max(0, linkCount - trainedLinkCount))
  const totalSizeFedBytes = linksFed > 0 ? (crawlStats?.trainedSizeBytes ?? 0) : 0
  const crawlSizeBytes = crawlStats?.crawlSizeBytes ?? 0
  const showProgress =
    crawlStats?.trainingInProgress &&
    crawlStats?.trainedLinksSoFar != null &&
    crawlStats?.totalLinksProgress != null
  const remainingSizeBytes =
    linkCount === 0
      ? 0
      : crawlStats?.trainingInProgress && crawlStats?.trainedSizeBytesSoFar != null
        ? Math.max(0, crawlSizeBytes - crawlStats.trainedSizeBytesSoFar)
        : !crawlStats?.hasUnappliedChanges
          ? 0
          : linksFed === 0
            ? crawlSizeBytes
            : Math.max(0, crawlSizeBytes - totalSizeFedBytes)
  const linksFedTarget = statsLoading ? null : showProgress ? (crawlStats?.trainedLinksSoFar ?? null) : linksFed
  const linksNotFedTarget =
    statsLoading ? null : showProgress ? Math.max(0, (crawlStats?.totalLinksProgress ?? 0) - (crawlStats?.trainedLinksSoFar ?? 0)) : linksNotFed
  const totalSizeFedKBTarget =
    statsLoading || linkCount === 0
      ? null
      : crawlStats?.trainingInProgress
        ? (crawlStats.trainedSizeBytesSoFar ?? 0) / 1024
        : linksFed > 0
          ? totalSizeFedBytes / 1024
          : null
  const remainingSizeKBTarget = statsLoading || linkCount === 0 ? null : remainingSizeBytes / 1024

  // Keep last known values so we never show "—" during polling (butter smooth, no glitch)
  const lastKnownRef = useRef({
    linksFed: 0,
    linksNotFed: 0,
    totalSizeKB: 0,
    remainingKB: 0,
  })
  if (linksFedTarget !== null) lastKnownRef.current.linksFed = linksFedTarget
  if (linksNotFedTarget !== null) lastKnownRef.current.linksNotFed = linksNotFedTarget
  if (totalSizeFedKBTarget !== null) lastKnownRef.current.totalSizeKB = totalSizeFedKBTarget
  if (remainingSizeKBTarget !== null) lastKnownRef.current.remainingKB = remainingSizeKBTarget

  const effectiveLinksFedTarget = linkCount === 0 && !crawlStats?.trainingInProgress ? null : (linksFedTarget ?? lastKnownRef.current.linksFed)
  const effectiveLinksNotFedTarget = linkCount === 0 && !crawlStats?.trainingInProgress ? null : (linksNotFedTarget ?? lastKnownRef.current.linksNotFed)
  const effectiveTotalSizeKBTarget = linkCount === 0 && !crawlStats?.trainingInProgress ? null : (totalSizeFedKBTarget ?? lastKnownRef.current.totalSizeKB)
  const effectiveRemainingKBTarget = linkCount === 0 && !crawlStats?.trainingInProgress ? null : (remainingSizeKBTarget ?? lastKnownRef.current.remainingKB)

  const animLinksFed = useAnimatedNumber(effectiveLinksFedTarget)
  const animLinksNotFed = useAnimatedNumber(effectiveLinksNotFedTarget)
  const animTotalSizeKB = useAnimatedNumber(effectiveTotalSizeKBTarget, { decimals: 1 })
  const animRemainingKB = useAnimatedNumber(effectiveRemainingKBTarget, { decimals: 1 })

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
            Add URLs to crawl. We use each URL as an entry point, follow internal links on the same domain, and extract text. Press &quot;Retrain agent&quot; to feed this content to the agent.
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

          {/* Data sources: links fed / not fed, size fed / remaining, Retrain */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Data sources</h2>
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Links fed to agent</p>
                  <p className="mt-1 min-h-[1.75rem] text-xl font-semibold tabular-nums text-slate-900">
                    {animLinksFed === null ? '—' : animLinksFed}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Already used by the agent in chat</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Links not fed yet</p>
                  <p className="mt-1 min-h-[1.75rem] text-xl font-semibold tabular-nums text-slate-900">
                    {animLinksNotFed === null ? '—' : animLinksNotFed}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Retrain to feed these to the agent</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total size fed</p>
                  <p className="mt-1 min-h-[1.75rem] text-xl font-semibold tabular-nums text-slate-900">
                    {animTotalSizeKB === null
                      ? '—'
                      : `${Number(animTotalSizeKB).toFixed(0)} KB${crawlStats?.trainingInProgress ? '+' : ''}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Size in agent knowledge</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Remaining size</p>
                  <p className="mt-1 min-h-[1.75rem] text-xl font-semibold tabular-nums text-slate-900">
                    {animRemainingKB === null ? '—' : `${Number(animRemainingKB).toFixed(0)} KB`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Will be added when you retrain</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleRetrain}
                  disabled={isTraining ? false : !hasData || !crawlStats?.hasUnappliedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Training…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Retrain agent
                    </>
                  )}
                </button>
                {crawlStats?.hasUnappliedChanges && (
                  <span className="text-sm text-amber-700">Retraining is required for changes to apply.</span>
                )}
              </div>
            </>
            {trainError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                {trainError}
              </div>
            )}
          </div>

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
                <p className="text-xs text-slate-500">
                  We’ll crawl and index the page for your agent.
                </p>
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

          {/* Website list - card per crawl with links included (image-style) */}
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
              <p className="mt-1 text-xs text-slate-500">
                Add a URL above to crawl and index its content.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {hasData && crawlStats && (
                <p className="text-xs text-slate-500">
                  {crawlStats.linkCount} link{crawlStats.linkCount === 1 ? '' : 's'} • {(crawlStats.crawlSizeBytes / 1024).toFixed(0)} KB
                </p>
              )}
              {crawlingUrl && !crawls.some((c) => c.url === crawlingUrl) && (
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-amber-50/70 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{crawlingUrl}</p>
                    <p className="text-xs text-amber-700">Crawling…</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Crawling
                  </span>
                </div>
              )}
              {crawls.map((crawl) => {
                const isRecrawling = recrawlingId === crawl.id
                const isDeleting = deletingId === crawl.id
                const linkCount = crawl.pagesCrawled ?? (crawl.crawledPages?.length ?? 1)
                const links = crawl.crawledPages?.length
                  ? crawl.crawledPages
                  : [{ url: crawl.url, title: crawl.title ?? undefined }]
                const isExpanded = expandedCrawlId === crawl.id
                const showNew = isLinkNew(crawl.createdAt, crawlStats?.lastTrainedAt ?? null)
                const menuOpen = crawlMenuId === crawl.id

                return (
                  <div
                    key={crawl.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Header: globe, URL, New, "Last crawled • Links: N", menu, expand */}
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">
                            {baseUrlDisplay(crawl.url)}
                          </span>
                          {showNew && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              New
                            </span>
                          )}
                          {!showNew && crawlStats?.lastTrainedAt && (
                            <span className="shrink-0 flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <Check className="h-3 w-3" />
                              Fed
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Last crawled {formatCrawlDate(crawl.createdAt)} • Links: {linkCount}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCrawlMenuId(menuOpen ? null : crawl.id)}
                            className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                aria-hidden
                                onClick={() => setCrawlMenuId(null)}
                              />
                              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCrawlMenuId(null)
                                    handleRecrawl(crawl)
                                  }}
                                  disabled={isRecrawling || isCrawling}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {isRecrawling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                  Re-crawl
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCrawlMenuId(null)
                                    handleRemove(crawl.id)
                                  }}
                                  disabled={isDeleting}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCrawlId(isExpanded ? null : crawl.id)
                          }
                          className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible: N LINKS INCLUDED + scrollable list */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {linkCount} links included
                        </p>
                        <div className="max-h-64 overflow-y-auto p-2">
                          <ul className="space-y-0.5">
                            {links.map((page, idx) => (
                              <li
                                key={page.url + String(idx)}
                                className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-100/80"
                              >
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                  {page.url}
                                </span>
                                {showNew && (
                                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    New
                                  </span>
                                )}
                                <a
                                  href={page.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                  aria-label="Open link"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
