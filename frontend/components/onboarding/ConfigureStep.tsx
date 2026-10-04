'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { getOnboardingWorkspaceId, getOnboardingAgentName, getOnboardingAgentLogoUrl, setOnboardingAgentName, setOnboardingAgentLogoUrl } from '@/lib/onboarding'

// ── Static chat preview ───────────────────────────────────────
interface PreviewMsg { id: string; from: 'bot' | 'user'; text: string }

const PREVIEW_MSGS: PreviewMsg[] = [
  { id: '1', from: 'bot',  text: 'Hi there! How can I help you today? 👋' },
  { id: '2', from: 'user', text: "Hello! I'm interested in your services." },
  { id: '3', from: 'bot',  text: 'Great! I can help with information about our services. What would you like to know?' },
  { id: '4', from: 'user', text: 'What are your pricing plans?' },
  { id: '5', from: 'bot',  text: 'We offer Hobby, Standard, and Pro plans. Would you like me to walk you through them?' },
]

function StaticChatPreview({ name, logoUrl }: { name: string; logoUrl: string }) {
  const title = name.trim() || 'Chat Assistant'
  return (
    <div style={{
      width: '100%', maxWidth: 380,
      borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.06)',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      height: 520,
      userSelect: 'none',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        background: 'var(--v2-primary, #6366f1)',
        flexShrink: 0,
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 5, marginRight: 2 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => (
            <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{title.charAt(0).toUpperCase()}</span>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Online
          </div>
        </div>

        {/* × button (decorative) */}
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
        {PREVIEW_MSGS.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>

            {/* Bot avatar dot */}
            {msg.from === 'bot' && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'var(--v2-primary, #6366f1)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
              }}>
                {logoUrl
                  ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{title.charAt(0).toUpperCase()}</span>
                }
              </div>
            )}

            <div style={{
              maxWidth: '72%',
              padding: '9px 13px',
              borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.from === 'user' ? 'var(--v2-primary, #6366f1)' : '#fff',
              color: msg.from === 'user' ? '#fff' : '#1e293b',
              fontSize: 13,
              lineHeight: 1.5,
              boxShadow: msg.from === 'bot' ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
              border: msg.from === 'bot' ? '1px solid rgba(0,0,0,0.05)' : 'none',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderTop: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0,
      }}>
        <div style={{
          flex: 1, height: 38, borderRadius: 19,
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          display: 'flex', alignItems: 'center', padding: '0 14px',
          fontSize: 13, color: '#94a3b8',
        }}>
          Type your message…
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'var(--v2-primary, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Send size={15} color="#fff" />
        </div>
      </div>
    </div>
  )
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


export interface ConfigureStepProps {
  nextPath: string
  router: { push: (url: string) => void }
  onForbidden: () => void
}

export default function ConfigureStep({ nextPath, router, onForbidden }: ConfigureStepProps) {
  const { user } = useAuth()
  const workspaceId = getOnboardingWorkspaceId()
  const [name, setName] = useState('Conciara')
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
    setOnboardingAgentName(name.trim() || 'Conciara')
    setOnboardingAgentLogoUrl(logoUrl || '')
    router.push(nextPath)
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
              placeholder="Conciara"
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
        className="flex justify-center p-4 lg:sticky lg:top-4 lg:self-start lg:justify-start"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        <StaticChatPreview name={name} logoUrl={logoUrl} />
      </motion.div>
    </div>
  )
}
