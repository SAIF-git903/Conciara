'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { CreditCard, FileText, Check, ExternalLink } from 'lucide-react'
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

export default function WorkspaceSettingsBillingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = typeof params?.workspaceId === 'string' ? parseInt(params.workspaceId, 10) : null
  const { currentWorkspace } = useDashboard()
  const { user } = useAuth()
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null | undefined>(undefined)

  useEffect(() => {
    if (searchParams.get('checkout_success') === '1') {
      setShowCheckoutSuccess(true)
      router.replace(`/dashboard/${workspaceId}/settings/billing`)
    }
  }, [searchParams, router, workspaceId])

  useEffect(() => {
    if (workspaceId == null) return
    let cancelled = false
    api
      .get<{ subscription: SubscriptionSummary | null }>(`/workspaces/${workspaceId}/subscription`)
      .then((res) => {
        if (!cancelled) setSubscription(res.data.subscription ?? null)
      })
      .catch(() => {
        if (!cancelled) setSubscription(null)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const isOwner = Boolean(
    workspaceId && user?.workspaces?.find((w) => w.id === workspaceId)?.role === 'owner'
  )
  const planName =
    subscription != null
      ? subscription.planDisplayName
      : currentWorkspace?.id === workspaceId
        ? currentWorkspace.plan
        : user?.workspaces?.find((w) => w.id === workspaceId)?.plan ?? 'free'
  const displayPlan = typeof planName === 'string' ? planName.charAt(0).toUpperCase() + planName.slice(1) : 'Free'
  const hasPaidSubscription = subscription != null && subscription.planName !== 'free'

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Manage your plan, payment method, and billing history. Only the workspace owner can change billing.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {showCheckoutSuccess && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>Payment successful. Your plan has been updated.</span>
            </div>
          )}
          {/* Current plan */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Current plan</h2>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--v2-primary)]/10 px-2.5 py-1 text-sm font-medium text-[var(--v2-primary)]">
                  {displayPlan}
                </span>
                <span className="text-sm text-slate-600">
                  {!hasPaidSubscription ? 'Free tier — upgrade for more' : subscription?.status === 'active' ? 'Active subscription' : subscription?.status === 'canceled' ? 'Cancels at period end' : subscription?.status ?? 'Active subscription'}
                </span>
              </div>
              {isOwner && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Change plan
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              )}
            </div>
            {hasPaidSubscription && subscription && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Billing: {subscription.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                {subscription.currentPeriodEnd && (
                  <span>
                    {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {!isOwner && (
              <p className="mt-2 text-xs text-slate-500">Only the workspace owner can change the plan.</p>
            )}
          </section>

          {/* Payment method */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CreditCard className="h-4 w-4 text-slate-500" />
              Payment method
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add or update the card used for this workspace. Billing integration coming soon.
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 px-4 py-8 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">No payment method on file</p>
              <p className="mt-0.5 text-xs text-slate-500">Required when you upgrade from Free</p>
              {isOwner && (
                <button
                  type="button"
                  disabled
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 shadow-sm"
                >
                  Add payment method (coming soon)
                </button>
              )}
            </div>
          </section>

          {/* Billing history */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-slate-500" />
              Billing history
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Invoices and payment history. Paddle sends receipts by email.
            </p>
            <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/30 px-4 py-6">
              {hasPaidSubscription ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-green-500" />
                    You have an active subscription. Invoices are sent to your email by Paddle.
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    For a full invoice history, sign in to your Paddle account (link in your receipt emails).
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-green-500" />
                    You’re on the Free plan — no invoices yet.
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    When you upgrade, Paddle will email you receipts for each payment.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
