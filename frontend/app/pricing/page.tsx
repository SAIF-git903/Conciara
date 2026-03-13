'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PLANS, formatPlanBytes } from '@/lib/plans'
import { openPaddleCheckout, isPaddleConfigured } from '@/lib/paddle'
import { getSelectedWorkspaceId } from '@/lib/workspace-selection'

function formatCredits(n: number): string {
  return n.toLocaleString()
}

type BillingInterval = 'monthly' | 'yearly'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 10.5 8.5 14 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PricingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [interval, setInterval] = useState<BillingInterval>('yearly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const workspaceIdParam = searchParams.get('workspaceId')
  const workspaceId = workspaceIdParam ? parseInt(workspaceIdParam, 10) : getSelectedWorkspaceId()
  const effectiveWorkspaceId = Number.isNaN(workspaceId) ? null : workspaceId

  // Redirect to workspace plans page if workspace context is available
  useEffect(() => {
    if (effectiveWorkspaceId) {
      router.replace(`/dashboard/${effectiveWorkspaceId}/settings/plans`)
    }
  }, [effectiveWorkspaceId, router])

  const handleIntervalChange = (newInterval: BillingInterval) => {
    if (newInterval === interval) return
    setInterval(newInterval)
  }

  const handleUpgrade = useCallback(
    async (plan: (typeof PLANS)[number]) => {
      const priceId =
        interval === 'monthly' ? plan.paddlePriceIdMonthly : plan.paddlePriceIdYearly
      if (!priceId) return
      setCheckoutLoading(plan.id)
      try {
        await openPaddleCheckout(priceId, effectiveWorkspaceId)
      } finally {
        setCheckoutLoading(null)
      }
    },
    [interval, effectiveWorkspaceId]
  )

  return (
    <div className="space-y-14">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Pricing plans
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto sm:text-base">
          Message credits reset monthly. Upgrade or downgrade any time.
        </p>

        <div className="flex justify-center pt-2">
          <div className="relative inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1">
            <span
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-white shadow-sm transition-[left] duration-200 ease-out"
              style={{ left: interval === 'yearly' ? 4 : 'calc(50% + 2px)' }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => handleIntervalChange('yearly')}
              className={`relative z-10 min-w-[120px] rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                interval === 'yearly' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual pricing
            </button>
            <button
              type="button"
              onClick={() => handleIntervalChange('monthly')}
              className={`relative z-10 min-w-[120px] rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                interval === 'monthly' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly pricing
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="grid gap-6 items-stretch sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = interval === 'monthly' ? plan.priceMonthly : plan.priceYearly
            const isFree = plan.priceMonthly === 0

            return (
              <div
                key={plan.id}
                className={`group flex h-full flex-col rounded-2xl bg-white transition-all duration-200 ${
                  plan.name === 'standard'
                    ? 'border border-slate-200 shadow-lg lg:-translate-y-1'
                    : 'border border-slate-200 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="relative flex flex-1 flex-col p-6 sm:p-8">
                  <div className="absolute right-4 top-4 sm:right-6 sm:top-6 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 pr-8 sm:pr-10">
                    {plan.displayName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {plan.messageCredits.toLocaleString()} credits/mo · {plan.maxAgents} agent · {plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}
                  </p>

                  <div className="mt-6 mb-6 flex items-baseline gap-2">
                    {isFree ? (
                      <span className="text-3xl font-semibold text-slate-900" style={{ lineHeight: 1 }}>Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-semibold text-slate-900" style={{ lineHeight: 1 }}>$</span>
                        <div
                          className="relative inline-block min-w-[3ch] overflow-hidden text-3xl font-semibold tabular-nums text-slate-900"
                          style={{ lineHeight: 1 }}
                        >
                          <span className="invisible select-none" aria-hidden>
                            {price}
                          </span>
                          <AnimatePresence initial={false}>
                            <motion.span
                              key={interval}
                              initial={{ y: '100%' }}
                              animate={{ y: 0 }}
                              exit={{ y: '-100%' }}
                              transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1] }}
                              className="absolute left-0 top-0 inline-block min-w-[3ch] text-3xl font-semibold tabular-nums text-slate-900"
                              style={{ lineHeight: 1 }}
                            >
                              {price}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                        <span className="text-sm font-normal text-slate-500">/mo</span>
                      </>
                    )}
                  </div>
                  {!isFree && (
                    <p
                      className={`-mt-2 mb-6 min-h-[2.5rem] text-xs text-slate-500 transition-opacity duration-200 ${
                        interval === 'yearly' ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {interval === 'yearly' ? (
                        <>Billed ${plan.priceYearly.toLocaleString()} annually</>
                      ) : (
                        'billed annually'
                      )}
                    </p>
                  )}
                  {isFree && <div className="-mt-2 mb-6 h-4" />}

                  <button
                    type="button"
                    disabled={!isFree && (checkoutLoading !== null || !isPaddleConfigured())}
                    onClick={() =>
                      isFree ? undefined : handleUpgrade(plan)
                    }
                    className="mt-auto w-full rounded-lg bg-[var(--v2-primary)] px-5 py-3 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isFree
                      ? 'Get started'
                      : checkoutLoading === plan.id
                        ? 'Opening…'
                        : !isPaddleConfigured()
                          ? 'Configure Paddle'
                          : 'Upgrade'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-4 pl-6 font-semibold text-slate-900">Features</th>
              {PLANS.map((p) => (
                <th key={p.id} className="py-4 px-3 font-semibold text-slate-900">{p.displayName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="py-3 pl-6 text-slate-700">Message credits / month</td>
              {PLANS.map((p) => (
                <td key={p.id} className="py-3 px-3 text-slate-600">{formatCredits(p.messageCredits)}</td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pl-6 text-slate-700">Agents</td>
              {PLANS.map((p) => (
                <td key={p.id} className="py-3 px-3 text-slate-600">{formatCredits(p.maxAgents)}</td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="py-3 pl-6 text-slate-700">Members</td>
              {PLANS.map((p) => (
                <td key={p.id} className="py-3 px-3 text-slate-600">{formatCredits(p.maxMembers)}</td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pl-6 text-slate-700">Training per agent</td>
              {PLANS.map((p) => (
                <td key={p.id} className="py-3 px-3 text-slate-600">{formatPlanBytes(p.maxTrainingBytes)}</td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className="py-3 pl-6 text-slate-700">API access</td>
              {PLANS.map((p) => (
                <td key={p.id} className="py-3 px-3 text-slate-600">
                  {p.apiAccess ? <CheckIcon /> : <span className="text-slate-300">—</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" /></div>}>
      <PricingContent />
    </Suspense>
  )
}
