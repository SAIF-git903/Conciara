'use client'

import { useAuth } from '@/contexts/AuthContext'
import { buildDashboardUrl } from '@/lib/dashboard-url'
import { DOC_CATEGORIES, DOC_TOPICS } from '@/lib/docs'
import { getSelectedWorkspaceId } from '@/lib/workspace-selection'
import { BookOpen, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export default function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DOC_TOPICS
    return DOC_TOPICS.filter((topic) => JSON.stringify(topic).toLowerCase().includes(q))
  }, [query])

  const grouped = useMemo(() => {
    return DOC_CATEGORIES.map((category) => ({
      category,
      topics: filtered.filter((topic) => topic.category === category),
    })).filter((group) => group.topics.length > 0)
  }, [filtered])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const dashboardHref = (() => {
    const workspaces = user?.workspaces ?? []
    if (workspaces.length === 0) return '/dashboard'
    const selectedId = getSelectedWorkspaceId()
    const selectedWorkspace = selectedId ? workspaces.find((w) => w.id === selectedId) : null
    const targetWorkspace = selectedWorkspace ?? workspaces[0]
    return buildDashboardUrl(targetWorkspace.id)
  })()

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
              <BookOpen className="h-4 w-4" />
            </div>
            <Link href="/" className="text-sm font-semibold text-white">Conciara Docs</Link>
            <span className="hidden text-xs text-slate-400 sm:inline">Production Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="docs-search-global"
              className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 md:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              <input
                id="docs-search-global"
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs..."
                className="w-44 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
              <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-slate-400">Ctrl K</span>
            </label>
            <Link
              href={dashboardHref}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden h-[calc(100vh-56px)] overflow-y-auto border-r border-white/10 bg-black lg:sticky lg:top-14 lg:block">
          <div className="p-4">
            {grouped.map((group) => (
              <div key={group.category} className="mb-6">
                <p className="mb-2 px-2 text-xs font-semibold text-slate-300">{group.category}</p>
                <nav className="space-y-1">
                  {group.topics.map((topic) => {
                    const href = `/docs/${topic.slug}`
                    const active = pathname === href || (pathname === '/docs' && topic.slug === 'welcome')
                    return (
                      <Link
                        key={topic.slug}
                        href={href}
                        className={`block rounded-md px-2 py-1.5 text-sm transition ${
                          active
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {topic.title}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}

