'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS } from '@/lib/plans'
import { openPaddleCheckout, isPaddleConfigured } from '@/lib/paddle'
import api from '@/lib/api'
import { Check, ArrowRight, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type BillingInterval = 'monthly' | 'yearly'

const PLAN_TAGLINES: Record<string, string> = {
  hobby: 'For builders trying things out.',
  standard: 'For small teams in production.',
  pro: 'For growing teams with compliance needs.',
}

const PLAN_FEATURES: Record<string, string[]> = {
  hobby: [
    '500 message credits / month',
    '1 AI agent',
    '2 team members',
    '10 MB training data per agent',
    'Community support',
  ],
  standard: [
    '4,000 message credits / month',
    '1 AI agent',
    '3 team members',
    '20 MB training data per agent',
    'API access',
    'Priority email support',
  ],
  pro: [
    '15,000 message credits / month',
    '1 AI agent',
    '5 team members',
    '40 MB training data per agent',
    'API access',
    'Audit logs & SSO',
    'Dedicated support',
  ],
}

function PlanTick() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
      background: 'var(--success-soft)', color: 'var(--success)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Check className="h-[9px] w-[9px]" strokeWidth={2.5} />
    </span>
  )
}

export default function WorkspaceSettingsPlansPage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const { user } = useAuth()
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] = useState<BillingInterval | null>(null)

  useEffect(() => {
    if (workspaceId == null) return
    api
      .get<{ subscription: { billingCycle: string } | null }>(`/workspaces/${workspaceId}/subscription`)
      .then((res) => {
        const cycle = res.data.subscription?.billingCycle
        if (cycle === 'monthly' || cycle === 'yearly') setSubscriptionBillingCycle(cycle)
      })
      .catch(() => {})
  }, [workspaceId])

  const isOwner = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner'
  )

  const currentPlan = currentWorkspace?.plan || 'free'
  const paidPlans = PLANS.filter((p) => p.name !== 'free')

  const handleUpgrade = useCallback(
    async (plan: (typeof PLANS)[number]) => {
      if (!workspaceId) return
      const priceId = interval === 'monthly' ? plan.paddlePriceIdMonthly : plan.paddlePriceIdYearly
      if (!priceId) return
      setCheckoutLoading(plan.id)
      try {
        await openPaddleCheckout(priceId, workspaceId)
      } finally {
        setCheckoutLoading(null)
      }
    },
    [interval, workspaceId]
  )

  if (workspaceId == null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm" style={{ color: 'var(--ink-4)' }}>
        Invalid workspace.
      </div>
    )
  }

  // +1 → annual (lower price) slides down; -1 → monthly (higher price) slides up
  const priceDir = interval === 'yearly' ? 1 : -1

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-6 pb-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-4)' }}>Settings</span>
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em]" style={{ color: 'var(--ink)', marginBottom: 4 }}>
              Plans &amp; pricing
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              Pick the plan that fits this workspace. You can switch any time — we&apos;ll prorate.
              {!isOwner && ' Only the workspace owner can change plans.'}
            </p>
          </div>

          {/* Billing toggle — spring-animated sliding pill */}
          <div style={{
            display: 'inline-flex', padding: 3, flexShrink: 0,
            border: '1px solid var(--line-2)', borderRadius: 999,
            background: 'var(--surface)',
          }}>
            {(['monthly', 'yearly'] as const).map((val) => {
              const isActive = interval === val
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInterval(val)}
                  style={{
                    position: 'relative', height: 28, padding: '0 14px', borderRadius: 999,
                    fontSize: 12.5, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    color: isActive ? 'white' : 'var(--ink-3)',
                    transition: 'color .2s ease',
                  }}
                >
                  {isActive && (
                    <motion.span
                      layoutId="billing-pill"
                      style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--ink)' }}
                      transition={{ type: 'tween', ease: [0.35, 0, 0.25, 1], duration: 0.22 }}
                    />
                  )}
                  <span style={{ position: 'relative' }}>
                    {val === 'monthly' ? 'Monthly' : 'Annual'}
                  </span>
                  {val === 'yearly' && (
                    <span style={{
                      position: 'relative', fontSize: 10.5, fontWeight: 500,
                      fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4,
                      background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--success-soft)',
                      color: isActive ? 'inherit' : 'var(--success)',
                      transition: 'background .2s ease, color .2s ease',
                    }}>
                      Save 20%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Plans grid — extra top padding for floating flags */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 12 }}>
          {paidPlans.map((plan) => {
            const displayPrice = interval === 'monthly'
              ? plan.priceMonthly
              : Math.round(plan.priceYearly / 12)
            const isCurrentPlan =
              plan.name === currentPlan &&
              (currentPlan === 'free' || subscriptionBillingCycle === interval)
            const isRecommended = plan.name === 'standard'
            const features = PLAN_FEATURES[plan.name] ?? []
            const tagline = PLAN_TAGLINES[plan.name] ?? ''

            return (
              <article
                key={plan.id}
                style={{
                  position: 'relative',
                  background: 'var(--surface)',
                  border: isRecommended
                    ? '1px solid var(--ink)'
                    : isCurrentPlan
                      ? '1px solid var(--line-strong)'
                      : '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: '22px 22px 18px',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: isRecommended
                    ? '0 1px 0 rgba(0,0,0,0.04), 0 16px 30px -22px rgba(0,0,0,0.18)'
                    : undefined,
                }}
              >
                {/* Floating pill flag */}
                {isCurrentPlan && (
                  <span style={{
                    position: 'absolute', top: -10, left: 22,
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.01em',
                    padding: '3px 10px', borderRadius: 999,
                    background: 'var(--accent)', color: 'white',
                  }}>
                    Current plan
                  </span>
                )}
                {!isCurrentPlan && isRecommended && (
                  <span style={{
                    position: 'absolute', top: -10, left: 22,
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.01em',
                    padding: '3px 10px', borderRadius: 999,
                    background: 'var(--ink)', color: 'white',
                  }}>
                    Recommended
                  </span>
                )}

                {/* Plan head */}
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                    {plan.displayName}
                  </h3>
                  <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                    {tagline}
                  </p>
                </div>

                {/* Price */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap',
                  paddingBottom: 16, borderBottom: '1px dashed var(--line)', marginBottom: 16,
                }}>
                  <span style={{ fontSize: 18, color: 'var(--ink-3)', fontWeight: 500 }}>$</span>
                  <div className="relative inline-block overflow-hidden" style={{ minWidth: '2ch' }}>
                    <span className="invisible select-none tabular-nums" style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }} aria-hidden>
                      {displayPrice}
                    </span>
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={interval}
                        initial={{ y: `${priceDir * 105}%` }}
                        animate={{ y: 0 }}
                        exit={{ y: `${priceDir * -105}%` }}
                        transition={{ duration: 0.32, ease: [0.33, 1, 0.68, 1] }}
                        className="absolute left-0 top-0 tabular-nums"
                        style={{ fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--ink)' }}
                      >
                        {displayPrice}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)', marginLeft: 4 }}>
                    / month{interval === 'yearly' && (
                      <span style={{ color: 'var(--ink-4)' }}> · billed annually</span>
                    )}
                  </span>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink-2)' }}>
                      <PlanTick />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center rounded-lg text-[13px] font-medium"
                    style={{
                      padding: '9px 0',
                      border: '1px solid var(--line-2)',
                      color: 'var(--ink-3)',
                      background: 'var(--surface)',
                    }}
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isOwner || checkoutLoading !== null || !isPaddleConfigured()}
                    onClick={() => handleUpgrade(plan)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      padding: '9px 0',
                      background: isRecommended ? 'var(--accent)' : 'var(--surface)',
                      color: isRecommended ? 'white' : 'var(--ink)',
                      border: isRecommended ? 'none' : '1px solid var(--line-2)',
                    }}
                  >
                    {checkoutLoading === plan.id ? (
                      'Opening checkout…'
                    ) : !isOwner ? (
                      'Owner only'
                    ) : !isPaddleConfigured() ? (
                      'Configure Paddle'
                    ) : (
                      <>
                        Upgrade to {plan.displayName}
                        <ArrowRight className="h-[13px] w-[13px]" />
                      </>
                    )}
                  </button>
                )}
              </article>
            )
          })}
        </div>

        {/* Enterprise strip */}
        <div style={{
          marginTop: 24,
          padding: '18px 22px',
          border: '1px dashed var(--line-strong)',
          borderRadius: 'var(--r-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          background: 'var(--surface-2)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-4)' }}>
              Enterprise
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              Need SSO, custom DPA, or volume pricing?
            </p>
          </div>
          <a
            href="mailto:support@conciara.app"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--bg-2)]"
            style={{ border: '1px solid var(--line-2)', color: 'var(--ink-2)', background: 'var(--surface)' }}
          >
            Talk to sales <ArrowUpRight className="h-[13px] w-[13px]" />
          </a>
        </div>

      </div>
    </div>
  )
}
