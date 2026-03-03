'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Link2, Settings, Bot } from 'lucide-react'

const steps = [
  { path: '/v2/onboarding/workspace', label: 'Workspace', short: 'Workspace', Icon: LayoutDashboard },
  { path: '/v2/onboarding/link', label: 'Website', short: 'Link', Icon: Link2 },
  { path: '/v2/onboarding/configure', label: 'Chatbot', short: 'Configure', Icon: Settings },
  { path: '/v2/onboarding/personality', label: 'Personality', short: 'Agent', Icon: Bot },
]

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentIndex = steps.findIndex((s) => pathname === s.path)
  const isLastStep = currentIndex === steps.length - 1

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10">
        <div className="flex items-center justify-between" aria-label="Progress">
          {steps.map((step, i) => {
            const isActive = pathname === step.path
            const isPast = currentIndex > i
            const StepIcon = step.Icon
            return (
              <div key={step.path} className="flex flex-1 items-center last:flex-none">
                <Link
                  href={step.path}
                  className="group flex flex-col items-center gap-2 transition-opacity hover:opacity-90"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isPast
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : isActive
                          ? 'border-[var(--v2-primary)] bg-white text-[var(--v2-primary)]'
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
                      isActive ? 'text-slate-900' : isPast ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {step.short}
                  </span>
                </Link>
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
