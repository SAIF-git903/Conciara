'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS } from '@/lib/plans'
import {
  AlertTriangle, ArrowUpRight, Check, CreditCard, ExternalLink,
  Loader2, Play, RefreshCw, Shield, XCircle,
} from 'lucide-react'
import api from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────
type SubscriptionSummary = {
  id: string; planName: string; planDisplayName: string; status: string
  billingCycle: string; currentPeriodStart: string; currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

type PaymentMethod = {
  type: string; brand: string | null; lastFour: string | null
  expiryMonth: number | null; expiryYear: number | null
}

type BillingDetails = {
  paymentMethod: PaymentMethod | null
  updatePaymentMethodUrl: string | null
  cancelUrl: string | null
}

type BillingTransaction = {
  id: string; paddleTransactionId: string
  amountCents: number | null; currencyCode: string | null
  status: string; createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function brandLabel(brand: string | null): string {
  if (!brand) return 'Card'
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

function brandGradient(brand: string | null): string {
  switch (brand?.toLowerCase()) {
    case 'visa':       return 'linear-gradient(135deg,#1a1f71,#2c3299)'
    case 'mastercard': return 'linear-gradient(135deg,#eb001b,#f79e1b)'
    case 'amex':       return 'linear-gradient(135deg,#0070ba,#1b94c3)'
    default:           return 'linear-gradient(135deg,#374151,#6b7280)'
  }
}

// ── Sub-components ────────────────────────────────────────────
function GhostBtn({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg px-[10px] py-[5px] text-[12.5px] font-medium transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
      style={{ color: danger ? 'var(--danger)' : 'var(--ink-2)' }}>
      {children}
    </button>
  )
}

function StatusBadge({ label }: { label: string }) {
  const isGreen  = label === 'Active' || label === 'Free'
  const isWarn   = label.includes('Cancels')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: 20, padding: '0 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
      background: isGreen ? 'var(--success-soft)' : isWarn ? 'var(--warn-soft)' : 'var(--bg-2)',
      color: isGreen ? 'var(--success)' : isWarn ? 'var(--warn)' : 'var(--ink-3)',
    }}>
      {isGreen && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />}
      {label}
    </span>
  )
}

function PaidBadge({ label }: { label: string }) {
  const isSuccess = label.toLowerCase() === 'completed' || label.toLowerCase() === 'paid'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
      background: isSuccess ? 'var(--success-soft)' : 'var(--bg-2)',
      color: isSuccess ? 'var(--success)' : 'var(--ink-3)',
    }}>
      {isSuccess ? 'Paid' : label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}

