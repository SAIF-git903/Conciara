'use client'

import { useV2Auth } from '@/contexts/V2AuthContext'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function AccountPage() {
  const { user } = useV2Auth()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/v2/dashboard"
            className="flex items-center gap-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Account settings</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-medium text-slate-600">
              {(user?.fullName || user?.email || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-slate-900">{user?.fullName || 'Account'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{user?.fullName ?? '—'}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-slate-500">
            More account options (e.g. change password) can be added here.
          </p>
        </div>
      </main>
    </div>
  )
}
