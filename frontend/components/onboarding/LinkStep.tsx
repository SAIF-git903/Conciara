'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { Loader2 } from 'lucide-react'
import Select from '@/components/Select'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { getOnboardingWorkspaceId, setOnboardingLinkDone, setOnboardingCrawlId, setOnboardingAgentName, setOnboardingAgentLogoUrl, setOnboardingTrainOnCrawl } from '@/lib/onboarding'

export interface LinkStepProps {
  nextPath: string
  router: { push: (url: string) => void }
  onForbidden: () => void
}

interface CrawlData {
  id: number
  workspaceId: number
  url: string
  title: string | null
  description: string | null
  logoUrl: string | null
  useCase: string
  trainingContent: string
  metadata: Record<string, unknown>
  createdAt: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
}

const item = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
}

function isValidUrl(protocol: string, url: string): boolean {
  const raw = (protocol + url).trim()
  if (!raw) return false
  const withoutProtocol = url.trim().toLowerCase()
  if (!withoutProtocol) return false
  return withoutProtocol.length >= 2
}

/** Strip http:// or https:// from the start of the input; return { cleaned, detectedProtocol }. */
function stripProtocol(input: string): { cleaned: string; detectedProtocol: 'https://' | 'http://' | null } {
  const raw = input.trim()
  const lower = raw.toLowerCase()
  if (lower.startsWith('https://')) return { cleaned: raw.slice(8).trim(), detectedProtocol: 'https://' }
  if (lower.startsWith('http://')) return { cleaned: raw.slice(7).trim(), detectedProtocol: 'http://' }
  return { cleaned: raw, detectedProtocol: null }
}

const CRAWL_STEPS = [
  'Fetching title',
  'Fetching description',
  'Fetching logo',
  'Fetching content for training',
]
const CRAWL_STEP_INTERVAL_MS = 550
/** Stop timer one step before last so the final step keeps spinning until API returns */
const CRAWL_STEP_TIMER_MAX = CRAWL_STEPS.length - 2
const CRAWL_COMPLETE_DELAY_MS = 600

const easeSmooth = [0.22, 0.61, 0.36, 1]

function SuccessCheckLottie() {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: easeSmooth }}
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30"
    >
      <DotLottieReact
        src="/success_check.lottie"
        autoplay
        loop={false}
        className="h-full w-full"
        style={{ width: 28, height: 28 }}
      />
    </motion.span>
  )
}