// ── Cancel confirmation modal ──────────────────────────────────
function CancelModal({ planName, periodEnd, cancelUrl, onClose }: {
  planName: string; periodEnd: string; cancelUrl: string | null; onClose: () => void
}) {
  const handleCancel = () => {
    if (cancelUrl) {
      window.open(cancelUrl, '_blank', 'noopener,noreferrer')
    }
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 28, maxWidth: 440, width: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: 'var(--danger)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>Cancel {planName} plan?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
              Your subscription will remain active until <strong style={{ color: 'var(--ink)' }}>{periodEnd}</strong>.
              After that, you&apos;ll be moved to the Free plan and lose access to paid features.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px', background: 'var(--bg-2)', borderRadius: 8, marginBottom: 20 }}>
          {['Access to premium features removed', 'Message credits reduced to Free tier', 'Data and agents remain intact'].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
              <XCircle style={{ width: 13, height: 13, color: 'var(--danger)', flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn--ghost btn--sm">Keep plan</button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn--sm"
            style={{ background: 'var(--danger)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {cancelUrl ? <><ExternalLink style={{ width: 12, height: 12 }} /> Cancel on Paddle</> : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
function WorkspaceSettingsBillingContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace, refreshUsage } = useDashboard()
  const { user, refreshUser } = useAuth()

  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [refreshingContexts, setRefreshingContexts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const [subscription, setSubscription]           = useState<SubscriptionSummary | null | undefined>(undefined)
  const [billingDetails, setBillingDetails]       = useState<BillingDetails | null>(null)
  const [billingHistory, setBillingHistory]       = useState<BillingTransaction[]>([])
  const [subLoading, setSubLoading]               = useState(true)
  const [detailsLoading, setDetailsLoading]       = useState(true)
  const [historyLoading, setHistoryLoading]       = useState(true)
  const [invoiceLoadingId, setInvoiceLoadingId]   = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('checkout_success') === '1') {
      setShowCheckoutSuccess(true)
      router.replace(`/dashboard/${workspaceId}/settings/billing`)
    }
  }, [searchParams, router, workspaceId])

  const fetchSubscription = useCallback(async (): Promise<SubscriptionSummary | null> => {
    if (workspaceId == null) return null
    try {
      const { data } = await api.get<{ subscription: SubscriptionSummary | null }>(`/workspaces/${workspaceId}/subscription`)
      const sub = data.subscription ?? null
      setSubscription(sub)
      return sub
    } catch { setSubscription(null); return null }
  }, [workspaceId])

  const fetchBillingDetails = useCallback(async () => {
    if (workspaceId == null) return
    try {
      const { data } = await api.get<BillingDetails>(`/workspaces/${workspaceId}/billing-details`)
      setBillingDetails(data)
    } catch { setBillingDetails(null) }
    finally { setDetailsLoading(false) }
  }, [workspaceId])

  const fetchBillingHistory = useCallback(async () => {
    if (workspaceId == null) return
    try {
      const { data } = await api.get<{ transactions: BillingTransaction[] }>(`/workspaces/${workspaceId}/billing-history`)
      setBillingHistory(data.transactions ?? [])
    } catch { setBillingHistory([]) }
    finally { setHistoryLoading(false) }
  }, [workspaceId])

  useEffect(() => {
    if (workspaceId == null) { setSubLoading(false); return }
    setSubLoading(true)
    fetchSubscription().then(sub => {
      if (sub && sub.planName !== 'free') refreshUser().catch(() => {})
    }).finally(() => setSubLoading(false))
  }, [workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBillingDetails() }, [fetchBillingDetails])
  useEffect(() => { fetchBillingHistory() }, [fetchBillingHistory])

  useEffect(() => {
    if (!showCheckoutSuccess || workspaceId == null) return
    let retries = 0
    const retry = async () => {
      try {
        setRefreshingContexts(true)
        const sub = await fetchSubscription()
        await fetchBillingHistory()
        await fetchBillingDetails()
        if ((!sub || sub.planName === 'free') && retries < 5) { retries++; setTimeout(retry, 2000); return }
        await refreshUser().catch(() => {})
        refreshUsage?.()
      } finally { if (retries >= 5) setRefreshingContexts(false) }
    }
    const t = setTimeout(retry, 3000)
    return () => clearTimeout(t)
  }, [showCheckoutSuccess, workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    if (workspaceId == null) return
    setRefreshing(true)
    await Promise.all([fetchSubscription(), fetchBillingHistory(), fetchBillingDetails()])
    await refreshUser().catch(() => {})
    refreshUsage?.()
    setRefreshing(false)
  }

  const handleViewInvoice = async (paddleTransactionId: string) => {
    if (workspaceId == null) return
    setInvoiceLoadingId(paddleTransactionId)
    try {
      const { data } = await api.get<{ url: string }>(`/workspaces/${workspaceId}/invoice/${encodeURIComponent(paddleTransactionId)}`)
      if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    } finally { setInvoiceLoadingId(null) }
  }

  const isOwner = Boolean(workspaceId && user?.workspaces?.find(w => w.id === workspaceId)?.role === 'owner')

  const rawPlanName =
    subscription != null ? subscription.planName
      : currentWorkspace?.id === workspaceId ? currentWorkspace.plan
        : user?.workspaces?.find(w => w.id === workspaceId)?.plan ?? 'free'

  const displayPlan = subscription?.planDisplayName ||
    (typeof rawPlanName === 'string' ? rawPlanName.charAt(0).toUpperCase() + rawPlanName.slice(1) : 'Free')

  const hasPaidSub = subscription != null && subscription.planName !== 'free'
  const statusLabel = !hasPaidSub ? 'Free'
    : subscription?.cancelAtPeriodEnd ? `Cancels ${fmtDate(subscription.currentPeriodEnd)}`
      : subscription?.status === 'active' || subscription?.status === 'trialing' ? 'Active'
        : (subscription?.status ?? 'Active')

  const planData = PLANS.find(p => p.name === rawPlanName)
  const planPrice = planData
    ? (subscription?.billingCycle === 'yearly' ? planData.priceYearly : planData.priceMonthly)
    : null
  const planPriceText = planPrice != null
    ? `$${planPrice} / month · Billed ${subscription?.billingCycle === 'yearly' ? 'annually' : 'monthly'}`
    : hasPaidSub ? `Billed ${subscription?.billingCycle === 'yearly' ? 'annually' : 'monthly'}`
      : 'Free plan · No charges'

  const nextBillingDate = subscription?.currentPeriodEnd ? fmtDate(subscription.currentPeriodEnd) : '—'

  const pm = billingDetails?.paymentMethod
  const updateUrl = billingDetails?.updatePaymentMethodUrl

  if (workspaceId == null) {
    return <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm" style={{ color: 'var(--ink-4)' }}>Invalid workspace.</div>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      {showCancelModal && (
        <CancelModal
          planName={displayPlan}
          periodEnd={nextBillingDate}
          cancelUrl={billingDetails?.cancelUrl ?? null}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)', marginBottom: 4 }}>Settings</span>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '0 0 4px' }}>Billing &amp; subscription</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', maxWidth: '60ch', margin: 0 }}>
              View your plan, payment method, and invoice history. Only the workspace owner can change billing.
            </p>
          </div>
          <button type="button" onClick={() => void handleRefresh()} disabled={refreshing || subLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer' }}
            className="hover:bg-[var(--bg-2)] disabled:opacity-50">
            <RefreshCw style={{ width: 13, height: 13 }} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Success banner */}
        {showCheckoutSuccess && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'var(--success-soft)', border: '1px solid rgba(14,155,107,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#c6f0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check style={{ width: 16, height: 16, color: 'var(--success)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', margin: 0 }}>Payment successful</p>
              <p style={{ fontSize: 12.5, color: 'var(--success)', opacity: 0.85, margin: '2px 0 0' }}>
                Your plan has been updated.{!refreshingContexts && " If credits don't update, use Refresh above."}
              </p>
            </div>
          </div>
        )}
        {refreshingContexts && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader2 style={{ width: 14, height: 14, color: 'var(--ink-4)', flexShrink: 0 }} className="animate-spin" />
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Updating plan and credits…</span>
          </div>
        )}

        {/* Top grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>

          {/* Card 1: Current plan */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Current plan</span>
              {isOwner && (
                <Link href={`/dashboard/${workspaceId}/settings/plans`}>
                  <GhostBtn>Change plan <ArrowUpRight style={{ width: 12, height: 12 }} /></GhostBtn>
                </Link>
              )}
            </div>
            <div style={{ padding: 18 }}>
              {subLoading ? (
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-2)', flexShrink: 0 }} className="animate-pulse" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 18, width: 120, borderRadius: 4, background: 'var(--bg-2)' }} className="animate-pulse" />
                    <div style={{ height: 14, width: 160, borderRadius: 4, background: 'var(--bg-2)' }} className="animate-pulse" />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: 'var(--ink)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                    {displayPlan.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{displayPlan}</span>
                      <StatusBadge label={statusLabel} />
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 2, color: 'var(--ink-3)' }}>{planPriceText}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)' }}>
                      {subscription?.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, marginTop: 2, fontSize: 13, color: 'var(--ink)' }}>
                      {nextBillingDate}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Cancel link */}
            {hasPaidSub && !subscription?.cancelAtPeriodEnd && isOwner && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '10px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                <GhostBtn danger onClick={() => setShowCancelModal(true)}>
                  Cancel plan
                </GhostBtn>
              </div>
            )}
          </div>

          {/* Card 2: Payment method */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Payment method</span>
              {updateUrl && isOwner && (
                <GhostBtn onClick={() => window.open(updateUrl, '_blank', 'noopener,noreferrer')}>
                  Update <ArrowUpRight style={{ width: 12, height: 12 }} />
                </GhostBtn>
              )}
            </div>
            <div style={{ padding: 18 }}>
              {detailsLoading ? (
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 44, height: 30, borderRadius: 4, background: 'var(--bg-2)', flexShrink: 0 }} className="animate-pulse" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ height: 16, width: 140, borderRadius: 4, background: 'var(--bg-2)' }} className="animate-pulse" />
                    <div style={{ height: 13, width: 100, borderRadius: 4, background: 'var(--bg-2)' }} className="animate-pulse" />
                  </div>
                </div>
              ) : pm ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 30, borderRadius: 4, flexShrink: 0, background: brandGradient(pm.brand), color: 'white', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(pm.brand ?? 'CARD').toUpperCase().slice(0, 4)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink)' }}>
                      {brandLabel(pm.brand)} {pm.lastFour ? `ending ${pm.lastFour}` : ''}
                    </div>
                    {pm.expiryMonth && pm.expiryYear && (
                      <div style={{ fontSize: 12, marginTop: 1, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                        Expires {String(pm.expiryMonth).padStart(2, '0')} / {pm.expiryYear}
                      </div>
                    )}
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 8px', borderRadius: 4, flexShrink: 0, fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
                    <Shield style={{ width: 10, height: 10 }} /> Paddle
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 30, borderRadius: 4, flexShrink: 0, background: 'var(--bg-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard style={{ width: 16, height: 16, color: 'var(--ink-4)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--ink-3)' }}>No payment method on file</div>
                    {updateUrl && (
                      <button type="button" onClick={() => window.open(updateUrl, '_blank', 'noopener,noreferrer')}
                        style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, textDecoration: 'underline' }}>
                        Add payment method
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice history */}
        <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Invoice history</div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--ink-3)' }}>Receipts are also emailed to you by Paddle.</div>
            </div>
            {billingHistory.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--ink-4)', paddingTop: 2 }}>
                {billingHistory.length} invoice{billingHistory.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {historyLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: 'var(--ink-4)' }}>
              <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : billingHistory.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Play style={{ width: 24, height: 24, color: 'var(--ink-4)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-3)', margin: 0 }}>No invoices yet</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: '4px 0 0' }}>Your invoices will appear here after your first payment.</p>
            </div>
          ) : (
            <>
              {/* Head row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr', alignItems: 'center', gap: 12, padding: '9px 18px', borderTop: '1px solid var(--line)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontWeight: 500, background: 'var(--bg-2)' }}>
                <span>Date</span><span>Invoice</span><span>Amount</span><span>Status</span><span />
              </div>
              {billingHistory.map(t => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.6fr', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                    {fmtDate(t.createdAt)}
                  </span>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                    {t.paddleTransactionId ? `#${t.paddleTransactionId.slice(-8).toUpperCase()}` : '—'}
                  </span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {t.amountCents != null && t.currencyCode
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currencyCode }).format(t.amountCents / 100)
                      : '—'}
                  </span>
                  <span><PaidBadge label={t.status} /></span>
                  <span style={{ textAlign: 'right' }}>
                    <GhostBtn onClick={() => void handleViewInvoice(t.paddleTransactionId)} disabled={invoiceLoadingId === t.paddleTransactionId}>
                      {invoiceLoadingId === t.paddleTransactionId
                        ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                        : <>PDF <ExternalLink style={{ width: 11, height: 11 }} /></>}
                    </GhostBtn>
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
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
      <WorkspaceSettingsBillingContent />
    </Suspense>
  )
}
