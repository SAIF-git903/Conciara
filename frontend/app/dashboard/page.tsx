'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'

/** Redirects /dashboard to /dashboard/[workspaceId] (layout also does this; this avoids flash). */
export default function DashboardRedirectPage() {
  const router = useRouter()
  const { currentWorkspace } = useDashboard()

  useEffect(() => {
    if (currentWorkspace?.id) {
      router.replace(buildDashboardUrl(currentWorkspace.id))
    }
  }, [currentWorkspace?.id, router])

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
    </div>
  )
}
