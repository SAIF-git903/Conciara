'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';

const AUTH_TOKEN = 'auth_token';
const AUTH_REFRESH = 'auth_refresh_token';
const AUTH_USER = 'auth_user';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const exchangeStartedRef = useRef(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code?.trim()) {
      setStatus('error');
      setErrorMessage('Missing authorization code');
      return;
    }
    // Prevent double run (e.g. React Strict Mode) so we don't show "Invalid or expired code" after success
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/auth/google/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body?.error || `Request failed (${res.status})`);
          });
        }
        return res.json();
      })
      .then((data: { token: string; refreshToken: string; user: { workspaces?: unknown[] } }) => {
        redirectingRef.current = true;
        localStorage.setItem(AUTH_TOKEN, data.token);
        localStorage.setItem(AUTH_REFRESH, data.refreshToken);
        localStorage.setItem(AUTH_USER, JSON.stringify(data.user));

        const workspaces = data.user?.workspaces ?? [];
        if (workspaces.length > 1) {
          window.location.href = '/choose-workspace';
        } else if (workspaces.length === 1) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/onboarding';
        }
      })
      .catch((err) => {
        if (redirectingRef.current) return;
        setStatus('error');
        setErrorMessage(err?.message || 'Sign in failed');
      });
  }, [searchParams]);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
        </div>
        <Link
          href="/signin"
          className="rounded-lg bg-[var(--v2-primary)] px-5 py-2.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:opacity-90"
        >
          Back to Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--v2-primary)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--v2-primary)] text-sm font-bold text-white">
            C
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-slate-700">Completing sign in…</p>
        <p className="mt-1 text-sm text-slate-500">You’ll be redirected in a moment</p>
      </div>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-6">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--v2-primary)]" />
            <p className="text-sm text-slate-600">Loading…</p>
          </div>
        }
      >
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
