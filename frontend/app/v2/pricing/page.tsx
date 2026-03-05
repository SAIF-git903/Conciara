'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const tiers = [
  {
    name: 'Free',
    planLabel: 'Free',
    monthly: 0,
    yearly: 0,
    description: 'Get started with one agent.',
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Starter',
    planLabel: 'Starter',
    monthly: 19,
    yearly: 16,
    description: 'For small teams.',
    cta: 'Start trial',
    highlight: false,
  },
  {
    name: 'Pro',
    planLabel: 'Pro',
    monthly: 59,
    yearly: 49,
    description: 'For growing teams.',
    cta: 'Get started',
    highlight: true,
  },
  {
    name: 'Business',
    planLabel: 'Business',
    monthly: 149,
    yearly: 124,
    description: 'For organizations with advanced needs.',
    cta: 'Get started',
    highlight: false,
  },
]

// Feature comparison: Free, Starter, Pro, Business
// value can be true (check), false (dash), or string
const featureRows: Array<{
  label: string
  free: boolean | string
  starter: boolean | string
  pro: boolean | string
  business: boolean | string
}> = [
  { label: 'Messages', free: '100', starter: '500', pro: '3,000', business: '10,000' },
  { label: 'Training', free: '5MB', starter: '50MB', pro: '200MB', business: '1GB' },
  { label: 'Agents / members', free: '1 agent', starter: '3 members', pro: '10 members', business: '20 members' },
  { label: 'Watermark', free: true, starter: false, pro: false, business: false },
  { label: 'Basic analytics', free: false, starter: true, pro: false, business: false },
  { label: 'Chat customization', free: false, starter: false, pro: true, business: true },
  { label: 'Integrations', free: false, starter: false, pro: true, business: true },
  { label: 'Advanced analytics', free: false, starter: false, pro: false, business: true },
  { label: 'API access', free: false, starter: false, pro: false, business: true },
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
          Try our starter plan risk free for 30 days. Switch plans or cancel any time.
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
          {tiers.map((tier) => {
            const price = interval === 'monthly' ? tier.monthly : tier.yearly
            const isFree = tier.monthly === 0

            return (
              <div
                key={tier.name}
                className={`group flex h-full flex-col rounded-2xl bg-white transition-all duration-200 ${
                  tier.highlight
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
                    {tier.planLabel}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{tier.description}</p>

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
                        <>Billed ${(tier.yearly * 12).toLocaleString()} annually</>
                      ) : (
                        'billed annually'
                      )}
                    </p>
                  )}
                  {isFree && <div className="-mt-2 mb-6 h-4" />}

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

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-4 pl-6 font-semibold text-slate-900">Features</th>
              <th className="py-4 px-3 font-semibold text-slate-900">Free</th>
              <th className="py-4 px-3 font-semibold text-slate-900">Starter</th>
              <th className="py-4 px-3 font-semibold text-slate-900">Pro</th>
              <th className="py-4 pr-6 pl-3 font-semibold text-slate-900">Business</th>
            </tr>
          </thead>
          <tbody>
            {featureRows.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}
              >
                <td className="py-3 pl-6 text-slate-700">
                  <span className="inline-flex items-center gap-1.5">{row.label}</span>
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {row.free === true && <CheckIcon />}
                  {row.free === false && <span className="text-slate-300">—</span>}
                  {typeof row.free === 'string' && row.free}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {row.starter === true && <CheckIcon />}
                  {row.starter === false && <span className="text-slate-300">—</span>}
                  {typeof row.starter === 'string' && row.starter}
                </td>
                <td className="py-3 px-3 text-slate-600">
                  {row.pro === true && <CheckIcon />}
                  {row.pro === false && <span className="text-slate-300">—</span>}
                  {typeof row.pro === 'string' && row.pro}
                </td>
                <td className="py-3 pr-6 pl-3 text-slate-600">
                  {row.business === true && <CheckIcon />}
                  {row.business === false && <span className="text-slate-300">—</span>}
                  {typeof row.business === 'string' && row.business}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
