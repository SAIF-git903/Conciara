'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useV2Auth } from '@/contexts/V2AuthContext'
import { setSelectedWorkspaceId } from '@/lib/v2-workspace-selection'
import type { V2Workspace } from '@/contexts/V2AuthContext'
import { Building2, ChevronRight } from 'lucide-react'

export default function ChooseWorkspacePage() {
  const router = useRouter()
  const { user, loading } = useV2Auth()
  const workspaces = user?.workspaces ?? []

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/v2/signin')
      return
    }
    if (workspaces.length === 0) {
      router.replace('/v2/onboarding')
      return
    }
    if (workspaces.length === 1) {
      setSelectedWorkspaceId(workspaces[0].id)
      router.replace('/v2/dashboard')
    }
  }, [user, loading, workspaces.length, router])

  const handleSelect = (workspace: V2Workspace) => {
    setSelectedWorkspaceId(workspace.id)
    router.push('/v2/dashboard')
  }

  if (loading || !user || workspaces.length <= 1) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Choose workspace
        </h1>
        <p className="mb-6 text-center text-sm text-slate-600">
          Select the workspace you want to work in. You can switch later from the dashboard.
        </p>
        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => handleSelect(workspace)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-left transition hover:border-[var(--v2-primary)]/40 hover:bg-[var(--v2-primary)]/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--v2-primary)]/10 text-[var(--v2-primary)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{workspace.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{workspace.plan}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
