'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Link2, Settings, Bot } from 'lucide-react'
import { getOnboardingWorkspaceId, getOnboardingAgentId, getOnboardingLinkDone } from '@/lib/v2-onboarding'

const steps = [
  { path: '/v2/onboarding/workspace', label: 'Workspace', short: 'Workspace', Icon: LayoutDashboard },
  { path: '/v2/onboarding/link', label: 'Website', short: 'Link', Icon: Link2 },
  { path: '/v2/onboarding/configure', label: 'Chatbot', short: 'Configure', Icon: Settings },
  { path: '/v2/onboarding/personality', label: 'Personality', short: 'Agent', Icon: Bot },
]

function useOnboardingProgress() {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)
  const [agentId, setAgentId] = useState<number | null>(null)
  const [linkDone, setLinkDone] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setWorkspaceId(getOnboardingWorkspaceId())
    setAgentId(getOnboardingAgentId())
    setLinkDone(getOnboardingLinkDone())
  }, [pathname])

  return { workspaceId, agentId, linkDone }
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { workspaceId, agentId, linkDone } = useOnboardingProgress()
  const [redirectPending, setRedirectPending] = useState(true)
  const currentIndex = steps.findIndex((s) => pathname === s.path)

  useEffect(() => {
    setRedirectPending(true)
  }, [pathname])

  // Single place for step guards: run before showing content to avoid flash of wrong step.
  // When we redirect, do NOT set redirectPending to false — keep showing spinner until pathname updates.
  useEffect(() => {
    const wid = getOnboardingWorkspaceId()
    const aid = getOnboardingAgentId()
    const link = getOnboardingLinkDone()

    if (pathname === '/v2/onboarding/workspace' && wid != null) {
      router.replace('/v2/onboarding/link')
      return
    }
    if (pathname === '/v2/onboarding/link') {
      if (wid == null) {
        router.replace('/v2/onboarding/workspace')
        return
      }
      if (link) {
        router.replace('/v2/onboarding/configure')
        return
      }
      setRedirectPending(false)
      return
    }
    if (pathname === '/v2/onboarding/configure') {
      if (wid == null) {
        router.replace('/v2/onboarding/workspace')
        return
      }
      if (!link) {
        router.replace('/v2/onboarding/link')
        return
      }
      setRedirectPending(false)
      return
    }
    if (pathname === '/v2/onboarding/personality') {
      if (wid == null) {
        router.replace('/v2/onboarding/workspace')
        return
      }
      if (!link) {
        router.replace('/v2/onboarding/link')
        return
      }
      setRedirectPending(false)
      return
    }

    setRedirectPending(false)
  }, [pathname, router])

  const getStepHref = (i: number): string | null => {
    const step = steps[i]
    if (i === 0) {
      return workspaceId != null ? '/v2/onboarding/link' : step.path
    }
    if (i === 1) return workspaceId != null ? step.path : null
    if (i === 2) return workspaceId != null && linkDone ? step.path : null
    if (i === 3) return workspaceId != null && linkDone ? step.path : null
    return null
  }

  const isStepClickable = (i: number): boolean => {
    if (i === 0) return true
    if (i === 1) return workspaceId != null
    if (i === 2) return workspaceId != null && linkDone
    if (i === 3) return workspaceId != null && linkDone
    return false
  }

  if (redirectPending) {
    return (
      <div className="mx-auto max-w-5xl flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" aria-hidden />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10">
        <div className="flex items-center justify-between" aria-label="Progress">
          {steps.map((step, i) => {
            const isActive = pathname === step.path
            const isPast = currentIndex > i
            const StepIcon = step.Icon
            const href = getStepHref(i)
            const clickable = isStepClickable(i)
            const content = (
              <>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isPast
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : isActive
                        ? 'border-[var(--v2-primary)] bg-white text-[var(--v2-primary)]'
                        : !clickable
                          ? 'border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-400'
                  } ${!clickable ? 'cursor-not-allowed' : ''}`}
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
                    isActive ? 'text-slate-900' : isPast ? 'text-slate-600' : !clickable ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.short}
                </span>
              </>
            )
            return (
              <div key={step.path} className="flex flex-1 items-center last:flex-none">
                {href && clickable ? (
                  <Link
                    href={href}
                    className="group flex flex-col items-center gap-2 transition-opacity hover:opacity-90"
                  >
                    {content}
                  </Link>
                ) : (
                  <span
                    className="flex flex-col items-center gap-2"
                    aria-disabled={!clickable}
                    title={!clickable ? 'Complete the previous step first' : undefined}
                  >
                    {content}
                  </span>
                )}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
