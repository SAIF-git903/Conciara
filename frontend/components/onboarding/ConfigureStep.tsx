'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { getOnboardingWorkspaceId, getOnboardingAgentName, getOnboardingAgentLogoUrl, setOnboardingAgentName, setOnboardingAgentLogoUrl } from '@/lib/onboarding'
import SkinRenderer from '@/components/SkinRenderer'
import type { SkinConfig } from '@/types/skinConfig'

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

const PREVIEW_MESSAGES = [
  { id: '1', type: 'bot' as const, content: 'Hi there! How can I help you today?', timestamp: new Date() },
  { id: '2', type: 'user' as const, content: `Hello! I'm interested in your services.`, timestamp: new Date() },
  { id: '3', type: 'bot' as const, content: 'Great! I can help with information about our services. What would you like to know?', timestamp: new Date() },
  { id: '4', type: 'user' as const, content: 'What are your pricing plans?', timestamp: new Date() },
  { id: '5', type: 'bot' as const, content: 'We offer various plans. Would you like me to list them?', timestamp: new Date() },
]

export interface ConfigureStepProps {
  nextPath: string
  router: { push: (url: string) => void }
  onForbidden: () => void
}

export default function ConfigureStep({ nextPath, router, onForbidden }: ConfigureStepProps) {
  const { user } = useAuth()
  const workspaceId = getOnboardingWorkspaceId()
  const [name, setName] = useState('ConversaTree')
  const [logoUrl, setLogoUrl] = useState('')
  const [crawlLoading, setCrawlLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl === 'string') setLogoUrl(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  useEffect(() => {
    if (workspaceId == null || !user?.workspaces) return
    const hasAccess = user.workspaces.some((w) => w.id === workspaceId)
    if (!hasAccess) onForbidden()
  }, [user?.workspaces, workspaceId, onForbidden])

  // Prefer crawl data passed from Step 1 (sessionStorage); only fetch when missing (e.g. refresh on this step)
  useEffect(() => {
    if (workspaceId == null) {
      setCrawlLoading(false)
      return
    }
    const storedName = getOnboardingAgentName()
    const storedLogo = getOnboardingAgentLogoUrl()
    if (storedName?.trim() || storedLogo?.trim()) {
      if (storedName?.trim()) setName(storedName.trim())
      if (storedLogo?.trim()) setLogoUrl(storedLogo.trim())
      setCrawlLoading(false)
      return
    }
    let cancelled = false
    api
      .get<{ crawl: { title: string | null; logoUrl: string | null } | null }>(`/workspaces/${workspaceId}/crawl`)
      .then(({ data }) => {
        if (cancelled || !data.crawl) return
        if (data.crawl.title?.trim()) setName(data.crawl.title.trim())
        if (data.crawl.logoUrl?.trim()) setLogoUrl(data.crawl.logoUrl.trim())
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : 0
        if (status === 403) onForbidden()
      })
      .finally(() => {
        if (!cancelled) setCrawlLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, onForbidden])

  const handleSaveAndContinue = (e: React.MouseEvent) => {
    e.preventDefault()
    if (workspaceId == null) return
    setOnboardingAgentName(name.trim() || 'ConversaTree')
    setOnboardingAgentLogoUrl(logoUrl || '')
    router.push(nextPath)
  }

  const previewConfig = useMemo<SkinConfig>(() => ({
    theme: {
      primaryColor: 'var(--v2-primary)', // use CSS variable so it matches app theme
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderColor: '#e2e8f0',
    },
    components: {
      window: { width: 384, height: 520, minWidth: 320, minHeight: 400, borderRadius: 20, shadow: 'large' },
      header: {
        show: true,
        showTitle: true,
        title: name.trim() || 'Chat Assistant',
        showAvatar: !!logoUrl,
        avatarIcon: logoUrl || undefined,
        showMinimize: false,
        showClose: false,
      },
      messages: {
        layout: 'bubbles',
        bubbleStyle: 'rounded',
        showAvatars: true,
        showBotAvatar: false, // no bot picture next to messages in this preview
        showUserAvatar: false,
      },
      input: { placeholder: 'Type your message...', showSendButton: true },
    },
    states: {},
  }), [name, logoUrl])

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
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ConversaTree"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200/50 transition focus:border-[var(--v2-primary)] focus:ring-2 focus:ring-[var(--v2-primary)]/20"
            />
            <p className="mt-1 text-xs text-slate-500">Pre-filled from your website title. You can change it.</p>
          </motion.div>

          <motion.div variants={item}>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Chat Icon
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFile}
            />
            <motion.div
              className="group relative flex cursor-pointer flex-col items-center gap-5 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-8 shadow-sm transition-all duration-200 hover:border-[var(--v2-primary)]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v2-primary)] focus-visible:ring-offset-2"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-white shadow-inner transition-colors duration-200 group-hover:border-[var(--v2-primary)]/50 group-hover:bg-slate-50/50">
                {logoUrl ? (
                  <>
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-full w-full object-contain p-2"
                      onError={() => setLogoUrl('')}
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/0 opacity-0 transition-opacity duration-200 group-hover:bg-slate-900/20 group-hover:opacity-100">
                      <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                        Change
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span className="text-xs font-medium">Add icon</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 group-hover:text-slate-800">
                  <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--v2-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {logoUrl ? 'Click to change icon' : 'Upload from computer'}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  {logoUrl ? 'Shown in the chat widget' : 'Pre-filled from your website. Click to upload your own.'}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {error && (
            <motion.p variants={item} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </motion.p>
          )}
          <motion.div variants={item} className="pt-2">
            <button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={isSubmitting || workspaceId == null || crawlLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--v2-primary)] px-4 py-3.5 text-sm font-semibold text-[var(--v2-primary-foreground)] shadow-lg shadow-[var(--v2-primary)]/20 transition hover:bg-[var(--v2-primary-hover)] hover:shadow-xl hover:shadow-[var(--v2-primary)]/25 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <>
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-[var(--v2-primary-foreground)] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  Save & continue
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
        className="flex flex-col p-4 lg:sticky lg:top-4 lg:self-start"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <div className="min-h-[420px] w-full max-w-[400px] max-h-[min(80vh,640px)] mx-auto lg:mx-0">
          <SkinRenderer
            config={previewConfig}
            apiUrl=""
            treeId={null}
            initialMessages={PREVIEW_MESSAGES}
            previewMode
            onMessage={async () => {}}
          />
        </div>
      </motion.div>
    </div>
  )
}
