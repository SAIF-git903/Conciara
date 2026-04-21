'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Select from '@/components/Select'
import api from '@/lib/api'
import {
  clearOnboardingKeys,
  getOnboardingWorkspaceId,
  getOnboardingCrawlId,
  getOnboardingAgentName,
  getOnboardingAgentLogoUrl,
  getOnboardingTrainOnCrawl,
} from '@/lib/onboarding'

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

interface ModelOption {
  id: string
  label: string
}

export interface PersonalityStepProps {
  onSuccess: (agentId: number) => void
  onForbidden: () => void
  submittingLabel?: string
  confirmLabel?: string
}

export default function PersonalityStep({
  onSuccess,
  onForbidden,
  submittingLabel = 'Taking you to dashboard...',
  confirmLabel = 'Confirm & go to Playground',
}: PersonalityStepProps) {
  const workspaceId = getOnboardingWorkspaceId()
  const [models, setModels] = useState<ModelOption[]>([])
  const [model, setModel] = useState('gpt-4o-mini')
  const [prePrompt, setPrePrompt] = useState('')
  const [prePromptLoading, setPrePromptLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'creating' | 'training' | 'done'>('creating')

  useEffect(() => {
    api.get<{ models: ModelOption[] }>('/models').then(({ data }) => {
      if (data.models?.length) {
        setModels(data.models)
        if (!data.models.some((m) => m.id === model)) {
          setModel(data.models[0].id)
        }
      }
    }).catch(() => {})
  }, [])

  const fetchPrePrompt = (agentNameParam?: string | null) => {
    if (workspaceId == null) return
    setPrePromptLoading(true)
    const params = agentNameParam?.trim() ? { agentName: agentNameParam.trim() } : {}
    api
      .get<{ prePrompt: string }>(`/workspaces/${workspaceId}/generate-preprompt`, { params })
      .then(({ data }) => {
        if (data.prePrompt?.trim()) setPrePrompt(data.prePrompt.trim())
      })
      .catch((err: unknown) => {
        const status = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : 0
        if (status === 403) onForbidden()
      })
      .finally(() => setPrePromptLoading(false))
  }

  useEffect(() => {
    if (workspaceId == null) return
    fetchPrePrompt(getOnboardingAgentName())
  }, [workspaceId, onForbidden])

  const handleGeneratePrePrompt = () => {
    if (workspaceId == null) return
    fetchPrePrompt(getOnboardingAgentName())
  }

  const handleConfirm = async () => {
    if (workspaceId == null) return
    setIsSubmitting(true)
    setSubmitStatus('creating')
    try {
      const name = getOnboardingAgentName()?.trim() || 'My Agent'
      const logoUrl = getOnboardingAgentLogoUrl() || ''
      const { data } = await api.post<{ agent: { id: number; name: string; workspaceId: number } }>(
        `/workspaces/${workspaceId}/agents`,
        { name, model, prePrompt: prePrompt.trim() || undefined, logoUrl: logoUrl || undefined }
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dashboard-agent-created', {
            detail: {
              workspaceId: data.agent.workspaceId,
              agent: {
                id: String(data.agent.id),
                name: data.agent.name,
                workspaceId: data.agent.workspaceId,
              },
            },
          })
        )
      }
      const crawlId = getOnboardingCrawlId()
      if (crawlId != null) {
        await api.patch(`/workspaces/${workspaceId}/crawls/${crawlId}`, { agentId: data.agent.id })
        if (getOnboardingTrainOnCrawl()) {
          setSubmitStatus('training')
          try {
            await api.post(`/workspaces/${workspaceId}/agents/${data.agent.id}/train-from-crawls`)
          } catch (_) {
            // User can retrain from Data sources if needed
          }
        }
      }
      setSubmitStatus('done')
      clearOnboardingKeys()
      onSuccess(data.agent.id)
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : 0
      if (status === 403) onForbidden()
      else setIsSubmitting(false)
    } finally {
      setIsSubmitting(false)
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
          AI behavior
        </motion.div>
        <motion.h1
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          Agent Personality
        </motion.h1>
        <motion.p
          className="mt-3 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          Define the core behavior and AI model for your agent.
        </motion.p>

        <motion.div
          className="mt-10 space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <Select
              id="model"
              label="AI Model"
              value={model}
              onChange={setModel}
              options={models.length ? models.map((m) => ({ value: m.id, label: m.label })) : [{ value: 'gpt-4o-mini', label: 'GPT-4o Mini' }]}
              compact
            />
          </motion.div>

          <motion.div variants={item}>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="prePrompt" className="block text-sm font-medium text-slate-700">
                Pre-prompt for AI
              </label>
              <button
                type="button"
                onClick={handleGeneratePrePrompt}
                disabled={prePromptLoading || workspaceId == null}
                className="text-xs font-medium text-[var(--v2-primary)] hover:underline disabled:opacity-50"
              >
                {prePromptLoading ? 'Generating…' : 'Generate from website'}
              </button>
            </div>
            <textarea
              id="prePrompt"
              value={prePrompt}
              onChange={(e) => setPrePrompt(e.target.value)}
              rows={5}
              placeholder={prePromptLoading ? 'Generating pre-prompt from your website…' : 'Define how your agent behaves as a support assistant. Use "Generate from website" to create one from your crawled content and onboarding details.'}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-slate-200/50 transition focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
            <p className="mt-1 text-xs text-slate-500">Pre-filled as a support assistant based on your website and agent name. Edit or regenerate as needed.</p>
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <motion.span
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--v2-primary-foreground)] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  {submitStatus === 'creating' && 'Creating your agent…'}
                  {submitStatus === 'training' && 'Training on your content…'}
                  {submitStatus === 'done' && submittingLabel}
                </>
              ) : (
                <>
                  {confirmLabel}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="flex min-h-[340px] flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-10 shadow-inner">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50">
            {isSubmitting && submitStatus === 'training' ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex h-full w-full items-center justify-center"
              >
                <svg className="h-7 w-7 text-[var(--v2-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </motion.div>
            ) : (
              <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            )}
          </div>
          <div className="h-px w-20 bg-slate-300" />
          <motion.div
            className="mt-5 rounded-xl border-2 border-slate-200/80 bg-white px-8 py-6 shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.25 }}
          >
            <p className="text-center text-sm font-semibold text-slate-600">
              {isSubmitting
                ? submitStatus === 'creating'
                  ? 'Creating your agent…'
                  : submitStatus === 'training'
                    ? 'Training on your website content…'
                    : 'Taking you to playground…'
                : 'Configuring…'}
            </p>
            <motion.div
              className="mx-auto mt-3 h-1 w-24 overflow-hidden rounded-full bg-slate-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full rounded-full bg-[var(--v2-primary)]"
                initial={{ width: 0 }}
                animate={{ width: isSubmitting ? '100%' : 0 }}
                transition={{
                  duration: isSubmitting ? 1.5 : 0.3,
                  repeat: isSubmitting ? Infinity : 0,
                  repeatDelay: isSubmitting ? 0.3 : 0,
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
