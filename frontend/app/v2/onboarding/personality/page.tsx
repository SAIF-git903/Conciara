'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import V2Select from '@/components/v2/Select'

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

export default function OnboardingPersonalityPage() {
  const [model, setModel] = useState('gpt-4-turbo')
  const [prePrompt, setPrePrompt] = useState('')

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
            <V2Select
              id="model"
              label="AI Model"
              value={model}
              onChange={setModel}
              options={[
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'claude-3', label: 'Claude 3' },
              ]}
            />
          </motion.div>

          <motion.div variants={item}>
            <label htmlFor="prePrompt" className="mb-2 block text-sm font-medium text-slate-700">
              Pre-prompt for AI
            </label>
            <textarea
              id="prePrompt"
              value={prePrompt}
              onChange={(e) => setPrePrompt(e.target.value)}
              rows={5}
              placeholder="Enter a pre-prompt to guide your AI agent's behavior and responses. For example: 'You are a friendly customer support agent for a tech company. Always be polite and provide clear, concise answers.'"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-slate-200/50 transition focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <Link
              href="/v2/dashboard/playground"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25"
            >
              Confirm & go to Playground
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
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
            <svg className="h-7 w-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <div className="h-px w-20 bg-slate-300" />
          <motion.div
            className="mt-5 rounded-xl border-2 border-slate-200/80 bg-white px-8 py-6 shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.25 }}
          >
            <p className="text-center text-sm font-semibold text-slate-600">Configuring...</p>
            <motion.div
              className="mx-auto mt-3 h-1 w-24 overflow-hidden rounded-full bg-slate-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full rounded-full bg-[var(--v2-primary)]"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.3 }}
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
