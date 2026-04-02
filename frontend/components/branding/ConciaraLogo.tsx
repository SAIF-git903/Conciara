'use client'

import Link from 'next/link'
import { ConciaraMark } from './ConciaraMark'

/**
 * Conciara brand lockups per design system:
 * - dashboard: SaaS header — neutral icon + wordmark, small
 * - hero: landing hero — gradient wordmark + accent mark + optional glow
 * - mark: icon only (favicon-scale compositions, avatars)
 * - social: bold mark in square frame (profile crops)
 */
type LogoVariant = 'dashboard' | 'hero' | 'mark' | 'social'

export function ConciaraLogo({
  variant = 'dashboard',
  theme = 'light',
  href = '/',
  className = '',
}: {
  variant?: LogoVariant
  theme?: 'light' | 'dark'
  href?: string | null
  className?: string
}) {
  const isDarkBg = theme === 'dark'
  const markTone = isDarkBg ? 'onDark' : 'onLight'

  if (variant === 'mark') {
    const inner = <ConciaraMark size={32} tone={isDarkBg ? 'onDark' : 'onLight'} />
    if (href === null) return <span className={className}>{inner}</span>
    return (
      <Link href={href} className={`inline-flex ${className}`} aria-label="Conciara home">
        {inner}
      </Link>
    )
  }

  if (variant === 'social') {
    const inner = (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          isDarkBg ? 'bg-slate-900 ring-1 ring-white/10' : 'bg-slate-900'
        }`}
      >
        <ConciaraMark size={22} tone="gradient" />
      </div>
    )
    if (href === null) return <span className={className}>{inner}</span>
    return (
      <Link href={href} className={`inline-flex ${className}`} aria-label="Conciara home">
        {inner}
      </Link>
    )
  }

  if (variant === 'hero') {
    const inner = (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div
          className="flex items-center gap-3"
          style={{ filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.35))' }}
        >
          <ConciaraMark size={40} tone="gradient" />
          <span className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Conciara
            </span>
          </span>
        </div>
      </div>
    )
    if (href === null) return inner
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v2-primary)] rounded-lg">
        {inner}
      </Link>
    )
  }

  // dashboard — horizontal, minimal, UI-friendly
  const inner = (
    <span className="flex items-center gap-2.5">
      <ConciaraMark size={28} tone={markTone} />
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          isDarkBg ? 'text-white' : 'text-slate-900'
        }`}
      >
        Conciara
      </span>
    </span>
  )

  if (href === null) return <span className={`inline-flex items-center ${className}`}>{inner}</span>
  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="Conciara home">
      {inner}
    </Link>
  )
}
