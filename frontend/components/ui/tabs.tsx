'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-center gap-2 border-b border-slate-200', className)}>{children}</div>
}

export function TabsTrigger({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'border-b-2 px-2 py-2 text-sm font-medium transition-colors',
        active ? 'border-[var(--v2-primary)] text-[var(--v2-primary)]' : 'border-transparent text-slate-500 hover:text-slate-900',
        disabled && 'cursor-not-allowed opacity-50 hover:text-slate-500'
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ active, children, className }: { active: boolean; children: ReactNode; className?: string }) {
  if (!active) return null
  return <div className={cn(className)}>{children}</div>
}
