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

export default function OnboardingLinkPage() {
  const [protocol, setProtocol] = useState('https://')
  const [url, setUrl] = useState('')
  const [useCase, setUseCase] = useState('general')

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
          <motion.div variants={item}>
            <label htmlFor="url" className="mb-2 block text-sm font-medium text-slate-700">
              Your website URL
            </label>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/50 transition focus-within:border-[var(--v2-primary)] focus-within:ring-2 focus-within:ring-[var(--v2-primary)]/20">
              <div className="w-[7.5rem] shrink-0 border-r border-slate-200">
                <V2Select
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
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:ring-0"
              />
            </div>
          </motion.div>

          <motion.div variants={item}>
            <V2Select
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
            />
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <Link
              href="/v2/onboarding/configure"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25"
            >
              Continue
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="flex min-h-[340px] items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 p-8 shadow-inner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50">
            <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">
            Real-time updates of what we&apos;re fetching with the crawler will appear here.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
