'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Crown, Check, Zap, Users, Database, Key } from 'lucide-react'
import { PLANS, formatPlanBytes } from '@/lib/plans'
import { useDashboardOptional } from '@/contexts/DashboardContext'
import type { UpgradeContext } from '@/hooks/usePermissions'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  context: UpgradeContext
}

/**
 * Enhanced upgrade modal with contextual messaging and plan comparison
 */
export default function UpgradeModal({ open, onClose, context }: UpgradeModalProps) {
  // Use optional context: modal is rendered by UpgradeProvider which is a sibling of DashboardProvider
  const dashboard = useDashboardOptional()
  const workspaceId = dashboard?.currentWorkspace?.id
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  
  if (!open) return null

  const currentPlan = PLANS.find(p => p.displayName === context.currentPlan)
  const suggestedPlan = PLANS.find(p => p.displayName === context.suggestedPlan)

  const pricingHref = workspaceId ? `/dashboard/${workspaceId}/settings/plans` : '/pricing'

  // Get all plans from suggested plan onwards for comparison
  const suggestedPlanIndex = PLANS.findIndex(p => p.displayName === context.suggestedPlan)
  const plansToShow = PLANS.slice(suggestedPlanIndex)

  const getFeatureIcon = (feature: string) => {
    const iconMap: Record<string, any> = {
      'Create Additional Agents': Bot,
      'Invite Team Members': Users,
      'API Access': Key,
      'Upload Files': Database,
      'Advanced Analytics': BarChart3,
      'Custom Branding': Crown,
      'Advanced Settings': Settings
    }
    const Icon = iconMap[feature] || Zap
    return <Icon className="w-5 h-5" />
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
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
          {/* Header with context */}
          <div className="mb-6 pr-10">
            <div className="flex items-center gap-3 mb-2">
              {getFeatureIcon(context.feature)}
              <h2 id="upgrade-modal-title" className="text-xl font-semibold text-slate-900">
                Upgrade Required for {context.feature}
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              {context.reason}. Upgrade to <strong>{context.suggestedPlan}</strong> to unlock this feature and more.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-100 rounded-lg p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs text-green-600 font-semibold">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Plans comparison */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plansToShow.map((plan) => {
              const isFree = plan.priceMonthly === 0
              const isSuggested = plan.displayName === context.suggestedPlan
              const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
              const yearlyDiscount = billingCycle === 'yearly' && !isFree
              
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border text-left ${
                    isSuggested
                      ? 'border-slate-800 bg-slate-100 shadow-lg ring-2 ring-slate-300'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  {isSuggested && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Recommended
                      </span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900">{plan.displayName}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-2xl font-semibold text-slate-900">Free</span>
                      ) : (
                        <>
                          <span className="text-slate-600">$</span>
                          <span className="text-2xl font-semibold tabular-nums text-slate-900">
                            {price}
                          </span>
                          <span className="text-sm text-slate-500">
                            /{billingCycle === 'yearly' ? 'year' : 'mo'}
                          </span>
                          {yearlyDiscount && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              Save ${plan.priceMonthly * 12 - plan.priceYearly}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{plan.messageCredits.toLocaleString()} credits/mo</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{plan.maxAgents} agent{plan.maxAgents !== 1 ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{plan.maxMembers} member{plan.maxMembers !== 1 ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-green-500" />
                        <span>{formatPlanBytes(plan.maxTrainingBytes)} training</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {plan.apiAccess ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span>API access</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-400">No API access</span>
                          </>
                        )}
                      </li>
                    </ul>

                    {/* Show plan-specific benefits */}
                    {isSuggested && context.benefits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-700 mb-2">What you'll get:</p>
                        <ul className="space-y-1">
                          {context.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-center gap-2 text-xs text-slate-600">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {!isFree && (
                    <div className="mt-auto border-t border-slate-200/80 p-3">
                      <Link
                        href={pricingHref}
                        onClick={onClose}
                        className={`block w-full rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                          isSuggested
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-slate-600 text-white hover:bg-slate-700'
                        }`}
                      >
                        {isSuggested ? 'Upgrade Now' : 'Select Plan'}
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              href={pricingHref}
              onClick={onClose}
              className="text-sm font-medium text-slate-900 hover:underline"
            >
              View full pricing details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Import missing icons
import { Bot, BarChart3, Settings } from 'lucide-react'