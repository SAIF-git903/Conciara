'use client'

import { useId } from 'react'

type MarkTone = 'gradient' | 'onDark' | 'onLight'

export function ConciaraMark({
  className = '',
  size = 32,
  tone = 'gradient',
}: {
  className?: string
  size?: number
  tone?: MarkTone
}) {
  const gradId = useId().replace(/:/g, '')
  const gradRef = `url(#conciara-grad-${gradId})`
  const stroke =
    tone === 'gradient'
      ? gradRef
      : tone === 'onDark'
        ? 'rgba(255,255,255,0.95)'
        : '#0f172a'
  const fillNode =
    tone === 'gradient'
      ? gradRef
      : tone === 'onDark'
        ? 'rgba(255,255,255,0.2)'
        : '#0f172a'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {tone === 'gradient' && (
        <defs>
          <linearGradient id={`conciara-grad-${gradId}`} x1="4" y1="16" x2="28" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M8 16C8 11.6 11.6 8 16 8c2.2 0 4.2 1 5.5 2.6M23.5 21.4C22.2 23 20.2 24 18 24c-4.4 0-8-3.6-8-8"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="16" r="3" fill={fillNode} stroke={stroke} strokeWidth="1.25" />
      <circle cx="16" cy="8" r="3" fill={fillNode} stroke={stroke} strokeWidth="1.25" />
      <circle cx="24" cy="16" r="3" fill={fillNode} stroke={stroke} strokeWidth="1.25" />
    </svg>
  )
}
