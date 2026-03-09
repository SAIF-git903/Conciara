'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type HeaderVariant = 'dark' | 'light'

export default function Header({ variant }: { variant?: HeaderVariant }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  const isSignin = pathname === '/signin'
  const isSignup = pathname === '/signup'
  const isAuthPage = isSignin || isSignup

  const isDark = variant === 'dark'

  return (
    <header
      className={`sticky top-0 z-20 transition-colors duration-300 ${
        isDark ? 'bg-[var(--v2-primary)] text-white' : 'bg-white/80 backdrop-blur text-slate-900'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm ${
              isDark ? 'bg-white text-slate-900' : 'bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)]'
            }`}
          >
            <span className="text-sm font-semibold tracking-tight">CT</span>
          </div>
          <span className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ConversaTree
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link
            href="/#features"
            className={`transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Solutions
          </Link>
          <Link
            href="/#integrations"
            className={`transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Resources
          </Link>
          <Link
            href="/pricing"
            className={`transition-colors ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthPage &&
            (loading ? (
              <div className={`h-8 w-8 animate-pulse rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
            ) : user ? (
              <Link
                href="/dashboard"
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  isDark
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    isDark
                      ? 'border-white/30 text-white hover:bg-white/10'
                      : 'border-[var(--v2-primary)] text-[var(--v2-primary)] hover:bg-[var(--v2-primary-soft)]'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    isDark
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)] hover:bg-[var(--v2-primary-hover)]'
                  }`}
                >
                  Sign up
                </Link>
              </>
            ))}
        </div>
      </div>
    </header>
  )
}
