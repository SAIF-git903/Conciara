'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  )
}

export function SheetContent({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden border-l border-slate-200 bg-white shadow-xl',
        className
      )}
    >
      {children}
    </div>
  )
}
