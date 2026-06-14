'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

/* ─── Types ─────────────────────────────────────── */
type Preference = {
  id: string
  eventType: string
  inAppEnabled: boolean
  emailEnabled: boolean
}

/* ─── Static notification catalogue ─────────────── */
type NotifItem = {
  id: string
  label: string
  desc: string
  emailDefault: boolean
  inAppDefault: boolean
}

type NotifGroup = {
  title: string
  items: NotifItem[]
}

const GROUPS: NotifGroup[] = [
  {
    title: 'Workspace activity',
    items: [
      {
        id: 'workspace.agent.error',
        label: 'An agent fails or stops responding',
        desc: 'Critical failures only.',
        emailDefault: true,
        inAppDefault: true,
      },
      {
        id: 'workspace.credits.50',
        label: 'Reach 50% of credit limit',
        desc: "Heads-up before you run out.",
        emailDefault: true,
        inAppDefault: false,
      },
      {
        id: 'workspace.credits.90',
        label: 'Reach 90% of credit limit',
        desc: 'Final warning.',
        emailDefault: true,
        inAppDefault: true,
      },
    ],
  },
  {
    title: 'Team',
    items: [
      {
        id: 'workspace.member.invited',
        label: 'New member joins',
        desc: 'When an invitation is accepted.',
        emailDefault: true,
        inAppDefault: false,
      },
      {
        id: 'workspace.member.role-changed',
        label: 'Role changed',
        desc: 'Someone promoted or demoted.',
        emailDefault: false,
        inAppDefault: false,
      },
      {
        id: 'workspace.member.removed',
        label: 'Member removed',
        desc: 'When someone leaves or is removed.',
        emailDefault: false,
        inAppDefault: true,
      },
    ],
  },
  {
    title: 'Product',
    items: [
      {
        id: 'product.release',
        label: 'Product updates',
        desc: 'Major releases (about once a month).',
        emailDefault: true,
        inAppDefault: false,
      },
      {
        id: 'product.tips',
        label: 'Tips & best practices',
        desc: "We send these sparingly.",
        emailDefault: false,
        inAppDefault: false,
      },
    ],
  },
]

