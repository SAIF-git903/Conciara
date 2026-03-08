'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useV2Auth } from '@/contexts/V2AuthContext'

export default function V2Header() {
  const pathname = usePathname()
  const { user, loading } = useV2Auth()

  const isSignin = pathname === '/v2/signin'
  const isSignup = pathname === '/v2/signup'
  const isAuthPage = isSignin || isSignup

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/v2" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] shadow-sm">
            <span className="text-sm font-semibold tracking-tight">CT</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            ConversaTree
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/v2#solutions" className="transition-colors hover:text-slate-900">
            Solutions
          </Link>
          <Link href="/v2#resources" className="transition-colors hover:text-slate-900">
            Resources
          </Link>
          <Link href="/v2/pricing" className="transition-colors hover:text-slate-900">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthPage && (
            loading ? (
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            ) : user ? (
              <Link
                href="/v2/dashboard"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/v2/signin"
                  className="rounded-lg border border-[var(--v2-primary)] px-3 py-1.5 text-sm font-medium text-[var(--v2-primary)] shadow-sm transition hover:bg-[var(--v2-primary-soft)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/v2/signup"
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-1.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)]"
                >
                  Sign up
                </Link>
              </>
            )
          )}
        </div>
      </div>
    </header>
  )
}
