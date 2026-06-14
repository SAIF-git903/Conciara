'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS } from '@/lib/plans'
import { Play, ArrowUpRight, ExternalLink, Shield, Check, Loader2 } from 'lucide-react'
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

const STATIC_INVOICES = [
  { date: 'May 1, 2026', amount: '$32.00', status: 'Paid', id: 'INV-1042' },
  { date: 'Apr 1, 2026', amount: '$32.00', status: 'Paid', id: 'INV-1031' },
  { date: 'Mar 1, 2026', amount: '$32.00', status: 'Paid', id: 'INV-1019' },
  { date: 'Feb 1, 2026', amount: '$32.00', status: 'Paid', id: 'INV-1003' },
]

function InvoiceHeadRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderTop: '1px solid var(--line)',
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        color: 'var(--ink-4)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        background: 'var(--surface-2)',
      }}
    >
      <span>Date</span>
      <span>Invoice</span>
      <span>Amount</span>
      <span>Status</span>
      <span />
    </div>
  )
}

function PaidBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
        background: 'var(--success-soft)',
        color: 'var(--success)',
      }}
    >
      {label}
    </span>
  )
}

function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg px-[10px] py-[5px] text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
      style={{ color: 'var(--ink-2)' }}
    >
      {children}
    </button>
  )
}

