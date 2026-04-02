'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { type ReactNode, useState, useEffect, Suspense } from 'react'
import { useScroll } from 'framer-motion'
import Header from './Header'
import { getSelectedWorkspaceId } from '@/lib/workspace-selection'

const HEADER_HEIGHT = 72

function LayoutShellWithParams({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isOnboarding = pathname?.startsWith('/onboarding')
  const isDashboard = pathname?.startsWith('/dashboard')
  const isSettings = pathname === '/account' || pathname?.includes('/dashboard/') && pathname?.includes('/settings')
  const isEmbed = pathname?.startsWith('/embed')
  const isDocs = pathname?.startsWith('/docs')
  const isLanding = pathname === '/'

  const [headerDark, setHeaderDark] = useState(false)
  const { scrollY } = useScroll()

  // Paddle Hosted Checkout may redirect to default payment link (e.g. /) with transaction_id.
  // Redirect immediately to billing so user never sees the home page.
  const txnId = searchParams.get('transaction_id')
  const isPostCheckoutReturn = isLanding && !!txnId

  useEffect(() => {
    if (!txnId) return
    const workspaceId = getSelectedWorkspaceId()
    const target =
      workspaceId != null
        ? `/dashboard/${workspaceId}/settings/billing?checkout_success=1`
        : '/dashboard?checkout_success=1'
    window.location.replace(target)
  }, [txnId])

  useEffect(() => {
    if (!isLanding) {
      setHeaderDark(false)
      return
    }
    const update = () => {
      const hero = document.getElementById('hero')
      const video = document.getElementById('video-demo')
      const y = scrollY.get()
      const inHero = hero ? y < hero.offsetHeight - HEADER_HEIGHT : y < 400
      const inVideo = video
        ? y > video.offsetTop - HEADER_HEIGHT && y < video.offsetTop + video.offsetHeight
        : false
      setHeaderDark(inHero || inVideo)
    }
    update()
    const unsub = scrollY.on('change', update)
    return () => unsub()
  }, [isLanding, scrollY])

  // After payment, show minimal "Redirecting..." so we never render the full home page
  if (isPostCheckoutReturn) {
    return (
      <div className="v2-theme flex min-h-screen items-center justify-center bg-white text-slate-600">
        <p className="text-sm">Redirecting to billing…</p>
      </div>
    )
  }

  return (
    <div className="v2-theme min-h-screen bg-white text-slate-900">
      {!isOnboarding && !isDashboard && !isSettings && !isEmbed && !isDocs && (
        <Header variant={isLanding ? (headerDark ? 'dark' : 'light') : undefined} />
      )}

      <main
        className={
          isDashboard
            ? 'h-screen overflow-hidden p-0 max-w-none'
            : isEmbed
              ? 'min-h-screen p-0 max-w-none'
              : isDocs
                ? 'min-h-screen p-0 max-w-none'
              : isLanding
                ? 'max-w-none p-0 pb-0'
                : `mx-auto max-w-6xl px-4 pb-16 sm:px-5 lg:px-6 ${isOnboarding ? 'pt-8' : 'pt-10'}`
        }
      >
        {children}
      </main>
    </div>
  )
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="v2-theme min-h-screen bg-white" />}>
      <LayoutShellWithParams>{children}</LayoutShellWithParams>
    </Suspense>
  )
}
