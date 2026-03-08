'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getApiBaseUrl } from '@/lib/api'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Sign in with Google is not configured.',
  missing_code: 'Authorization was cancelled or invalid.',
  token_exchange_failed: 'Google sign-in failed. Please try again.',
  no_access_token: 'Google did not return an access token.',
  userinfo_failed: 'Could not load your Google profile.',
  no_email: 'Your Google account has no email we can use.',
  account_disabled: 'Your account is disabled.',
  callback_failed: 'Something went wrong. Please try again.',
}

export default function SigninPage() {
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      setError(GOOGLE_ERROR_MESSAGES[err] || `Sign-in error: ${err}`)
      window.history.replaceState({}, '', '/signin')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Sign In
        </h1>

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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="you@example.com"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-[var(--v2-primary)] py-2.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)] disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-slate-500">
          <Link href="/forgot-password" className="text-slate-700 underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          <span>OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              const base = getApiBaseUrl()
              window.location.href = `${base}/auth/google`
            }}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            <span>Sign in with Google</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-100"
          >
            <AppleIcon className="h-5 w-5 shrink-0 text-slate-800" />
            <span>Sign in with Apple</span>
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-slate-900 underline-offset-2 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

