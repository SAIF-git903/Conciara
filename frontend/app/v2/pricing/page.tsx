'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const tiers = [
  {
    name: 'Basic',
    planLabel: 'Basic plan',
    monthly: 19,
    yearly: 16,
    description: 'Best for small teams and freelancers.',
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    planLabel: 'Pro plan',
    monthly: 49,
    yearly: 41,
    description: 'For growing teams needing more.',
    cta: 'Get started',
    highlight: true,
  },
  {
    name: 'Enterprise',
    planLabel: 'Enterprise plan',
    monthly: 99,
    yearly: 83,
    description: 'For large organizations with advanced needs.',
    cta: 'Get started',
    highlight: false,
  },
]

// Feature comparison: each row is [featureName, basic, pro, enterprise]
// value can be true (check), false (dash), or string (e.g. "10", "Unlimited")
const featureRows: Array<{ label: string; basic: boolean | string; pro: boolean | string; enterprise: boolean | string }> = [
  { label: 'Basic features', basic: true, pro: true, enterprise: true },
  { label: 'Users', basic: '10', pro: '20', enterprise: 'Unlimited' },
  { label: 'Individual data', basic: '20GB', pro: '40GB', enterprise: 'Unlimited' },
  { label: 'Support', basic: true, pro: true, enterprise: true },
  { label: 'Automated workflows', basic: false, pro: true, enterprise: true },
  { label: '200+ integrations', basic: false, pro: true, enterprise: true },
]

type BillingInterval = 'monthly' | 'yearly'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 10.5 8.5 14 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('yearly')

  const handleIntervalChange = (newInterval: BillingInterval) => {
    if (newInterval === interval) return
    setInterval(newInterval)
  }

  return (
    <div className="space-y-14">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Pricing plans
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto sm:text-base">
          Try our basic plan risk free for 30 days. Switch plans or cancel any time.
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
        <div className="grid gap-6 items-stretch md:grid-cols-3">
          {tiers.map((tier) => {
            const price = interval === 'monthly' ? tier.monthly : tier.yearly

            return (
              <div
                key={tier.name}
                className={`group flex h-full flex-col rounded-2xl bg-white transition-all duration-200 ${
                  tier.highlight
                    ? 'border border-slate-200 shadow-lg md:-translate-y-1'
                    : 'border border-slate-200 shadow-md hover:shadow-lg'
                }`}
              >
                <div className="relative flex flex-1 flex-col p-8">
                  <div className="absolute right-6 top-6 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 pr-10">
                    {tier.planLabel}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{tier.description}</p>

                  <div className="mt-6 mb-6 flex items-baseline gap-2">
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
                    <span className="text-sm font-normal text-slate-500">per month</span>
                  </div>
                  <p
                    className={`-mt-2 mb-6 h-4 text-xs text-slate-500 transition-opacity duration-200 ${
                      interval === 'yearly' ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    billed annually
                  </p>

                  <button
                    type="button"
                    className="mt-auto w-full rounded-lg bg-[var(--v2-primary)] px-5 py-3 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)] hover:shadow-md active:scale-[0.98]"
                  >
                    {tier.cta}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-4 pl-6 font-semibold text-slate-900">Features</th>
              <th className="py-4 px-4 font-semibold text-slate-900">Basic plan</th>
              <th className="py-4 px-4 font-semibold text-slate-900">Pro plan</th>
              <th className="py-4 pr-6 pl-4 font-semibold text-slate-900">Enterprise plan</th>
            </tr>
          </thead>
          <tbody>
            {featureRows.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}
              >
                <td className="py-3 pl-6 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    {row.label}
                    <button
                      type="button"
                      className="rounded-full text-slate-400 hover:text-slate-600"
                      aria-label={`Info for ${row.label}`}
                    >
                      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {row.basic === true && <CheckIcon />}
                  {row.basic === false && <span className="text-slate-300">—</span>}
                  {typeof row.basic === 'string' && row.basic}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {row.pro === true && <CheckIcon />}
                  {row.pro === false && <span className="text-slate-300">—</span>}
                  {typeof row.pro === 'string' && row.pro}
                </td>
                <td className="py-3 pr-6 pl-4 text-slate-600">
                  {row.enterprise === true && <CheckIcon />}
                  {row.enterprise === false && <span className="text-slate-300">—</span>}
                  {typeof row.enterprise === 'string' && row.enterprise}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