/* ─── Toggle component ───────────────────────────── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--ink-5)',
        position: 'relative',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: 'background .15s ease',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        justifySelf: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'transform .15s ease',
          transform: checked ? 'translateX(14px)' : 'translateX(0)',
          display: 'block',
        }}
      />
    </button>
  )
}

/* ─── Page ───────────────────────────────────────── */
export default function WorkspaceNotificationsPage() {
  const params = useParams()
  const workspaceId =
    typeof params?.workspaceId === 'string' ? Number.parseInt(params.workspaceId, 10) : null
  const { user } = useAuth()

  const [preferences, setPreferences] = useState<Preference[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  /* Fetch saved preferences from API */
  useEffect(() => {
    if (!workspaceId) return
    api
      .get<{ preferences: Preference[] }>(
        `/workspaces/${workspaceId}/notifications/preferences`
      )
      .then(({ data }) => {
        if (Array.isArray(data.preferences)) setPreferences(data.preferences)
      })
      .catch(() => {})
  }, [workspaceId])

  /* Build a lookup map for quick access */
  const prefMap = useMemo(
    () => new Map(preferences.map((p) => [p.eventType, p])),
    [preferences]
  )

  /* Resolve a value — fall back to catalogue default when no pref saved yet */
  function getVal(
    eventType: string,
    field: 'emailEnabled' | 'inAppEnabled',
    defaultVal: boolean
  ): boolean {
    const pref = prefMap.get(eventType)
    if (!pref) return defaultVal
    return pref[field]
  }

  /* Toggle handler — optimistically updates local state, persists to API */
  async function handleToggle(
    eventType: string,
    field: 'emailEnabled' | 'inAppEnabled',
    currentVal: boolean,
    defaultEmail: boolean,
    defaultInApp: boolean
  ) {
    if (!workspaceId || saving) return
    const pref = prefMap.get(eventType)
    const nextEmail =
      field === 'emailEnabled' ? !currentVal : (pref?.emailEnabled ?? defaultEmail)
    const nextInApp =
      field === 'inAppEnabled' ? !currentVal : (pref?.inAppEnabled ?? defaultInApp)

    /* Optimistic update */
    setPreferences((prev) => {
      const idx = prev.findIndex((p) => p.eventType === eventType)
      const next: Preference = {
        id: pref?.id ?? eventType,
        eventType,
        emailEnabled: nextEmail,
        inAppEnabled: nextInApp,
      }
      if (idx === -1) return [...prev, next]
      const copy = [...prev]
      copy[idx] = next
      return copy
    })

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
    } catch {
      /* Revert on error */
      setPreferences((prev) => {
        const idx = prev.findIndex((p) => p.eventType === eventType)
        if (idx === -1) return prev
        const copy = [...prev]
        copy[idx] = { ...copy[idx], emailEnabled: !nextEmail, inAppEnabled: !nextInApp }
        return copy
      })
    } finally {
      setSaving(null)
    }
  }

  if (!workspaceId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Invalid workspace.</p>
      </div>
    )
  }

  const userEmail =
    user?.email ?? '—'

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-auto"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20"
      >

        {/* Page header */}
        <div
          className="mb-[22px] pb-[18px]"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em]"
            style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
          >
            Settings
          </span>
          <h1
            className="text-[22px] font-semibold leading-tight tracking-[-0.015em]"
            style={{ color: 'var(--ink)', marginBottom: 4 }}
          >
            Notifications
          </h1>
          <p
            className="text-[13.5px] leading-relaxed"
            style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}
          >
            Choose what we email you about. You&apos;ll always get critical security alerts.
          </p>
        </div>

        {/* Settings split */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <p
              className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: 'var(--ink-4)' }}
            >
              Heads-up
            </p>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              We&apos;ll email{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{userEmail}</strong>.{' '}
              <a
                href="/dashboard/settings/account"
                style={{
                  color: 'var(--ink)',
                  borderBottom: '1px solid var(--line-strong)',
                  paddingBottom: 1,
                  textDecoration: 'none',
                }}
              >
                Change
              </a>
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {GROUPS.map((group) => (
              <div
                key={group.title}
                className="overflow-hidden rounded-xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-[18px] py-[14px]"
                  style={{ borderBottom: '1px solid var(--line)' }}
                >
                  <span
                    className="text-[13.5px] font-semibold"
                    style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}
                  >
                    {group.title}
                  </span>
                  {/* Column labels */}
                  <div style={{ display: 'flex', gap: 0 }}>
                    {['Email', 'In-app'].map((col) => (
                      <span
                        key={col}
                        style={{
                          width: 56,
                          textAlign: 'center',
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--ink-4)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                        }}
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {group.items.map((item) => {
                  const emailVal = getVal(item.id, 'emailEnabled', item.emailDefault)
                  const inAppVal = getVal(item.id, 'inAppEnabled', item.inAppDefault)
                  const isSaving = saving?.startsWith(item.id)

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 56px 56px',
                        alignItems: 'center',
                        gap: 16,
                        padding: '14px 18px',
                        borderTop: '1px solid var(--line)',
                      }}
                    >
                      {/* Label + desc */}
                      <div>
                        <div
                          className="text-[13.5px]"
                          style={{ fontWeight: 500, color: 'var(--ink)' }}
                        >
                          {item.label}
                        </div>
                        <div
                          className="mt-0.5 text-[12.5px] leading-snug"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          {item.desc}
                        </div>
                      </div>

                      {/* Email toggle */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle
                          checked={emailVal}
                          disabled={isSaving}
                          onChange={() =>
                            handleToggle(
                              item.id,
                              'emailEnabled',
                              emailVal,
                              item.emailDefault,
                              item.inAppDefault
                            )
                          }
                        />
                      </div>

                      {/* In-app toggle */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <Toggle
                          checked={inAppVal}
                          disabled={isSaving}
                          onChange={() =>
                            handleToggle(
                              item.id,
                              'inAppEnabled',
                              inAppVal,
                              item.emailDefault,
                              item.inAppDefault
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
