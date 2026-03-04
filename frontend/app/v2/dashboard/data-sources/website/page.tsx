'use client'

import { useState, useCallback, useEffect } from 'react'
import { Globe, Trash2, RefreshCw, Loader2, Check } from 'lucide-react'
import { DataSourcesTrainingCard, type TrainingStatus } from '../DataSourcesTrainingCard'

type SiteStatus = 'Indexed' | 'Pending'

type Site = {
  id: string
  url: string
  status: SiteStatus
  lastCrawled: string
  pages: number
}

const MOCK_WEBSITES: Site[] = [
  { id: '1', url: 'https://example.com/docs', status: 'Indexed', lastCrawled: 'Mar 4', pages: 24 },
  { id: '2', url: 'https://example.com/faq', status: 'Indexed', lastCrawled: 'Mar 3', pages: 8 },
]

const CRAWL_DURATION_MS = 5000
const CRAWL_STEP_INTERVAL_MS = 550

// Steps shown during crawl – "this is being crawled now"
const CRAWL_STEPS = [
  'Connecting…',
  'Fetching main page…',
  'Crawling /',
  'Crawling /docs',
  'Crawling /about',
  'Crawling /faq',
  'Crawling /contact',
  'Found links, indexing…',
  'Indexing content…',
  'Almost done…',
]

export default function DataSourcesWebsitePage() {
  const [sites, setSites] = useState<Site[]>(MOCK_WEBSITES)
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('trained')
  const [lastTrainedAt, setLastTrainedAt] = useState<string | null>('10 min ago')
  const [newUrl, setNewUrl] = useState('')
  const [crawlStep, setCrawlStep] = useState<Record<string, number>>({})

  const addSite = useCallback((url: string) => {
    const id = String(Date.now())
    setSites((p) => [
      { id, url, status: 'Pending', lastCrawled: '—', pages: 0 },
      ...p,
    ])
    setCrawlStep((prev) => ({ ...prev, [id]: 0 }))
    setNewUrl('')
    setTimeout(() => {
      setSites((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'Indexed' as const,
                lastCrawled: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pages: Math.floor(Math.random() * 26) + 5,
              }
            : s
        )
      )
      setCrawlStep((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, CRAWL_DURATION_MS)
  }, [])

  // Advance crawl step for all Pending sites so user sees "crawling this… now this…"
  const pendingIds = sites.filter((s) => s.status === 'Pending').map((s) => s.id)
  useEffect(() => {
    if (pendingIds.length === 0) return
    const tick = () => {
      setCrawlStep((prev) => {
        const next = { ...prev }
        pendingIds.forEach((id) => {
          const current = prev[id] ?? 0
          next[id] = Math.min(current + 1, CRAWL_STEPS.length - 1)
        })
        return next
      })
    }
    const interval = setInterval(tick, CRAWL_STEP_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pendingIds.length, pendingIds.join(',')])

  const handleTrain = () => {
    setTrainingStatus('training')
    setLastTrainedAt(null)
    setTimeout(() => {
      setTrainingStatus('trained')
      setLastTrainedAt('Just now')
    }, 2000)
  }

  const handleRemove = (id: string) => setSites((p) => p.filter((s) => s.id !== id))
  const hasData = sites.length > 0
  const allIndexed = hasData && sites.every((s) => s.status === 'Indexed')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Website</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add URLs to crawl. The agent uses the indexed content to answer questions.
          </p>
        </div>
        <div className="mt-4">
          <DataSourcesTrainingCard
            status={trainingStatus}
            lastTrainedAt={lastTrainedAt}
            onTrain={handleTrain}
            disabled={!hasData || !allIndexed}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
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
                    if (newUrl.trim()) addSite(newUrl.trim())
                  }
                }}
                placeholder="https://example.com or https://example.com/docs"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              />
              <button
                type="button"
                onClick={() => newUrl.trim() && addSite(newUrl.trim())}
                disabled={!newUrl.trim()}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--v2-primary)] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
              >
                Crawl
              </button>
            </div>
          </div>

          {/* Website list */}
          {!hasData ? (
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
                  {sites.map((site) => {
                    const isCrawling = site.status === 'Pending'
                    const stepIndex = crawlStep[site.id] ?? 0
                    const currentStep = CRAWL_STEPS[stepIndex]
                    return (
                    <div
                      key={site.id}
                      className={`flex items-center gap-4 px-4 py-3 first:rounded-t-lg last:rounded-b-lg transition-colors duration-300 ${
                        isCrawling ? 'crawl-row-active bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 ${isCrawling ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {isCrawling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{site.url}</p>
                        {site.status === 'Indexed' ? (
                          <p className="text-xs text-slate-500">{site.pages} pages · {site.lastCrawled}</p>
                        ) : (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                            <span className="text-amber-700 font-medium">{currentStep}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {CRAWL_STEPS.slice(0, stepIndex).map((step, i) => (
                                <span key={i} className="inline-flex items-center gap-0.5 rounded bg-amber-100/80 px-1.5 py-0.5 text-amber-800">
                                  <Check className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[120px]">{step.replace('…', '')}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span
                        className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          site.status === 'Indexed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isCrawling && <Loader2 className="h-3 w-3 animate-spin" />}
                        {site.status === 'Indexed' ? 'Indexed' : 'Crawling'}
                      </span>
                      {site.status === 'Indexed' && (
                        <button
                          type="button"
                          className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Re-crawl"
                          title="Re-crawl"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(site.id)}
                        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
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
