'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Header from './Header'

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isOnboarding = pathname?.startsWith('/onboarding')
  const isDashboard = pathname?.startsWith('/dashboard')
  const isSettings = pathname === '/account' || pathname?.startsWith('/dashboard/settings')
  const isEmbed = pathname?.startsWith('/embed')

  return (
    <div className="v2-theme min-h-screen bg-white text-slate-900">
      {!isOnboarding && !isDashboard && !isSettings && !isEmbed && <Header />}

      <main
        className={
          isDashboard
            ? 'h-screen overflow-hidden p-0 max-w-none'
            : isEmbed
              ? 'min-h-screen p-0 max-w-none'
              : `mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 ${isOnboarding ? 'pt-8' : 'pt-10'}`
        }
      >
        {children}
      </main>
    </div>
  )
}
