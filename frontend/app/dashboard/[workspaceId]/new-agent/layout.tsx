'use client'

import { usePathname, useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Settings, Bot, ArrowLeft } from 'lucide-react'
import { getOnboardingWorkspaceId, getOnboardingLinkDone } from '@/lib/onboarding'
import { buildDashboardUrl } from '@/lib/dashboard-url'

function useSteps(workspaceId: string | null) {
  if (!workspaceId) return []
  return [
    { path: `/dashboard/${workspaceId}/new-agent/link`, label: 'Website', short: 'Link', Icon: Link2 },
    { path: `/dashboard/${workspaceId}/new-agent/configure`, label: 'Chatbot', short: 'Configure', Icon: Settings },
    { path: `/dashboard/${workspaceId}/new-agent/personality`, label: 'Personality', short: 'Agent', Icon: Bot },
  ]
}

function useNewAgentProgress() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)
  const [linkDone, setLinkDone] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setWorkspaceId(getOnboardingWorkspaceId())
    setLinkDone(getOnboardingLinkDone())
  }, [pathname])

  return { workspaceId, linkDone }
}

export default function NewAgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const workspaceIdParam = typeof params?.workspaceId === 'string' ? params.workspaceId : null
  const steps = useSteps(workspaceIdParam)
  const { workspaceId, linkDone } = useNewAgentProgress()
  const [redirectPending, setRedirectPending] = useState(true)
  const currentIndex = steps.findIndex((s) => pathname === s.path)
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const dashboardUrl = workspaceIdParam ? buildDashboardUrl(parseInt(workspaceIdParam, 10)) : '/dashboard'

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    setRedirectPending(true)
  }, [pathname])

  useEffect(() => {
    const storedWorkspaceId = getOnboardingWorkspaceId()
    const storedLinkDone = getOnboardingLinkDone()

    if (!workspaceIdParam) {
      router.replace('/dashboard')
      return
    }
    const base = `/dashboard/${workspaceIdParam}/new-agent`
    if (pathname === `${base}` || pathname === `${base}/`) {
      if (storedWorkspaceId == null) {
        router.replace(dashboardUrl)
        return
      }
      setRedirectPending(false)
      return
    }
    if (storedWorkspaceId == null) {
      router.replace(dashboardUrl)
      return
    }
    if (pathname === `${base}/configure` && !storedLinkDone) {
      router.replace(`${base}/link`)
      return
    }
    if (pathname === `${base}/personality` && !storedLinkDone) {
      router.replace(`${base}/link`)
      return
    }
    setRedirectPending(false)
  }, [pathname, router, workspaceIdParam, dashboardUrl])

  const isStepReached = (i: number): boolean => {
    if (i === 0) return true
    if (i === 1) return workspaceId != null
    if (i === 2) return workspaceId != null && linkDone
    return false
  }

  if (redirectPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-200 bg-white pb-4 pt-2 sm:pt-4">
        <div className="mb-4">
          <Link
            href={dashboardUrl}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to workspace dashboard
          </Link>
        </div>
        <div className="flex items-center justify-between" aria-label="Progress">
          {steps.map((step, i) => {
            const isActive = pathname === step.path
            const isPast = currentIndex > i
            const reached = isStepReached(i)
            const StepIcon = step.Icon
            const content = (
              <>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isPast
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : isActive
                        ? 'border-[var(--v2-primary)] bg-white text-[var(--v2-primary)]'
                        : !reached
                          ? 'border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isPast ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <StepIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  )}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive ? 'text-slate-900' : isPast ? 'text-slate-600' : !reached ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.short}
                </span>
              </>
            )
            return (
              <div key={step.path} className="flex flex-1 items-center last:flex-none">
                <span className="flex flex-col items-center gap-2" aria-current={isActive ? 'step' : undefined}>
                  {content}
                </span>
                {i < steps.length - 1 && (
                  <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded bg-slate-200">
                    <motion.div
                      className="h-full rounded bg-[var(--v2-primary)]"
                      style={{ width: currentIndex > i ? '100%' : '0%' }}
                      initial={false}
                      animate={{ width: currentIndex > i ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto pt-4">
        <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          className="min-h-0 flex-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
