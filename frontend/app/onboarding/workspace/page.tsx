'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, CheckCircle2, Link2, Settings, Bot } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { setOnboardingWorkspaceId } from '@/lib/onboarding'

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

const stepsPreview = [
  { label: 'Add your link', Icon: Link2 },
  { label: 'Configure chatbot', Icon: Settings },
  { label: 'Set agent personality', Icon: Bot },
]

export default function OnboardingWorkspacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const sessionReset = searchParams.get('session') === 'reset'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setIsSubmitting(true)
    try {
      const { data } = await api.post<{ workspace: { id: number; name: string; plan: string } }>('/workspaces', {
        name: name.trim(),
        ...(slug.trim() && { slug: slug.trim() }),
      })
      setOnboardingWorkspaceId(data.workspace.id)
      await refreshUser()
      router.push('/onboarding/link')
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Failed to create workspace'
      setError(message || 'Failed to create workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const slugFromName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === slugFromName(name)) setSlug(slugFromName(value))
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
          Step 1 of 4
        </motion.div>
        <motion.h1
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          Create your workspace
        </motion.h1>
        <motion.p
          className="mt-3 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          Your workspace is where you&apos;ll manage chatbots, data sources, and team settings. Name it and get started.
        </motion.p>

        {sessionReset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            Your session was reset. Please create a workspace to continue.
          </motion.div>
        )}

        <motion.form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <label htmlFor="workspace-name" className="mb-2 block text-sm font-medium text-slate-700">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Support, Marketing Team"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 transition placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              autoFocus
            />
          </motion.div>

          <motion.div variants={item}>
            <label htmlFor="workspace-slug" className="mb-2 block text-sm font-medium text-slate-700">
              URL slug <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm ring-1 ring-slate-200/50">
              <span className="pl-4 text-sm text-slate-400">conversatree.app/</span>
              <input
                id="workspace-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="acme-support"
                className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0"
              />
            </div>
          </motion.div>

          {error && (
            <motion.p variants={item} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </motion.p>
          )}
          <motion.div variants={item} className="pt-2">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-[var(--v2-primary-foreground)] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Creating...
                </>
              ) : (
                <>
                  Create workspace & continue
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </motion.div>
        </motion.form>
      </div>

      <motion.div
        className="flex min-h-[340px] flex-col justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-8 shadow-inner">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50">
              <LayoutDashboard className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">What&apos;s next</p>
              <p className="text-sm text-slate-500">Your onboarding path</p>
            </div>
          </div>
          <ul className="space-y-4">
            {stepsPreview.map((step, i) => {
              const StepIcon = step.Icon
              return (
              <motion.li
                key={step.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <StepIcon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700">{step.label}</span>
                <CheckCircle2 className="ml-auto h-5 w-5 text-slate-300" aria-hidden />
              </motion.li>
            )
            })}
          </ul>
          <p className="mt-4 text-center text-xs text-slate-500">
            Complete each step to launch your first chatbot
          </p>
        </div>
      </motion.div>
    </div>
  )
}
