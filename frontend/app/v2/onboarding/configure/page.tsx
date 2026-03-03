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

export default function OnboardingConfigurePage() {
  const [name, setName] = useState('ConversaTree')
  const [theme, setTheme] = useState('default')
  const [bubbleColor, setBubbleColor] = useState('#3b82f6')

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
          Look & feel
        </motion.div>
        <motion.h1
          className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          Configure your chatbot
        </motion.h1>
        <motion.p
          className="mt-3 text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          Customize the look and feel of your chatbot.
        </motion.p>

        <motion.div
          className="mt-10 space-y-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item}>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
              Chatbot Name
            </label>
            <div className="flex gap-2">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 transition focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              />
            </div>
          </motion.div>

          <motion.div variants={item}>
            <V2Select
              id="theme"
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'dark', label: 'Dark' },
                { value: 'minimal', label: 'Minimal' },
              ]}
            />
          </motion.div>

          <motion.div variants={item}>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chat Bubble Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bubbleColor}
                onChange={(e) => setBubbleColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 shadow-sm"
              />
              <span className="font-mono text-sm text-slate-500">{bubbleColor}</span>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chat Icon
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/50 transition hover:bg-slate-50">
              <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="text-sm font-medium text-slate-700">Upload Image</span>
              <input type="file" className="hidden" accept="image/*" />
              <span className="ml-auto text-xs text-slate-400">No file chosen</span>
            </label>
          </motion.div>

          <motion.div variants={item} className="pt-2">
            <Link
              href="/v2/onboarding/personality"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25"
            >
              Save & continue
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="lg:sticky lg:top-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <p className="mb-3 text-sm font-semibold text-slate-700">Live Preview</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-200/50">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
              <span className="text-sm font-bold">?</span>
            </div>
            <span className="font-semibold text-slate-900">{name || 'Chatbot'}</span>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex justify-start">
              <span className="rounded-2xl rounded-bl-md bg-slate-200/90 px-4 py-2.5 text-sm text-slate-800">
                Hi there! How can I help you today?
              </span>
            </div>
            <div className="flex justify-end">
              <span
                className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
                style={{ backgroundColor: bubbleColor }}
              >
                Hello! I&apos;m {name || 'your assistant'}. I can help with information about our services.
              </span>
            </div>
            <div className="flex justify-start">
              <span className="rounded-2xl rounded-bl-md bg-slate-200/90 px-4 py-2.5 text-sm text-slate-800">
                What are your pricing plans?
              </span>
            </div>
            <div className="flex justify-end">
              <span
                className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
                style={{ backgroundColor: bubbleColor }}
              >
                We offer various plans. Would you like me to list them?
              </span>
            </div>
          </div>
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[var(--v2-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--v2-primary)]/20"
              readOnly
            />
            <button
              type="button"
              className="rounded-xl bg-[var(--v2-primary)] p-2.5 text-[var(--v2-primary-foreground)] transition hover:bg-[var(--v2-primary-hover)]"
              aria-label="Send"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9 2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
