'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

function SignupForm() {
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite') ?? ''
  const { signup, acceptInvite } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ email: string; workspaceName: string } | null>(null)
  const [inviteValidating, setInviteValidating] = useState(!!inviteToken)

  useEffect(() => {
    if (!inviteToken) return
    let cancelled = false
    setInviteValidating(true)
    api
      .get<{ email: string; workspaceName: string; valid: boolean }>('/auth/invite/validate', {
        params: { token: inviteToken },
      })
      .then(({ data }) => {
        if (!cancelled && data.valid && data.email) {
          setInviteInfo({ email: data.email, workspaceName: data.workspaceName || 'the workspace' })
          setEmail(data.email)
        } else if (!cancelled) {
          setError('Invalid or expired invite link. You can still sign up below.')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Invalid or expired invite link. You can still sign up below.')
      })
      .finally(() => {
        if (!cancelled) setInviteValidating(false)
      })
    return () => {
      cancelled = true
    }
  }, [inviteToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      if (inviteToken && inviteInfo) {
        await acceptInvite(inviteToken, password, fullName || undefined)
      } else {
        await signup(email, password, fullName || undefined)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-slate-900">
          {inviteInfo ? 'Create your account' : 'Sign Up'}
        </h1>
        {inviteInfo && (
          <p className="mb-4 text-center text-sm text-slate-600">
            You&apos;re joining <strong>{inviteInfo.workspaceName}</strong>. Set your password to get started.
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!inviteInfo}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Full name (optional)
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Create a password"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium uppercase tracking-wide text-slate-600"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || inviteValidating}
            className="mt-4 w-full rounded-lg bg-[var(--v2-primary)] py-2.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)] disabled:opacity-50"
          >
            {submitting ? (inviteInfo ? 'Joining workspace…' : 'Creating account…') : inviteValidating ? 'Checking invite…' : inviteInfo ? 'Create account & join' : 'Sign Up'}
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            {inviteInfo ? "You'll be signed in and taken to the workspace dashboard." : "After sign up you'll be signed in and taken to your dashboard."}
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/signin" className="font-medium text-slate-900 underline-offset-2 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--v2-primary)] border-t-transparent" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

