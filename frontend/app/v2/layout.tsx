'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { V2AuthProvider } from '@/contexts/V2AuthContext'
import V2Header from './V2Header'

export default function V2Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isOnboarding = pathname?.startsWith('/v2/onboarding')
  const isDashboard = pathname?.startsWith('/v2/dashboard')
  const isSettings = pathname === '/v2/account' || pathname?.startsWith('/v2/dashboard/settings')

  return (
    <div className="v2-theme min-h-screen bg-white text-slate-900">
      {!isOnboarding && !isDashboard && !isSettings && <V2Header />}

      <main
        className={
          isDashboard
            ? 'h-screen overflow-hidden p-0 max-w-none'
            : `mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 ${isOnboarding ? 'pt-8' : 'pt-10'}`
        }
      >
        <V2AuthProvider>
          {children}
        </V2AuthProvider>
      </main>
    </div>
  )
}