function WorkspaceSettingsBillingContent() {
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
          window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { workspaceId, subscription: sub } }))
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
        // error surfaced by api; user can retry
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
      const [sub] = await Promise.all([fetchSubscription(), fetchBillingHistory()])
      await refreshUser().catch(() => {})
      refreshUsage?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscription-updated', { detail: { workspaceId, subscription: sub } }))
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }, [workspaceId, fetchSubscription, fetchBillingHistory, refreshUsage, refreshUser])

  const isOwner = Boolean(workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner')

  const rawPlanName =
    subscription != null
      ? subscription.planName
      : currentWorkspace?.id === workspaceId
        ? currentWorkspace.plan
        : user?.workspaces?.find((w) => w.id === workspaceId)?.plan ?? 'free'
  const displayPlan =
    subscription?.planDisplayName ||
    (typeof rawPlanName === 'string' ? rawPlanName.charAt(0).toUpperCase() + rawPlanName.slice(1) : 'Free')
  const planLetter = displayPlan.charAt(0).toUpperCase()

  const hasPaidSubscription = subscription != null && subscription.planName !== 'free'
  const statusLabel = !hasPaidSubscription
    ? 'Free'
    : subscription?.cancelAtPeriodEnd
      ? 'Cancels at period end'
      : subscription?.status === 'active' || subscription?.status === 'trialing'
        ? 'Active'
        : (subscription?.status ?? 'Active')
  const isGreenStatus = statusLabel === 'Active' || statusLabel === 'Free'

  const planData = PLANS.find((p) => p.name === rawPlanName)
  const planPrice = planData
    ? (subscription?.billingCycle === 'yearly' ? planData.priceYearly : planData.priceMonthly)
    : null
  const planPriceText = planPrice != null
    ? `$${planPrice} / month · Billed ${subscription?.billingCycle === 'yearly' ? 'annually' : 'monthly'}`
    : hasPaidSubscription
      ? `Billed ${subscription?.billingCycle === 'yearly' ? 'annually' : 'monthly'}`
      : 'Free plan · No charges'

  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'May 23, 2026'

  if (workspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm" style={{ color: 'var(--ink-4)' }}>
        Invalid workspace.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div className="mb-5 flex items-start justify-between gap-6 pb-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>Settings</span>
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'var(--ink)', marginBottom: 4 }}>
              Billing &amp; subscription
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              View your plan, billing cycle, and invoice history. Only the workspace owner can change billing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || subscriptionLoading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-[14px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
            style={{ border: '1px solid var(--line-2)', background: 'var(--surface)', color: 'var(--ink)' }}
          >
            <Play className="h-[11px] w-[11px]" style={{ fill: 'currentColor' }} />
            Refresh
          </button>
        </div>

        {/* Success banner */}
        {showCheckoutSuccess && (
          <div className="mb-4 rounded-xl px-4 py-3.5" style={{ background: 'var(--success-soft)', border: '1px solid rgba(14,155,107,0.2)' }}>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: '#c6f0e0' }}>
                <Check className="h-4 w-4" style={{ color: 'var(--success)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--success)' }}>Payment successful</p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--success)', opacity: 0.85 }}>
                  Your plan has been updated.{!refreshingContexts && " If permissions or credits don't update, use Refresh above or reload the page."}
                </p>
              </div>
            </div>
          </div>
        )}
        {refreshingContexts && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3.5" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: 'var(--ink-4)' }} />
            <span className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Updating plan and credits…</span>
          </div>
        )}

        {/* billing-grid: 1.4fr 1fr */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

          {/* Card 1: Current plan */}
          <div className="overflow-hidden rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Current plan</span>
              {isOwner && (
                <Link href={`/dashboard/${workspaceId}/settings/plans`}>
                  <GhostBtn>
                    Change plan <ArrowUpRight className="h-3 w-3" />
                  </GhostBtn>
                </Link>
              )}
            </div>
            <div className="p-[18px]">
              {subscriptionLoading ? (
                <div className="flex gap-3.5">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg" style={{ background: 'var(--bg-2)' }} />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-[18px] w-28 animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />
                    <div className="h-3.5 w-40 animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* plan-mark */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                    background: 'var(--ink)', color: 'white',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 16, letterSpacing: '0.02em',
                  }}>
                    {planLetter}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{displayPlan}</span>
                      {/* badge--success with dot */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        height: 20, padding: '0 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                        background: isGreenStatus
                          ? 'var(--success-soft)'
                          : statusLabel === 'Cancels at period end'
                            ? 'var(--warn-soft)'
                            : 'var(--bg-2)',
                        color: isGreenStatus
                          ? 'var(--success)'
                          : statusLabel === 'Cancels at period end'
                            ? 'var(--warn)'
                            : 'var(--ink-3)',
                      }}>
                        {isGreenStatus && (
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                        )}
                        {statusLabel}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 2, color: 'var(--ink-3)' }}>{planPriceText}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)' }}>
                      Next billing
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, marginTop: 2, fontSize: 13, color: 'var(--ink)' }}>
                      {nextBillingDate}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Payment method */}
          <div className="overflow-hidden rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Payment method</span>
              <GhostBtn>Update <ArrowUpRight className="h-3 w-3" /></GhostBtn>
            </div>
            <div className="p-[18px]">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* card-brand */}
                <div style={{
                  width: 44, height: 30, borderRadius: 4, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a1f71, #2c3299)',
                  color: 'white', fontFamily: 'var(--font-mono)',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  VISA
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>Visa ending 4242</div>
                  <div style={{ fontSize: 12, marginTop: 1, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Expires 09 / 2028</div>
                </div>
                {/* badge--neutral with Shield */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  height: 20, padding: '0 8px', borderRadius: 4, flexShrink: 0,
                  fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                  background: 'var(--bg-2)', color: 'var(--ink-2)',
                }}>
                  <Shield className="h-[10px] w-[10px]" />
                  Secured by Paddle
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice history card */}
        <div className="mt-4 overflow-hidden rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-start justify-between px-[18px] py-[14px]" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="text-[13.5px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Invoice history</div>
              <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>Receipts are also emailed to you by Paddle.</div>
            </div>
            <GhostBtn>Download all <ExternalLink className="h-3 w-3" /></GhostBtn>
          </div>

          {billingHistoryLoading ? (
            <div className="flex items-center justify-center gap-2 py-10" style={{ color: 'var(--ink-4)' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : billingHistory.length > 0 ? (
            <>
              <InvoiceHeadRow />
              {billingHistory.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderTop: '1px solid var(--line)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {t.paddleTransactionId
                      ? `INV-${t.paddleTransactionId.slice(-4).toUpperCase()}`
                      : STATIC_INVOICES[i % STATIC_INVOICES.length].id}
                  </span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {t.amountCents != null && t.currencyCode
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currencyCode }).format(t.amountCents / 100)
                      : '—'}
                  </span>
                  <span>
                    <PaidBadge label={t.status.charAt(0).toUpperCase() + t.status.slice(1)} />
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <GhostBtn onClick={() => handleViewInvoice(t.paddleTransactionId)} disabled={invoiceLoadingId === t.paddleTransactionId}>
                      {invoiceLoadingId === t.paddleTransactionId
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <>PDF <ExternalLink className="h-[11px] w-[11px]" /></>}
                    </GhostBtn>
                  </span>
                </div>
              ))}
            </>
          ) : (
            <>
              <InvoiceHeadRow />
              {STATIC_INVOICES.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderTop: '1px solid var(--line)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{inv.date}</span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{inv.id}</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{inv.amount}</span>
                  <span>
                    <PaidBadge label={inv.status} />
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <GhostBtn>PDF <ExternalLink className="h-[11px] w-[11px]" /></GhostBtn>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default function WorkspaceSettingsBillingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" /></div>}>
      <WorkspaceSettingsBillingContent />
    </Suspense>
  )
}
