'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCheck, Loader2, Mail, BellRing } from 'lucide-react'
import api from '@/lib/api'

type NotificationItem = {
  id: string
  eventType: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

type Preference = {
  id: string
  eventType: string
  inAppEnabled: boolean
  emailEnabled: boolean
}

const DEFAULT_EVENTS = [
  'workspace.updated',
  'workspace.member.invited',
  'workspace.invite.resent',
  'workspace.member.removed',
  'workspace.member.left',
]

export default function WorkspaceNotificationsPage() {
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? Number.parseInt(params.workspaceId, 10) : null
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchAll = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const [notificationsRes, prefsRes] = await Promise.all([
        api.get<{ items: NotificationItem[]; unreadCount: number }>(`/workspaces/${workspaceId}/notifications`, {
          params: { limit: 100, offset: 0 },
        }),
        api.get<{ preferences: Preference[] }>(`/workspaces/${workspaceId}/notifications/preferences`),
      ])
      setItems(Array.isArray(notificationsRes.data.items) ? notificationsRes.data.items : [])
      setUnreadCount(typeof notificationsRes.data.unreadCount === 'number' ? notificationsRes.data.unreadCount : 0)
      setPreferences(Array.isArray(prefsRes.data.preferences) ? prefsRes.data.preferences : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [workspaceId])

  const preferenceMap = useMemo(
    () => new Map(preferences.map((p) => [p.eventType, p])),
    [preferences]
  )

  const updatePreference = async (eventType: string, field: 'inAppEnabled' | 'emailEnabled', value: boolean) => {
    if (!workspaceId) return
    const current = preferenceMap.get(eventType)
    const nextInApp = field === 'inAppEnabled' ? value : (current?.inAppEnabled ?? true)
    const nextEmail = field === 'emailEnabled' ? value : (current?.emailEnabled ?? false)
    setSaving(`${eventType}:${field}`)
    try {
      const { data } = await api.put<{ preference: Preference }>(
        `/workspaces/${workspaceId}/notifications/preferences/${encodeURIComponent(eventType)}`,
        { inAppEnabled: nextInApp, emailEnabled: nextEmail }
      )
      setPreferences((prev) => {
        const idx = prev.findIndex((p) => p.eventType === eventType)
        if (idx === -1) return [...prev, data.preference]
        const copy = [...prev]
        copy[idx] = data.preference
        return copy
      })
    } finally {
      setSaving(null)
    }
  }

  const markOneRead = async (id: string) => {
    if (!workspaceId) return
    await api.post(`/workspaces/${workspaceId}/notifications/${id}/read`)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    if (!workspaceId) return
    setMarkingAll(true)
    try {
      await api.post(`/workspaces/${workspaceId}/notifications/read-all`)
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-slate-500">
        Invalid workspace.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">In-app notifications and email alert preferences.</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Notification rules</h2>
                <p className="text-xs text-slate-500">Control where each event type notifies you.</p>
              </div>
            </div>

            <div className="space-y-2">
              {DEFAULT_EVENTS.map((eventType) => {
                const pref = preferenceMap.get(eventType)
                const inAppEnabled = pref?.inAppEnabled ?? true
                const emailEnabled = pref?.emailEnabled ?? false
                return (
                  <div key={eventType} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                    <p className="text-sm text-slate-700">{eventType}</p>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={inAppEnabled}
                          onChange={(e) => updatePreference(eventType, 'inAppEnabled', e.target.checked)}
                          disabled={saving === `${eventType}:inAppEnabled`}
                        />
                        In-app
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={emailEnabled}
                          onChange={(e) => updatePreference(eventType, 'emailEnabled', e.target.checked)}
                          disabled={saving === `${eventType}:emailEnabled`}
                        />
                        Email
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Recent notifications</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{unreadCount} unread</span>
              </div>
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll || items.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Mark all read
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
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
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 ${
                      item.isRead ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{item.eventType}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {!item.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