export default function LinkStep({ nextPath, router, onForbidden }: LinkStepProps) {
  const { user } = useAuth()
  const workspaceId = getOnboardingWorkspaceId()
  const [protocol, setProtocol] = useState('https://')
  const [url, setUrl] = useState('')
  const [useCase, setUseCase] = useState('general')
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlStepIndex, setCrawlStepIndex] = useState(0)
  const [crawlError, setCrawlError] = useState('')
  const [crawlData, setCrawlData] = useState<CrawlData | null>(null)
  const crawlStepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Progressive step animation while crawling (purely UI; API is single call)
  useEffect(() => {
    if (!isCrawling) {
      setCrawlStepIndex(0)
      if (crawlStepTimerRef.current) {
        clearInterval(crawlStepTimerRef.current)
        crawlStepTimerRef.current = null
      }
      return
    }
    crawlStepTimerRef.current = setInterval(() => {
      setCrawlStepIndex((prev) => {
        if (prev >= CRAWL_STEP_TIMER_MAX) {
          if (crawlStepTimerRef.current) {
            clearInterval(crawlStepTimerRef.current)
            crawlStepTimerRef.current = null
          }
          return prev
        }
        return prev + 1
      })
    }, CRAWL_STEP_INTERVAL_MS)
    return () => {
      if (crawlStepTimerRef.current) {
        clearInterval(crawlStepTimerRef.current)
        crawlStepTimerRef.current = null
      }
    }
  }, [isCrawling])

  useEffect(() => {
    if (workspaceId == null || !user?.workspaces) return
    const hasAccess = user.workspaces.some((w) => w.id === workspaceId)
    if (!hasAccess) onForbidden()
  }, [user?.workspaces, workspaceId, onForbidden])

  const canContinue = isValidUrl(protocol, url)

  const handleUrlChange = (raw: string) => {
    const { cleaned, detectedProtocol } = stripProtocol(raw)
    setUrl(cleaned)
    if (detectedProtocol) setProtocol(detectedProtocol)
  }

  const handleTrainOrSkip = (train: boolean) => {
    setOnboardingTrainOnCrawl(train)
    setOnboardingLinkDone()
    router.push(nextPath)
  }

  const handleContinue = async () => {
    if (!canContinue || workspaceId == null) return
    setCrawlError('')
    setCrawlData(null)
    setIsCrawling(true)
    try {
      const pathPart = url.trim().replace(/\/+$/, '')
      const fullUrl = (protocol + pathPart).trim()
      const { data } = await api.post<{ crawl: CrawlData }>(
        `/workspaces/${workspaceId}/crawl`,
        { url: fullUrl, useCase }
      )
      setCrawlStepIndex(CRAWL_STEPS.length - 1)
      await new Promise((r) => setTimeout(r, CRAWL_COMPLETE_DELAY_MS))
      setCrawlData(data.crawl)
      setOnboardingCrawlId(data.crawl.id)
      setOnboardingAgentName(data.crawl.title?.trim() || 'ConversaTree')
      setOnboardingAgentLogoUrl(data.crawl.logoUrl?.trim() || '')
      // Don't redirect: show "Train Agent" or "Skip it" so user can choose
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : 0
      if (status === 403) {
        onForbidden()
        return
      }
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Failed to crawl website'
      setCrawlError(message || 'Failed to crawl website')
    } finally {
      setIsCrawling(false)
    }
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--v2-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--v2-primary)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--v2-primary)]" />
          Data source
        </motion.div>
        <motion.h1
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          Let&apos;s start with a link
        </motion.h1>
        <motion.p
          className="mt-3 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          Share your website link, and we&apos;ll automatically build an AI agent trained on your content.
        </motion.p>

        <motion.div
          className="mt-10 space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {!crawlData ? (
            <>
              <motion.div variants={item}>
                <label htmlFor="url" className="mb-2 block text-sm font-medium text-slate-700">
                  Your website URL
                </label>
                <div className="flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/50 transition focus-within:border-[var(--v2-primary)] focus-within:ring-2 focus-within:ring-[var(--v2-primary)]/20">
                  <div className="flex h-full w-[7.5rem] shrink-0 flex-col">
                    <Select
                      value={protocol}
                      onChange={setProtocol}
                      options={[
                        { value: 'https://', label: 'https://' },
                        { value: 'http://', label: 'http://' },
                      ]}
                      compact
                      segment
                    />
                  </div>
                  <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="yoursite.com"
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-slate-900 placeholder:text-slate-400 focus:ring-0"
                  />
                </div>
              </motion.div>

              <motion.div variants={item}>
                <Select
                  id="useCase"
                  label="Use-case"
                  value={useCase}
                  onChange={setUseCase}
                  options={[
                    { value: 'general', label: 'General AI agent' },
                    { value: 'support', label: 'Customer support' },
                    { value: 'sales', label: 'Sales assistant' },
                    { value: 'docs', label: 'Documentation' },
                  ]}
                  compact
                />
              </motion.div>

              {crawlError && (
                <motion.p variants={item} className="text-sm text-red-600">
                  {crawlError}
                </motion.p>
              )}
              <motion.div variants={item} className="pt-2">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue || isCrawling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {isCrawling ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Crawling website…
                    </>
                  ) : (
                    <>
                      Continue
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </>
                  )}
                </button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div variants={item}>
                <p className="text-sm font-medium text-slate-800">Crawl successful</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Your website content is ready. Train the agent on it now, or skip and you can retrain later from Data sources.
                </p>
              </motion.div>
              <motion.div variants={item} className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleTrainOrSkip(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl"
                >
                  Train agent
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleTrainOrSkip(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Skip for now
                </button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <motion.div
        className="flex min-h-[340px] items-center justify-center rounded-2xl border p-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {isCrawling ? (
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: easeSmooth }}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.9)] ring-1 ring-slate-900/70">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/95 px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="relative ml-3 flex min-w-0 flex-1 items-center rounded-full bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-100/90">
                  <span className="mr-2 flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400">
                    <span className="m-auto h-1 w-1 rounded-full bg-emerald-200 animate-pulse" />
                  </span>
                  <span className="truncate">
                    {(protocol + (url || 'your-site.com')).replace(/\/+$/, '')}
                  </span>
                  <motion.div className="pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-slate-900/70">
                    <motion.div
                      className="h-full rounded-full bg-emerald-400"
                      initial={false}
                      animate={{
                        width: `${Math.max(
                          8,
                          Math.min(100, ((crawlStepIndex + 1) / CRAWL_STEPS.length) * 100)
                        ).toFixed(0)}%`,
                      }}
                      transition={{ duration: 0.45, ease: easeSmooth }}
                    />
                  </motion.div>
                </div>
              </div>
              {/* Page preview */}
              <div className="relative flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-8 text-center">
                <div className="pointer-events-none absolute inset-x-4 top-4 h-24 rounded-full bg-slate-400/5 blur-2xl" />
                <motion.div
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100/5 via-slate-100/10 to-slate-50/10 shadow-[0_12px_30px_-10px_rgba(15,23,42,1)] ring-1 ring-white/10"
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.05, 1],
                    y: [0, -2, 0],
                    rotate: 0,
                  }}
                  transition={{
                    duration: 2.4,
                    ease: easeSmooth,
                    repeat: Infinity,
                    repeatType: 'loop',
                  }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-slate-100/5"
                    style={{ mixBlendMode: 'screen' }}
                    initial={{ opacity: 0.2, scale: 0.9 }}
                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.08, 0.9] }}
                    transition={{
                      duration: 2.4,
                      ease: easeSmooth,
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
                  />
                  <motion.svg
                    className="relative h-7 w-7 text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: easeSmooth }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.4}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </motion.svg>
                </motion.div>
                <motion.div
                  className="relative space-y-3"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12, ease: easeSmooth }}
                >
                  <p className="mb-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                        <span className="relative m-auto h-1 w-1 rounded-full bg-emerald-400" />
                      </span>
                      Crawling your website
                    </span>
                  </p>
                  <ul className="relative">
                    {CRAWL_STEPS.map((label, i) => {
                      const done = i <= crawlStepIndex
                      const isLast = i === CRAWL_STEPS.length - 1
                      const segmentDone = i < crawlStepIndex
                      return (
                        <motion.li
                          key={label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.06, ease: easeSmooth }}
                          className="relative flex items-start gap-3 pb-3 last:pb-0"
                        >
                          {!isLast && (
                            <span
                              className="absolute left-3.5 top-7 h-[calc(100%-4px)] w-px transition-colors duration-300 ease-out"
                              style={{ backgroundColor: segmentDone ? 'rgb(16 185 129)' : 'rgb(226 232 240)' }}
                              aria-hidden
                            />
                          )}
                          <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200/50">
                            <AnimatePresence mode="wait">
                              {done ? (
                                <motion.span
                                  key="check"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2, ease: easeSmooth }}
                                  className="flex items-center justify-center"
                                >
                                  <SuccessCheckLottie />
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="spinner"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2, ease: easeSmooth }}
                                  className="text-[var(--v2-primary)]"
                                >
                                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <motion.span
                            className={`pt-0.5 text-sm transition-colors duration-200 ease-out ${done ? 'font-medium text-slate-800' : 'text-slate-500'
                              }`}
                          >
                            {label}
                            {done ? '' : '…'}
                          </motion.span>
                        </motion.li>
                      )
                    })}
                  </ul>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : crawlData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: easeSmooth }}
            className="w-full max-w-sm space-y-4 text-left"
          >
            <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
              {crawlData.logoUrl ? (
                <img
                  src={crawlData.logoUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-contain bg-slate-50"
                />
              ) : (
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-semibold"
                  style={{
                    background: `linear-gradient(135deg, hsl(${(crawlData.title || '?').charCodeAt(0) % 360}, 55%, 92%), hsl(${(crawlData.title || '?').charCodeAt(0) % 360}, 35%, 82%))`,
                    color: `hsl(${(crawlData.title || '?').charCodeAt(0) % 360}, 45%, 30%)`,
                  }}
                >
                  {(crawlData.title || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-slate-900">
                  {crawlData.title || 'No title'}
                </p>
                <p className="truncate text-xs text-slate-500">{crawlData.url}</p>
              </div>
            </div>
            {crawlData.description && (
              <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                {crawlData.description}
              </p>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-xs font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              Saved for agent training
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: easeSmooth }}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-950 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.9)] ring-1 ring-slate-900/70">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-900/95 px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="ml-3 flex min-w-0 flex-1 items-center rounded-full bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-100/90">
                  <span className="truncate">
                    {(protocol + (url || 'your-site.com')).replace(/\/+$/, '')}
                  </span>
                </div>
              </div>
              {/* Page preview */}
              <div className="relative flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-8 text-center">
                <div className="pointer-events-none absolute inset-x-4 top-4 h-24 rounded-full bg-slate-400/5 blur-2xl" />
                <motion.div
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100/5 via-slate-100/10 to-slate-50/10 shadow-[0_12px_30px_-10px_rgba(15,23,42,1)] ring-1 ring-white/10"
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.05, 1],
                    y: [0, -2, 0],
                    rotate: 0,
                  }}
                  transition={{
                    duration: 2.4,
                    ease: easeSmooth,
                    repeat: Infinity,
                    repeatType: 'loop',
                  }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-slate-100/5"
                    style={{ mixBlendMode: 'screen' }}
                    initial={{ opacity: 0.2, scale: 0.9 }}
                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.08, 0.9] }}
                    transition={{
                      duration: 2.4,
                      ease: easeSmooth,
                      repeat: Infinity,
                      repeatType: 'loop',
                    }}
                  />
                  <motion.svg
                    className="relative h-7 w-7 text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: easeSmooth }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.4}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </motion.svg>
                </motion.div>
                <motion.div
                  className="relative space-y-3"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12, ease: easeSmooth }}
                >
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-100">
                      Preview your website crawl
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400">
                      We&apos;ll use the URL you provide as the entry point, follow internal links on
                      the same domain, and extract clean text to train your agent.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
