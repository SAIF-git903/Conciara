'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { CreditCard, FileText, Check, ExternalLink, RefreshCw } from 'lucide-react'
import api from '@/lib/api'

type SubscriptionSummary = {
  id: string
  planName: string
  planDisplayName: string
  status: string
  billingCycle: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

type BillingTransaction = {
  id: string
  paddleTransactionId: string
  amountCents: number | null
  currencyCode: string | null
  status: string
  createdAt: string
}

export default function WorkspaceSettingsBillingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace, refreshUsage } = useDashboard()
  const { user, refreshUser } = useAuth()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null | undefined>(undefined)
  const [billingHistory, setBillingHistory] = useState<BillingTransaction[]>([])
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [billingHistoryLoading, setBillingHistoryLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshingContexts, setRefreshingContexts] = useState(false)

  useEffect(() => {
    if (searchParams.get('checkout_success') === '1') {
      setShowCheckoutSuccess(true)
      router.replace(`/dashboard/${workspaceId}/settings/billing`)
    }
  }, [searchParams, router, workspaceId])

  const fetchSubscription = useCallback((): Promise<SubscriptionSummary | null> => {
    if (workspaceId == null) return Promise.resolve(null)
    return api
      .get<{ subscription: SubscriptionSummary | null }>(`/workspaces/${workspaceId}/subscription`)
      .then((res) => {
        const sub = res.data.subscription ?? null
        setSubscription(sub)
        if (sub && sub.planName !== 'free') {
          refreshUser().catch(() => {})
          refreshUsage?.()
        }
        return sub
      })
      .catch(() => {
        setSubscription(null)
        return null
      })
  }, [workspaceId, refreshUser, refreshUsage])

  const fetchBillingHistory = useCallback((): Promise<BillingTransaction[]> => {
    if (workspaceId == null) return Promise.resolve([])
    return api
      .get<{ transactions: BillingTransaction[] }>(`/workspaces/${workspaceId}/billing-history`)
      .then((res) => {
        setBillingHistory(res.data.transactions ?? [])
        return res.data.transactions ?? []
      })
      .catch(() => {
        setBillingHistory([])
        return []
      })
  }, [workspaceId])

  useEffect(() => {
    if (workspaceId == null) return
    let cancelled = false
    setSubscriptionLoading(true)
    api
      .get<{ subscription: SubscriptionSummary | null }>(`/workspaces/${workspaceId}/subscription`)
      .then((res) => {
        if (!cancelled) {
          const sub = res.data.subscription ?? null
          setSubscription(sub)
          if (sub && sub.planName !== 'free') refreshUser().catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) setSubscription(null)
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, refreshUser])

  useEffect(() => {
    if (workspaceId == null) return
    let cancelled = false
    setBillingHistoryLoading(true)
    api
      .get<{ transactions: BillingTransaction[] }>(`/workspaces/${workspaceId}/billing-history`)
      .then((res) => {
        if (!cancelled) setBillingHistory(res.data.transactions ?? [])
      })
      .catch(() => {
        if (!cancelled) setBillingHistory([])
      })
      .finally(() => {
        if (!cancelled) setBillingHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  // After checkout success, refetch subscription and billing once webhooks have been processed
  useEffect(() => {
    if (!showCheckoutSuccess || workspaceId == null) return
    
    let retryCount = 0
    const maxRetries = 3
    
    const refreshWithRetry = async () => {
      try {
        console.log(`[Billing] Refreshing contexts after checkout (attempt ${retryCount + 1}/${maxRetries + 1})`)
        setRefreshingContexts(true)
        
        // Fetch subscription first to check if it's updated
        const sub = await fetchSubscription()
        await fetchBillingHistory()
        
        // If subscription is still free and we haven't exceeded retries, try again
        if ((!sub || sub.planName === 'free') && retryCount < maxRetries) {
          retryCount++
          console.log(`[Billing] Subscription still free, retrying in 2s (attempt ${retryCount + 1}/${maxRetries + 1})`)
          setTimeout(refreshWithRetry, 2000)
          return
        }
        
        // Refresh user context
        await refreshUser().catch(() => {})
        
        // Finally refresh usage/credits
        refreshUsage?.()
        
        // Trigger a custom event to notify other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('subscription-updated', { 
            detail: { workspaceId, subscription: sub } 
          }))
        }
        
        console.log('[Billing] All contexts refreshed after checkout success')
        setRefreshingContexts(false)
      } catch (e) {
        console.error('[Billing] Error refreshing contexts after checkout:', e)
        // Retry on error if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(refreshWithRetry, 2000)
        } else {
          setRefreshingContexts(false)
        }
      }
    }
    
    // Initial delay for webhook processing
    const t = setTimeout(refreshWithRetry, 3000)
    return () => clearTimeout(t)
  }, [showCheckoutSuccess, workspaceId, fetchSubscription, fetchBillingHistory, refreshUser, refreshUsage])

  const handleRefresh = useCallback(async () => {
    if (workspaceId == null) return
    setRefreshing(true)
    try {
      console.log('[Billing] Manual refresh triggered')
      
      // Refresh subscription and billing data
      const [sub, history] = await Promise.all([
        fetchSubscription(), 
        fetchBillingHistory()
      ])
      
      // Refresh user context
      await refreshUser().catch(() => {})
      
      // Refresh usage/credits
      refreshUsage?.()
      
      // Trigger a custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscription-updated', { 
          detail: { workspaceId, subscription: sub } 
        }))
      }
      
      console.log('[Billing] Manual refresh completed:', { subscription: sub, historyCount: history.length })
    } catch (e) {
      console.error('[Billing] Manual refresh failed:', e)
    } finally {
      setRefreshing(false)
    }
  }, [workspaceId, fetchSubscription, fetchBillingHistory, refreshUsage, refreshUser])

  const isOwner = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner'
  )
  const planName =
    subscription != null
      ? subscription.planDisplayName
      : currentWorkspace?.id === workspaceId
        ? currentWorkspace.plan
        : user?.workspaces?.find((w) => w.id === workspaceId)?.plan ?? 'free'
  const displayPlan = subscriptionLoading
    ? 'Loading...'
    : typeof planName === 'string'
      ? planName.charAt(0).toUpperCase() + planName.slice(1)
      : 'Free'
  const hasPaidSubscription = subscription != null && subscription.planName !== 'free'

  if (workspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Invalid workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage your plan, payment method, and billing history. Only the workspace owner can change billing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || subscriptionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {showCheckoutSuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>Payment successful. Your plan has been updated.</span>
              </div>
              {!refreshingContexts && (
                <div className="text-xs text-slate-600">
                  If you don't see updated permissions immediately, try{' '}
                  <button 
                    onClick={handleRefresh}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    refreshing
                  </button>{' '}
                  or reload the page.
                </div>
              )}
            </div>
          )}
          {refreshingContexts && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <RefreshCw className="h-5 w-5 shrink-0 text-blue-600 animate-spin" />
              <span>Updating your plan permissions and credits...</span>
            </div>
          )}
          {/* Current plan */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Current plan</h2>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--v2-primary)]/10 px-2.5 py-1 text-sm font-medium text-[var(--v2-primary)]">
                  {displayPlan}
                </span>
                <span className="text-sm text-slate-600">
                  {!hasPaidSubscription ? 'Free tier — upgrade for more' : subscription?.status === 'active' ? 'Active subscription' : subscription?.status === 'canceled' ? 'Cancels at period end' : subscription?.status ?? 'Active subscription'}
                </span>
              </div>
              {isOwner && (
                <Link
                  href={`/dashboard/${workspaceId}/settings/plans`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Change plan
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              )}
            </div>
            {hasPaidSubscription && subscription && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Billing: {subscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                {subscription.currentPeriodEnd && (
                  <span>
                    {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {!isOwner && (
              <p className="mt-2 text-xs text-slate-500">Only the workspace owner can change the plan.</p>
            )}
          </section>

          {/* Payment method */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CreditCard className="h-4 w-4 text-slate-500" />
              Payment method
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add or update the card used for this workspace. Billing integration coming soon.
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">No payment method on file</p>
              <p className="mt-0.5 text-xs text-slate-500">Required when you upgrade from Free</p>
              {isOwner && (
                <button
                  type="button"
                  disabled
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 shadow-sm"
                >
                  Add payment method (coming soon)
                </button>
              )}
            </div>
          </section>

          {/* Billing history */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-slate-500" />
              Billing history
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Payment history for this workspace. Paddle also sends receipts by email.
            </p>
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/30 overflow-hidden">
              {billingHistoryLoading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading billing history…
                </div>
              ) : billingHistory.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="px-4 py-2.5 text-left font-medium text-slate-700">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-700">Amount</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-slate-600">
                          {new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {t.amountCents != null && t.currencyCode
                            ? new Intl.NumberFormat(undefined, {
                                style: 'currency',
                                currency: t.currencyCode,
                              }).format(t.amountCents / 100)
                            : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="capitalize text-slate-600">{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-center">
                  {hasPaidSubscription ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-green-500" />
                        No payments recorded yet. Invoices are sent to your email by Paddle.
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        After the next successful charge, transactions will appear here.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-green-500" />
                        You’re on the Free plan — no payments yet.
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        When you upgrade, payment history will appear here.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
