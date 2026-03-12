'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS, formatPlanBytes } from '@/lib/plans'
import { openPaddleCheckout, isPaddleConfigured } from '@/lib/paddle'
import { Check, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type BillingInterval = 'monthly' | 'yearly'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 10.5 8.5 14 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatCredits(n: number): string {
  return n.toLocaleString()
}

export default function WorkspaceSettingsPlansPage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const { user } = useAuth()
  const [interval, setInterval] = useState<BillingInterval>('yearly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const isOwner = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner'
  )

  const currentPlan = currentWorkspace?.plan || 'free'
  const paidPlans = PLANS.filter((p) => p.name !== 'free')

  const handleIntervalChange = (newInterval: BillingInterval) => {
    if (newInterval === interval) return
    setInterval(newInterval)
  }

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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm text-slate-500">Invalid workspace</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Plans & Pricing</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose the right plan for your workspace. {!isOwner && 'Only the workspace owner can change plans.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-white">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Billing Interval Toggle */}
          <div className="flex justify-center">
            <div className="relative inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1">
              <span
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-white shadow-sm transition-[left] duration-200 ease-out"
                style={{ left: interval === 'yearly' ? 4 : 'calc(50% + 2px)' }}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => handleIntervalChange('yearly')}
                className={`relative z-10 min-w-[120px] rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${interval === 'yearly' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Annual pricing
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('monthly')}
                className={`relative z-10 min-w-[120px] rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ${interval === 'monthly' ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Monthly pricing
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {paidPlans.map((plan) => {
              const price = interval === 'monthly' ? plan.priceMonthly : plan.priceYearly
              const isCurrentPlan = plan.name === currentPlan
              const isPopular = plan.name === 'standard'

              return (
                <div
                  key={plan.id}
                  className={`group relative flex h-full flex-col rounded-2xl bg-white transition-all duration-200 ${isPopular
                      ? 'border-2 border-slate-300 shadow-xl ring-1 ring-slate-200'
                      : 'border border-slate-200 shadow-md hover:shadow-lg'
                    } ${isCurrentPlan ? 'ring-2 ring-emerald-200 bg-emerald-50/30' : ''}`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-4">
                      <div className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                        Current Plan
                      </div>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-6 sm:p-8">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                        {plan.displayName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {plan.messageCredits.toLocaleString()} credits/mo • {plan.maxAgents} agent{plan.maxAgents !== 1 ? 's' : ''} • {plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="mb-6 flex items-baseline gap-2">
                      <span className="text-3xl font-semibold text-slate-900">$</span>
                      <div className="relative inline-block min-w-[3ch] overflow-hidden text-3xl font-semibold tabular-nums text-slate-900">
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
                          >
                            {price}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <span className="text-sm font-normal text-slate-500">/mo</span>
                    </div>

                    <p className={`-mt-2 mb-6 min-h-[2.5rem] text-xs text-slate-500 transition-opacity duration-200 ${interval === 'yearly' ? 'opacity-100' : 'opacity-0'
                      }`}>
                      {interval === 'yearly' ? (
                        <>Billed ${plan.priceYearly.toLocaleString()} annually</>
                      ) : (
                        'Billed annually'
                      )}
                    </p>

                    {/* Features List */}
                    <div className="mb-8 flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-sm text-slate-700">{formatCredits(plan.messageCredits)} message credits/month</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-sm text-slate-700">{formatCredits(plan.maxAgents)} AI agent{plan.maxAgents !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-sm text-slate-700">{formatCredits(plan.maxMembers)} team member{plan.maxMembers !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckIcon />
                        <span className="text-sm text-slate-700">{formatPlanBytes(plan.maxTrainingBytes)} training data per agent</span>
                      </div>
                      {plan.apiAccess && (
                        <div className="flex items-center gap-3">
                          <CheckIcon />
                          <span className="text-sm text-slate-700">API access</span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {isCurrentPlan ? (
                      <div className="w-full rounded-lg border-2 border-emerald-200 bg-emerald-50 px-5 py-3 text-center text-sm font-medium text-emerald-700">
                        Current Plan
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOwner || checkoutLoading !== null || !isPaddleConfigured()}
                        onClick={() => handleUpgrade(plan)}
                        className="group w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {checkoutLoading === plan.id ? (
                          'Opening checkout...'
                        ) : !isOwner ? (
                          'Owner only'
                        ) : !isPaddleConfigured() ? (
                          'Configure Paddle'
                        ) : (
                          <>
                            Upgrade to {plan.displayName}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feature Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-4 pl-6 font-semibold text-slate-900">Features</th>
                  {paidPlans.map((p) => (
                    <th key={p.id} className="py-4 px-3 font-semibold text-slate-900 text-center">
                      {p.displayName}
                      {p.name === currentPlan && (
                        <div className="mt-1 text-xs font-normal text-emerald-600">(Current)</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pl-6 text-slate-700 font-medium">Message credits / month</td>
                  {paidPlans.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-slate-600 text-center">{formatCredits(p.messageCredits)}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="py-3 pl-6 text-slate-700 font-medium">AI Agents</td>
                  {paidPlans.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-slate-600 text-center">{formatCredits(p.maxAgents)}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pl-6 text-slate-700 font-medium">Team Members</td>
                  {paidPlans.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-slate-600 text-center">{formatCredits(p.maxMembers)}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="py-3 pl-6 text-slate-700 font-medium">Training data per agent</td>
                  {paidPlans.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-slate-600 text-center">{formatPlanBytes(p.maxTrainingBytes)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pl-6 text-slate-700 font-medium">API access</td>
                  {paidPlans.map((p) => (
                    <td key={p.id} className="py-3 px-3 text-slate-600 text-center">
                      {p.apiAccess ? <CheckIcon /> : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-slate-500">
            <p>
              Need help choosing a plan?{' '}
              <a href="#" className="text-slate-700 hover:text-slate-900 underline">
                Contact support
              </a>{' '}
              for personalized recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}