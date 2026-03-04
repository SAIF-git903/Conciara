import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Sign Up
        </h1>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Email
            </label>
            <input
              id="email"
              type="email"
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="Repeat your password"
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-[var(--v2-primary)] py-2.5 text-sm font-medium text-[var(--v2-primary-foreground)] shadow-sm transition hover:bg-[var(--v2-primary-hover)]"
          >
            Sign Up
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            After sign up you&apos;ll set up your agent in a few steps, then access your dashboard.{' '}
            <Link href="/v2/onboarding/workspace" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Go to setup →
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/v2/signin" className="font-medium text-slate-900 underline-offset-2 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

