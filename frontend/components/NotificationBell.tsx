'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import api from '@/lib/api'

type NotificationItem = {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function NotificationBell({
  workspaceId,
}: {
  workspaceId?: number
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const hasWorkspace = typeof workspaceId === 'number' && workspaceId > 0

  const fetchNotifications = useCallback(async () => {
    if (!hasWorkspace || !workspaceId) {
      setItems([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get<{
        items: NotificationItem[]
        unreadCount: number
      }>(`/workspaces/${workspaceId}/notifications`, {
        params: { limit: 8, offset: 0 },
      })
      setItems(Array.isArray(data.items) ? data.items : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch {
      setItems([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [hasWorkspace, workspaceId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!hasWorkspace) return
    const id = window.setInterval(fetchNotifications, 30000)
    return () => window.clearInterval(id)
  }, [fetchNotifications, hasWorkspace])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markOneRead = async (id: string) => {
    if (!workspaceId) return
    try {
      await api.post(`/workspaces/${workspaceId}/notifications/${id}/read`)
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // noop
    }
  }

  const markAllRead = async () => {
    if (!workspaceId) return
    setMarkingAll(true)
    try {
      await api.post(`/workspaces/${workspaceId}/notifications/read-all`)
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  const badge = useMemo(() => {
    if (unreadCount <= 0) return null
    return unreadCount > 99 ? '99+' : String(unreadCount)
  }, [unreadCount])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 ${
          open ? 'bg-slate-100 text-slate-900' : ''
        }`}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {badge && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notifications-menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-1.5 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_10px_40px_-12px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll || items.length === 0}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  Mark all read
                </button>
                {hasWorkspace && workspaceId && (
                  <Link
                    href={`/dashboard/${workspaceId}/settings/notifications`}
                    onClick={() => setOpen(false)}
                    className="rounded px-2 py-1 text-xs font-medium text-[var(--v2-primary)] hover:bg-slate-100"
                  >
                    View all
                  </Link>
                )}
              </div>
            </div>

            <div className="max-h-[360px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !item.isRead && markOneRead(item.id)}
                      className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                        item.isRead ? 'bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        {!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

