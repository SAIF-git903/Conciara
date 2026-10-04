'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'

/* ─── Animated number hook (unchanged) ────────────────────── */
const DURATION_MS = 380
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

function useAnimatedNumber(target: number | null, options: { decimals?: number; duration?: number } = {}): number | null {
  const { decimals = 0, duration = DURATION_MS } = options
  const [display, setDisplay] = useState<number | null>(target)
  const rafRef = useRef<number | null>(null)
  const currentRef = useRef<number | null>(target)

  useEffect(() => {
    if (target === null) { currentRef.current = null; setDisplay(null); if (rafRef.current != null) cancelAnimationFrame(rafRef.current); return }
    const startValue = currentRef.current ?? target
    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const next = startValue + (target - startValue) * easeOutCubic(t)
      currentRef.current = next; setDisplay(next)
      if (t < 1) { rafRef.current = requestAnimationFrame(tick) } else { currentRef.current = target; setDisplay(target) }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  if (target === null) return null
  if (display === null) return target
  return decimals === 0 ? Math.round(display) : Number(display.toFixed(decimals))
}

/* ─── Types ────────────────────────────────────────────────── */
type CrawlPage = { url: string; title?: string }
type Crawl = {
  id: number; url: string; title: string | null; description: string | null
  logoUrl: string | null; useCase: string | null; trainingContent: string
  metadata: Record<string, unknown>; createdAt: string
  pagesCrawled?: number; crawledPages?: CrawlPage[]
}
type CrawlStats = {
  linkCount: number; crawlSizeBytes: number; totalLimitBytes: number | null
  trainedSizeBytes: number | null; lastTrainedAt: string | null
  trainedLinkCount: number | null; hasUnappliedChanges: boolean
  linksNotFedCount?: number; trainingInProgress: boolean
  trainedSizeBytesSoFar: number | null; trainedLinksSoFar: number | null
  totalLinksProgress: number | null
}

function formatCrawlDate(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 3600 * 2) return '1h ago'
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isLinkNew(crawlCreatedAt: string, lastTrainedAt: string | null): boolean {
  if (!lastTrainedAt) return true
  return new Date(crawlCreatedAt) > new Date(lastTrainedAt)
}

function baseUrlDisplay(url: string): string {
  try { const u = new URL(url); return u.origin + (u.pathname === '/' ? '/' : u.pathname) }
  catch { return url }
}

/* ─── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, sub }: { label: string; value: string | number | null; sub: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 14 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
        {value === null ? '—' : value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{sub}</div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function DataSourcesWebsitePage() {
  const { currentWorkspace, currentAgent, socket } = useDashboard()
  const workspaceId = currentWorkspace?.id
  const agentId     = currentAgent?.id

  const [crawls, setCrawls]               = useState<Crawl[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [newUrl, setNewUrl]               = useState('')
  const [crawlingUrl, setCrawlingUrl]     = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<number | null>(null)
  const [recrawlingId, setRecrawlingId]   = useState<number | null>(null)
  const [expandedCrawlId, setExpandedCrawlId] = useState<number | null>(null)
  const [crawlMenuId, setCrawlMenuId]     = useState<number | null>(null)
  const [menuPos, setMenuPos]             = useState<{ top: number; right: number } | null>(null)
  const [crawlStats, setCrawlStats]       = useState<CrawlStats | null>(null)
  const [statsLoading, setStatsLoading]   = useState(false)
  const [isTraining, setIsTraining]       = useState(false)
  const [trainError, setTrainError]       = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCrawlStats = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setStatsLoading(true)
    try {
      const { data } = await api.get<CrawlStats>(`/workspaces/${workspaceId}/agents/${agentId}/crawl-stats`)
      setCrawlStats(data); return data
    } catch { setCrawlStats(null); return null }
    finally { setStatsLoading(false) }
  }, [workspaceId, agentId])

  const fetchCrawls = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<{ crawls: Crawl[] }>(`/workspaces/${workspaceId}/agents/${agentId}/crawls`)
      setCrawls(data.crawls ?? []); await fetchCrawlStats()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setError(msg || (e instanceof Error ? e.message : 'Failed to load crawls'))
      setCrawls([])
    } finally { setLoading(false) }
  }, [workspaceId, agentId, fetchCrawlStats])

  useEffect(() => {
    if (!workspaceId || !agentId) { setCrawls([]); setCrawlStats(null); setLoading(false); return }
    fetchCrawls()
  }, [workspaceId, agentId, fetchCrawls])

  useEffect(() => { if (workspaceId && agentId) fetchCrawlStats() }, [workspaceId, agentId, fetchCrawlStats])

  useEffect(() => {
    if (!socket || !agentId || typeof agentId !== 'string') return
    let cancelled = false
    const onProgress = (payload: { agentId: number; trainedLinksSoFar: number; totalLinks: number; trainedSizeBytesSoFar?: number }) => {
      if (cancelled || String(payload.agentId) !== agentId) return
      setCrawlStats((prev) => prev ? { ...prev, trainingInProgress: true, trainedLinksSoFar: payload.trainedLinksSoFar, totalLinksProgress: payload.totalLinks, trainedSizeBytesSoFar: payload.trainedSizeBytesSoFar ?? prev.trainedSizeBytesSoFar ?? null } : null)
    }
    const onComplete = (payload: { agentId: number }) => { if (cancelled || String(payload.agentId) !== agentId) return; setIsTraining(false); fetchCrawlStats() }
    const onError    = (payload: { agentId: number }) => { if (cancelled || String(payload.agentId) !== agentId) return; setIsTraining(false); fetchCrawlStats() }
    socket.emit('subscribe-agent', agentId)
    socket.on('crawl-training-progress', onProgress)
    socket.on('crawl-training-complete', onComplete)
    socket.on('crawl-training-error', onError)
    return () => { cancelled = true; socket.emit('unsubscribe-agent', agentId); socket.off('crawl-training-progress', onProgress); socket.off('crawl-training-complete', onComplete); socket.off('crawl-training-error', onError) }
  }, [socket, agentId, fetchCrawlStats])

  useEffect(() => () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }, [])

  const handleRetrain = useCallback(async () => {
    if (!workspaceId || !agentId) return
    setIsTraining(true); setTrainError(null)
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    try {
      await api.post(`/workspaces/${workspaceId}/agents/${agentId}/train-from-crawls`)
      await fetchCrawlStats()
      if (!socket) {
        pollIntervalRef.current = setInterval(async () => {
          const next = await fetchCrawlStats()
          if (next && !next.trainingInProgress) { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }; setIsTraining(false) }
        }, 1500)
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string; details?: string } } }).response?.data?.details || (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setTrainError(msg || (e instanceof Error ? e.message : 'Training failed')); setIsTraining(false)
    }
  }, [workspaceId, agentId, fetchCrawlStats, socket])

  const addSite = useCallback(async (url: string) => {
    if (!workspaceId || !agentId) return
    setCrawlingUrl(url); setError(null)
    try {
      await api.post(`/workspaces/${workspaceId}/crawl`, { url: url.trim(), agentId })
      setNewUrl(''); await fetchCrawls()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setError(msg || (e instanceof Error ? e.message : 'Crawl failed'))
    } finally { setCrawlingUrl(null) }
  }, [workspaceId, agentId, fetchCrawls])

  const handleRemove = useCallback(async (crawlId: number) => {
    if (!workspaceId) return
    setDeletingId(crawlId); setCrawlMenuId(null); setError(null)
    try {
      await api.delete(`/workspaces/${workspaceId}/crawls/${crawlId}`)
      setCrawls((prev) => prev.filter((c) => c.id !== crawlId))
      if (expandedCrawlId === crawlId) setExpandedCrawlId(null)
    } catch { setError('Failed to delete website') }
    finally { setDeletingId(null) }
  }, [workspaceId, expandedCrawlId])

  const handleRecrawl = useCallback(async (crawl: Crawl) => {
    if (!workspaceId || !agentId) return
    setRecrawlingId(crawl.id); setCrawlMenuId(null); setError(null)
    try {
      await api.post(`/workspaces/${workspaceId}/crawl`, { url: crawl.url, agentId })
      await fetchCrawls()
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : null
      setError(msg || (e instanceof Error ? e.message : 'Re-crawl failed'))
    } finally { setRecrawlingId(null) }
  }, [workspaceId, agentId, fetchCrawls])

  /* ─── Derived stats ─────────────────────────────────────── */
  const linkCount         = crawlStats?.linkCount ?? 0
  const trainedLinkCount  = crawlStats?.trainedLinkCount ?? null
  const linksFed          = trainedLinkCount ?? 0
  const linksNotFed       = crawlStats?.linksNotFedCount ?? (trainedLinkCount == null ? linkCount : Math.max(0, linkCount - trainedLinkCount))
  const totalSizeFedBytes = linksFed > 0 ? (crawlStats?.trainedSizeBytes ?? 0) : 0
  const crawlSizeBytes    = crawlStats?.crawlSizeBytes ?? 0
  const showProgress      = crawlStats?.trainingInProgress && crawlStats?.trainedLinksSoFar != null && crawlStats?.totalLinksProgress != null
  const remainingSizeBytes = linkCount === 0 ? 0
    : crawlStats?.trainingInProgress && crawlStats?.trainedSizeBytesSoFar != null ? Math.max(0, crawlSizeBytes - crawlStats.trainedSizeBytesSoFar)
    : !crawlStats?.hasUnappliedChanges ? 0
    : linksFed === 0 ? crawlSizeBytes
    : Math.max(0, crawlSizeBytes - totalSizeFedBytes)

  const lastKnownRef = useRef({ linksFed: 0, linksNotFed: 0, totalSizeKB: 0, remainingKB: 0 })
  const linksFedTarget           = statsLoading ? null : showProgress ? (crawlStats?.trainedLinksSoFar ?? null) : linksFed
  const linksNotFedTarget        = statsLoading ? null : showProgress ? Math.max(0, (crawlStats?.totalLinksProgress ?? 0) - (crawlStats?.trainedLinksSoFar ?? 0)) : linksNotFed
  const totalSizeFedKBTarget     = statsLoading || linkCount === 0 ? null : crawlStats?.trainingInProgress ? (crawlStats.trainedSizeBytesSoFar ?? 0) / 1024 : linksFed > 0 ? totalSizeFedBytes / 1024 : null
  const remainingSizeKBTarget    = statsLoading || linkCount === 0 ? null : remainingSizeBytes / 1024
  if (linksFedTarget !== null)        lastKnownRef.current.linksFed     = linksFedTarget
  if (linksNotFedTarget !== null)     lastKnownRef.current.linksNotFed  = linksNotFedTarget
  if (totalSizeFedKBTarget !== null)  lastKnownRef.current.totalSizeKB  = totalSizeFedKBTarget
  if (remainingSizeKBTarget !== null) lastKnownRef.current.remainingKB  = remainingSizeKBTarget
  const noData = linkCount === 0 && !crawlStats?.trainingInProgress
  const animLinksFed     = useAnimatedNumber(noData ? null : (linksFedTarget     ?? lastKnownRef.current.linksFed))
  const animLinksNotFed  = useAnimatedNumber(noData ? null : (linksNotFedTarget  ?? lastKnownRef.current.linksNotFed))
  const animTotalSizeKB  = useAnimatedNumber(noData ? null : (totalSizeFedKBTarget ?? lastKnownRef.current.totalSizeKB), { decimals: 1 })
  const animRemainingKB  = useAnimatedNumber(noData ? null : (remainingSizeKBTarget ?? lastKnownRef.current.remainingKB), { decimals: 1 })

  const hasData    = crawls.length > 0
  const isCrawling = crawlingUrl !== null
  const lastTrained = crawlStats?.lastTrainedAt
    ? new Date(crawlStats.lastTrainedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  if (!currentWorkspace || !currentAgent) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 }}>
        <Globe style={{ width: 28, height: 28, color: 'var(--ink-5)' }} />
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>Select an agent to manage website sources.</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 28px 48px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px', letterSpacing: '-0.015em' }}>Website</h1>
          <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5, maxWidth: '60ch' }}>
            Crawl URLs, follow same-domain links, and extract text. Press &ldquo;Retrain&rdquo; to feed content to the agent.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--danger-soft)', border: '1px solid rgba(195,54,101,0.15)', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
          <StatCard
            label="Links fed"
            value={animLinksFed === null ? '—' : animLinksFed}
            sub="Used in chat"
          />
          <StatCard
            label="Not fed yet"
            value={animLinksNotFed === null ? '—' : animLinksNotFed}
            sub="Press retrain"
          />
          <StatCard
            label="Total size"
            value={animTotalSizeKB === null ? '—' : `${Number(animTotalSizeKB).toFixed(0)} KB${crawlStats?.trainingInProgress ? '+' : ''}`}
            sub="In knowledge"
          />
          <StatCard
            label="Pending size"
            value={animRemainingKB === null ? '—' : `${Number(animRemainingKB).toFixed(0)} KB`}
            sub="Will be added"
          />
        </div>

        {/* Retrain row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={handleRetrain}
              disabled={isTraining ? false : !hasData || !crawlStats?.hasUnappliedChanges}
              className="btn btn--primary btn--sm"
            >
              {isTraining
                ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Training…</>
                : <><Sparkles style={{ width: 12, height: 12 }} /> Retrain agent</>}
            </button>
            {crawlStats?.hasUnappliedChanges && !isTraining && (
              <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 500 }}>
                Retraining required for changes to apply.
              </span>
            )}
          </div>
          {lastTrained && (
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
              Last trained <span style={{ fontFamily: 'var(--font-mono)' }}>{lastTrained}</span>
            </span>
          )}
        </div>

        {trainError && (
          <div style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--danger-soft)', border: '1px solid rgba(195,54,101,0.15)', fontSize: 12.5, color: 'var(--danger)', marginBottom: 16 }}>
            {trainError}
          </div>
        )}

        {/* Add URL card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <ExternalLink style={{ width: 14, height: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Add website URL</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 1 }}>We'll crawl and index the page for your agent.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newUrl.trim() && !isCrawling) addSite(newUrl.trim()) } }}
              placeholder="https://example.com or https://example.com/docs"
              style={{
                flex: 1, height: 36, padding: '0 11px',
                border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)',
                background: 'var(--bg)', fontSize: 13, color: 'var(--ink)',
                outline: 'none', transition: 'border-color .12s, box-shadow .12s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <button
              type="button"
              onClick={() => newUrl.trim() && !isCrawling && addSite(newUrl.trim())}
              disabled={!newUrl.trim() || isCrawling}
              className="btn btn--primary btn--sm"
              style={{ flexShrink: 0 }}
            >
              {isCrawling && crawlingUrl === newUrl.trim()
                ? <><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Crawling…</>
                : 'Crawl'}
            </button>
          </div>
        </div>

        {/* Crawl list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 style={{ width: 20, height: 20, color: 'var(--ink-4)' }} className="animate-spin" />
          </div>
        ) : !hasData && !isCrawling ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center', background: 'var(--surface)', border: '1.5px dashed var(--line-strong)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--line)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: 'var(--ink-4)' }}>
              <Globe style={{ width: 18, height: 18 }} />
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-2)', margin: '0 0 4px' }}>No websites yet</p>
            <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>Add a URL above to crawl and index its content.</p>
          </div>
        ) : (
          <>
            {hasData && crawlStats && (
              <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                {crawlStats.linkCount} link{crawlStats.linkCount !== 1 ? 's' : ''} · {(crawlStats.crawlSizeBytes / 1024).toFixed(0)} KB
              </div>
            )}

            {/* In-progress crawl row */}
            {isCrawling && !crawls.some((c) => c.url === crawlingUrl) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', marginBottom: 6, background: 'var(--warn-soft)', border: '1px solid rgba(184,106,23,0.2)', borderRadius: 'var(--r-lg)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'rgba(184,106,23,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)', flexShrink: 0 }}>
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crawlingUrl}</div>
                  <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 1 }}>Crawling…</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crawls.map((crawl) => {
                const isRecrawling = recrawlingId === crawl.id
                const isDeleting   = deletingId === crawl.id
                const linkCount    = crawl.pagesCrawled ?? (crawl.crawledPages?.length ?? 1)
                const links        = crawl.crawledPages?.length ? crawl.crawledPages : [{ url: crawl.url, title: crawl.title ?? undefined }]
                const isExpanded   = expandedCrawlId === crawl.id
                const showNew      = isLinkNew(crawl.createdAt, crawlStats?.lastTrainedAt ?? null)
                const menuOpen     = crawlMenuId === crawl.id

                return (
                  <div key={crawl.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                    {/* Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }} className="hover:bg-[var(--bg-2)]">
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExternalLink style={{ width: 13, height: 13 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                            {baseUrlDisplay(crawl.url)}
                          </span>
                          {showNew ? (
                            <span style={{ fontSize: 10.5, fontWeight: 500, background: 'var(--warn-soft)', color: 'var(--warn)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>New</span>
                          ) : crawlStats?.lastTrainedAt ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 500, background: 'var(--success-soft)', color: 'var(--success)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                              <Check style={{ width: 9, height: 9 }} /> Fed
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
                          Last crawled {formatCrawlDate(crawl.createdAt)} · {linkCount} link{linkCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                        {/* Menu */}
                        <button
                          type="button"
                          onClick={(e) => {
                            if (menuOpen) { setCrawlMenuId(null); setMenuPos(null) }
                            else {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                              setCrawlMenuId(crawl.id)
                            }
                          }}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer' }}
                          className="hover:bg-[var(--bg-2)]"
                          aria-label="Options"
                        >
                          <MoreHorizontal style={{ width: 14, height: 14 }} />
                        </button>
                        {/* Expand */}
                        <button
                          type="button"
                          onClick={() => setExpandedCrawlId(isExpanded ? null : crawl.id)}
                          style={{ width: 28, height: 28, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink-4)', cursor: 'pointer' }}
                          className="hover:bg-[var(--bg-2)]"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronDown style={{ width: 14, height: 14 }} /> : <ChevronRight style={{ width: 14, height: 14 }} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded links */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
                        <div style={{ padding: '8px 18px 4px', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {linkCount} links included
                        </div>
                        <div style={{ maxHeight: 240, overflowY: 'auto', padding: '0 10px 8px' }}>
                          {links.map((page, i) => (
                            <div
                              key={page.url + i}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12.5 }}
                              className="hover:bg-[var(--line)]"
                            >
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {page.url}
                              </span>
                              {showNew && (
                                <span style={{ fontSize: 10, fontWeight: 500, background: 'var(--warn-soft)', color: 'var(--warn)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>New</span>
                              )}
                              <a
                                href={page.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--ink-4)', display: 'inline-flex', padding: 4, borderRadius: 4, flexShrink: 0 }}
                                className="hover:bg-[var(--bg-2)] hover:!text-[var(--ink)]"
                                aria-label="Open"
                              >
                                <ExternalLink style={{ width: 12, height: 12 }} />
                              </a>
                              <ChevronRight style={{ width: 12, height: 12, color: 'var(--ink-5)', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Fixed dropdown — rendered outside overflow:hidden cards */}
      {crawlMenuId !== null && menuPos && (() => {
        const crawl = crawls.find((c) => c.id === crawlMenuId)
        if (!crawl) return null
        const isRecrawling = recrawlingId === crawl.id
        const isDeleting   = deletingId === crawl.id
        return (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={() => { setCrawlMenuId(null); setMenuPos(null) }} />
            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 20, width: 160, background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden', padding: '3px 0' }}>
              <button
                type="button"
                onClick={() => handleRecrawl(crawl)}
                disabled={isRecrawling || isCrawling}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 13, color: 'var(--ink-2)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                className="hover:bg-[var(--bg-2)]"
              >
                {isRecrawling ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RefreshCw style={{ width: 13, height: 13 }} />}
                Re-crawl
              </button>
              <button
                type="button"
                onClick={() => handleRemove(crawl.id)}
                disabled={isDeleting}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 13, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                className="hover:bg-[var(--danger-soft)]"
              >
                {isDeleting ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Trash2 style={{ width: 13, height: 13 }} />}
                Remove
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}
