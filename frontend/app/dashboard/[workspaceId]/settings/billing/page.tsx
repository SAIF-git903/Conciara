'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { CreditCard, FileText, Check, ExternalLink, RefreshCw, Shield, Calendar, Receipt } from 'lucide-react'
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
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null)

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
    const maxRetries = 5

    const refreshWithRetry = async () => {
      try {
        setRefreshingContexts(true)
        const sub = await fetchSubscription()
        await fetchBillingHistory()

        if ((!sub || sub.planName === 'free') && retryCount < maxRetries) {
          retryCount++
          setTimeout(refreshWithRetry, 2000)
          return
        }

        await refreshUser().catch(() => {})
        refreshUsage?.()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('subscription-updated', { detail: { workspaceId, subscription: sub } })
          )
        }
        setRefreshingContexts(false)
      } catch {
        if (retryCount < maxRetries) {
          retryCount++
          setTimeout(refreshWithRetry, 2000)
        } else {
          setRefreshingContexts(false)
        }
      }
    }

    const t = setTimeout(refreshWithRetry, 3000)
    return () => clearTimeout(t)
  }, [showCheckoutSuccess, workspaceId, fetchSubscription, fetchBillingHistory, refreshUser, refreshUsage])

  const handleViewInvoice = useCallback(
    async (paddleTransactionId: string) => {
      if (workspaceId == null) return
      setInvoiceLoadingId(paddleTransactionId)
      try {
        const res = await api.get<{ url: string }>(
          `/workspaces/${workspaceId}/invoice/${encodeURIComponent(paddleTransactionId)}`
        )
        const url = res.data?.url
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      } catch {
        // error already surfaced by api / user can retry
      } finally {
        setInvoiceLoadingId(null)
      }
    },
    [workspaceId]
  )

  const handleRefresh = useCallback(async () => {
    if (workspaceId == null) return
    setRefreshing(true)
    try {
      // Refresh subscription and billing data
      const [sub] = await Promise.all([
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
    } catch {
      // ignore
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
  const statusLabel =
    !hasPaidSubscription
      ? 'Free'
      : subscription?.cancelAtPeriodEnd
        ? 'Cancels at period end'
        : subscription?.status === 'active' || subscription?.status === 'trialing'
          ? 'Active'
          : (subscription?.status ?? 'Active')

  if (workspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Invalid workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Billing & subscription</h1>
              <p className="mt-1 text-sm text-slate-500">
                View your plan, billing cycle, and invoice history. Only the workspace owner can change billing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || subscriptionLoading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {showCheckoutSuccess && (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3.5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-emerald-900">Payment successful</p>
                  <p className="mt-0.5 text-sm text-emerald-700">
                    Your plan has been updated. {!refreshingContexts && "If permissions or credits don't update, use Refresh above or reload the page."}
                  </p>
                </div>
              </div>
            </div>
          )}
          {refreshingContexts && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
              <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-slate-500" />
              <span className="text-sm text-slate-600">Updating plan and credits…</span>
            </div>
          )}

          {/* Current plan */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Current plan</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
                    {displayPlan}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusLabel === 'Active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : statusLabel === 'Cancels at period end'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
                {isOwner && (
                  <Link
                    href={`/dashboard/${workspaceId}/settings/plans`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                  >
                    Change plan
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </Link>
                )}
              </div>
              {hasPaidSubscription && subscription && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {subscription.billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                  </span>
                  {subscription.currentPeriodEnd && (
                    <span className="text-sm text-slate-600">
                      {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}{' '}
                      <span className="font-medium text-slate-700">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </span>
                    </span>
                  )}
                </div>
              )}
              {!isOwner && (
                <p className="mt-3 text-xs text-slate-500">Only the workspace owner can change the plan.</p>
              )}
            </div>
          </section>

          {/* Payment */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CreditCard className="h-4 w-4 text-slate-500" />
                Payment
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-4 rounded-lg border border-slate-100 bg-slate-50/30 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200/80">
                  <Shield className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Secure checkout</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Payment is collected securely by our provider (Paddle) when you upgrade. Invoices and receipts are sent to your email.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Billing history */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Receipt className="h-4 w-4 text-slate-500" />
                Billing history
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Invoices are also sent to your email by Paddle.
              </p>
            </div>
            <div className="min-h-[200px]">
              {billingHistoryLoading ? (
                <div className="p-6">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 rounded-lg bg-slate-50 px-4 py-3">
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-14 animate-pulse rounded bg-slate-200" />
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingHistory.map((t) => (
                        <tr key={t.id} className="transition hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 text-slate-700">
                            {new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {t.amountCents != null && t.currencyCode
                              ? new Intl.NumberFormat(undefined, {
                                  style: 'currency',
                                  currency: t.currencyCode,
                                }).format(t.amountCents / 100)
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
                              {t.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(t.paddleTransactionId)}
                              disabled={invoiceLoadingId === t.paddleTransactionId}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50"
                            >
                              {invoiceLoadingId === t.paddleTransactionId ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  View
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      {hasPaidSubscription ? 'No invoices yet' : 'No payment history'}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      {hasPaidSubscription
                        ? 'After your next charge, transactions will appear here. Receipts are also sent to your email.'
                        : 'When you upgrade, your billing history will appear here.'}
                    </p>
                  </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
