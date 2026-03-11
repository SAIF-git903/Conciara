'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { PLANS, formatPlanBytes } from '@/lib/plans'

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 10.5 8.5 14 15 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface PlansModalProps {
  open: boolean
  onClose: () => void
  /** Optional title above the plans (e.g. "Agent limit reached") */
  title?: string
  /** Optional short description (e.g. "The Free plan includes 1 agent. Upgrade to add more.") */
  description?: string
  /** Current workspace ID so pricing link can pass it for checkout */
  workspaceId?: number
}

export default function PlansModal({ open, onClose, title, description, workspaceId }: PlansModalProps) {
  const pricingHref = workspaceId != null ? `/pricing?workspaceId=${workspaceId}` : '/pricing'
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'plans-modal-title' : undefined}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {(title || description) && (
            <div className="mb-6 pr-10">
              {title && (
                <h2 id="plans-modal-title" className="text-xl font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isFree = plan.priceMonthly === 0
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl border text-left ${
                    plan.name === 'standard'
                      ? 'border-[var(--v2-primary)] bg-[var(--v2-primary)]/5 shadow-md'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900">{plan.displayName}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-2xl font-semibold text-slate-900">Free</span>
                      ) : (
                        <>
                          <span className="text-slate-600">$</span>
                          <span className="text-2xl font-semibold tabular-nums text-slate-900">
                            {plan.priceMonthly}
                          </span>
                          <span className="text-sm text-slate-500">/mo</span>
                        </>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <span>{plan.messageCredits.toLocaleString()} credits/mo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span>{plan.maxAgents} agent{plan.maxAgents !== 1 ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span>{plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span>{formatPlanBytes(plan.maxTrainingBytes)} training</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.apiAccess ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckIcon /> API access
                          </span>
                        ) : (
                          <span className="text-slate-400">No API access</span>
                        )}
                      </li>
                    </ul>
                  </div>
                  {!isFree && (
                    <div className="mt-auto border-t border-slate-200/80 p-3">
                      <Link
                        href={pricingHref}
                        onClick={onClose}
                        className="block w-full rounded-lg bg-[var(--v2-primary)] py-2 text-center text-sm font-medium text-[var(--v2-primary-foreground)] hover:bg-[var(--v2-primary-hover)]"
                      >
                        Upgrade
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <Link
              href={pricingHref}
              onClick={onClose}
              className="text-sm font-medium text-[var(--v2-primary)] hover:underline"
            >
              View full pricing →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
