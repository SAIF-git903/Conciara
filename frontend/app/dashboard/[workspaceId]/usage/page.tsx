'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDashboard } from '@/contexts/DashboardContext'
import api from '@/lib/api'
import { Loader2, MessageSquare } from 'lucide-react'

type UsageResponse = {
  includedCredits: number
  bonusCredits: number
  usedCredits: number
  remaining: number
  periodStart: string
  periodEnd: string
  perAgent: { agentId: number; agentName: string; messages: number; creditsUsed: number }[]
}

export default function WorkspaceUsagePage() {
  const params = useParams()
  const workspaceId =
    typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const effectiveWorkspaceId = workspaceId ?? currentWorkspace?.id

  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .get<UsageResponse>(`/workspaces/${effectiveWorkspaceId}/usage`)
      .then(({ data: d }) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [effectiveWorkspaceId])

  if (effectiveWorkspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Select a workspace to view usage.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Usage</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Message credits used this billing period. Credits reset at the start of each period.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading…
            </div>
          ) : data ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Credits this period</h2>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{data.remaining}</span>
                  <span className="text-sm text-slate-500">of {data.includedCredits + data.bonusCredits} remaining</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[var(--v2-primary)] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (data.remaining / (data.includedCredits + data.bonusCredits || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {data.usedCredits} used
                  {data.bonusCredits > 0 ? ` · ${data.bonusCredits} bonus credits` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Period ends {new Date(data.periodEnd).toLocaleDateString()}
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                  By agent
                </h2>
                <div className="divide-y divide-slate-100">
                  {data.perAgent.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                      <MessageSquare className="h-4 w-4" />
                      No assistant messages this period
                    </div>
                  ) : (
                    data.perAgent.map((a) => (
                      <div
                        key={a.agentId}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="font-medium text-slate-900">{a.agentName}</span>
                        <div className="text-right text-sm text-slate-600">
                          {a.messages} messages · {a.creditsUsed} credits
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            <p className="text-sm text-slate-500">Failed to load usage.</p>
          )}
        </div>
      </div>
    </div>
  )
}
