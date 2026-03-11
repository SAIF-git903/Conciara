'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { type ReactNode, useState, useEffect } from 'react'
import { useScroll } from 'framer-motion'
import Header from './Header'
import { getSelectedWorkspaceId } from '@/lib/workspace-selection'

const HEADER_HEIGHT = 72

export default function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isOnboarding = pathname?.startsWith('/onboarding')
  const isDashboard = pathname?.startsWith('/dashboard')
  const isSettings = pathname === '/account' || pathname?.startsWith('/dashboard/settings')
  const isEmbed = pathname?.startsWith('/embed')
  const isLanding = pathname === '/'

  const [headerDark, setHeaderDark] = useState(false)
  const { scrollY } = useScroll()

  // Paddle Hosted Checkout redirects to default payment link (e.g. /) with transaction_id; send user to dashboard billing
  useEffect(() => {
    const txnId = searchParams.get('transaction_id')
    if (!txnId) return
    const workspaceId = getSelectedWorkspaceId()
    if (workspaceId != null) {
      router.replace(`/dashboard/${workspaceId}/settings/billing?checkout_success=1`)
    } else {
      router.replace('/dashboard?checkout_success=1')
    }
  }, [searchParams, router])

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

  return (
    <div className="v2-theme min-h-screen bg-white text-slate-900">
      {!isOnboarding && !isDashboard && !isSettings && !isEmbed && (
        <Header variant={isLanding ? (headerDark ? 'dark' : 'light') : undefined} />
      )}

      <main
        className={
          isDashboard
            ? 'h-screen overflow-hidden p-0 max-w-none'
            : isEmbed
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
