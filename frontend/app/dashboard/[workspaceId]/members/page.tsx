'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Mail, Loader2, Copy, Check, Send, X, MoreHorizontal, Trash2, Users, Link } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import PermissionButton from '@/components/PermissionButton'
import { PLANS } from '@/lib/plans'
import api from '@/lib/api'

type WorkspaceRole = 'owner' | 'member'

type Member = {
  id: number
  userId: number
  email: string
  fullName: string | null
  role: WorkspaceRole
  joinedAt?: string | null
}

type PendingInvite = {
  email: string
  expiresAt: string
  createdAt: string
}

const AVATAR_COLORS = [
  { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  { bg: '#e6f7f1', fg: '#0e9b6b' },
  { bg: '#fdf3e3', fg: '#b86a17' },
  { bg: '#fce8f1', fg: '#c33665' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#e0f2fe', fg: '#0284c7' },
]

function getAvatarColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string | null, email: string) {
  const src = name || email
  const parts = src.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function MemberMenu({
  onRemove,
}: {
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
        style={{ color: 'var(--ink-4)' }}
        aria-label="Member actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg py-1"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <button
            type="button"
            onClick={() => { setOpen(false); onRemove() }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--danger-soft)]"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Remove from workspace
          </button>
        </div>
      )}
    </div>
  )
}

export default function MembersPage() {
  const { currentWorkspace, workspaceLimits, refreshWorkspaceLimits } = useDashboard()
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const isOwner = Boolean(
    currentWorkspace?.id && user?.workspaces?.find((w) => w.id === currentWorkspace.id)?.role === 'owner'
  )

  const maxMembers = workspaceLimits?.maxMembers ?? 1
  const currentMemberCount = workspaceLimits?.currentMembers ?? members.length
  const planDisplayName = currentWorkspace?.plan
    ? (currentWorkspace.plan.charAt(0).toUpperCase() + currentWorkspace.plan.slice(1))
    : 'Free'
  const nextPlan = PLANS.find((p) => p.maxMembers > maxMembers)
  const seatsRemaining = Math.max(0, maxMembers - currentMemberCount)
  const seatPct = maxMembers > 0 ? Math.min(100, Math.round((currentMemberCount / maxMembers) * 100)) : 0

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setMembers([])
      setPendingInvites([])
      setLoading(false)
      return
    }
    setError(null)
    try {
      const { data } = await api.get<{ members: Member[]; pendingInvites?: PendingInvite[] }>(
        `/workspaces/${currentWorkspace.id}/members`
      )
      setMembers(data.members ?? [])
      setPendingInvites(data.pendingInvites ?? [])
    } catch (e: unknown) {
      setMembers([])
      setPendingInvites([])
      setError(e instanceof Error ? e.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    setLoading(true)
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace?.id || !inviteEmail.trim()) return
    setInviteError(null)
    setLastInviteLink(null)
    setInviting(true)
    try {
      const { data } = await api.post<{ member?: Member; pendingInvite?: boolean; inviteLink?: string }>(
        `/workspaces/${currentWorkspace.id}/members`,
        { email: inviteEmail.trim() }
      )
      if (data.member) {
        setInviteEmail('')
        setInviteOpen(false)
        await fetchMembers()
        await refreshWorkspaceLimits()
      } else if (data.pendingInvite && data.inviteLink) {
        setLastInviteLink(data.inviteLink)
        setInviteEmail('')
        await fetchMembers()
        await refreshWorkspaceLimits()
      }
    } catch (e: unknown) {
      const res = e as { response?: { data?: { message?: string; error?: string } } }
      const d = res?.response?.data
      setInviteError(d?.message ?? d?.error ?? (e instanceof Error ? e.message : 'Failed to invite'))
    } finally {
      setInviting(false)
    }
  }

  const copyInviteLink = () => {
    if (!lastInviteLink) return
    navigator.clipboard.writeText(lastInviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyInviteLink = () => {
    if (lastInviteLink) {
      navigator.clipboard.writeText(lastInviteLink).then(() => {
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      })
    } else {
      setInviteOpen(true)
      setInviteError(null)
      setInviteEmail('')
    }
  }

  const handleResendInvite = async (email: string) => {
    if (!currentWorkspace?.id) return
    setResendingEmail(email)
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/invites/resend`, { email })
      await fetchMembers()
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(res || 'Failed to resend invite')
    } finally {
      setResendingEmail(null)
    }
  }

  const handleRemove = async () => {
    if (!currentWorkspace?.id || !removeTarget) return
    setRemoving(true)
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${removeTarget.userId}`)
      setRemoveTarget(null)
      await fetchMembers()
      await refreshWorkspaceLimits()
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(res || 'Failed to remove member')
    } finally {
      setRemoving(false)
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Select a workspace to manage members.</p>
        </div>
      </div>
    )
  }

  const filteredMembers = filter
    ? members.filter(
        (m) =>
          (m.fullName || '').toLowerCase().includes(filter.toLowerCase()) ||
          m.email.toLowerCase().includes(filter.toLowerCase())
      )
    : members

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-8 py-7 pb-20">

        {/* Page header */}
        <div
          className="mb-5 flex items-start justify-between gap-6 pb-5"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <div>
            <span
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--ink-4)' }}
            >
              Settings
            </span>
            <h1
              className="text-[22px] font-semibold leading-tight tracking-[-0.015em]"
              style={{ color: 'var(--ink)', marginBottom: 4 }}
            >
              Members
            </h1>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
              People in this workspace. You can invite up to {maxMembers} member{maxMembers !== 1 ? 's' : ''} on the {planDisplayName} plan.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border text-[13px] font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: 'var(--line-2)', color: 'var(--ink)', background: 'var(--surface)', boxShadow: '0 1px 0 rgba(0,0,0,0.02)' }}
            >
              {linkCopied ? <Check className="h-[14px] w-[14px]" /> : <Link className="h-[14px] w-[14px]" />}
              {linkCopied ? 'Copied!' : 'Copy invite link'}
            </button>
            {isOwner && (
              <PermissionButton
                feature="inviteMembers"
                onClick={() => { setInviteOpen(true); setInviteError(null); setInviteEmail('') }}
                showCrownIcon
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--ink)' }}
              >
                <Plus className="h-[14px] w-[14px]" />
                Invite member
              </PermissionButton>
            )}
          </div>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-[13px]"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid rgba(195,54,101,0.18)' }}
          >
            {error}
          </div>
        )}

        {/* Seat meter */}
        <div
          className="mb-4 flex flex-col gap-2 rounded-xl p-[14px_18px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--ink-4)' }}
            >
              Seats
            </span>
            <span
              className="text-[12.5px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}
            >
              {currentMemberCount} of {maxMembers} used
            </span>
          </div>
          <div
            className="h-[4px] overflow-hidden rounded-full"
            style={{ background: 'var(--bg-2)' }}
          >
            <span
              className="block h-full rounded-full transition-all duration-500"
              style={{
                width: `${seatPct}%`,
                background: seatPct >= 90 ? 'var(--danger)' : 'var(--accent)',
              }}
            />
          </div>
          <p className="text-[12px]" style={{ color: 'var(--ink-4)' }}>
            {seatsRemaining > 0 ? (
              <>
                {seatsRemaining} seat{seatsRemaining !== 1 ? 's' : ''} remaining on {planDisplayName}.{' '}
                {nextPlan && (
                  <a
                    href={`/dashboard/${currentWorkspace.id}/settings/plans`}
                    className="transition-colors"
                    style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-strong)', paddingBottom: 1 }}
                    onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)' }}
                    onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--line-strong)'; el.style.color = 'var(--ink)' }}
                  >
                    Upgrade to {nextPlan.displayName}
                  </a>
                )}{' '}
                {nextPlan && `for ${nextPlan.maxMembers} seats.`}
              </>
            ) : (
              <>
                Seat limit reached.{' '}
                {nextPlan && (
                  <a
                    href={`/dashboard/${currentWorkspace.id}/settings/plans`}
                    style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-strong)', paddingBottom: 1 }}
                  >
                    Upgrade to {nextPlan.displayName}
                  </a>
                )}{' '}
                {nextPlan && `for ${nextPlan.maxMembers} seats.`}
              </>
            )}
          </p>
        </div>

        {/* Active members card */}
        <div
          className="overflow-hidden rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          {/* Card header */}
          <div
            className="flex items-center justify-between px-[18px] py-[14px]"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
              Active members
            </span>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="rounded-lg px-3 text-[13px] outline-none"
              style={{
                width: 200,
                height: 28,
                border: '1px solid var(--line)',
                background: 'var(--bg)',
                color: 'var(--ink)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)' }}
            />
          </div>

          {/* Table */}
          <div>
            {/* Head row */}
            <div
              className="grid px-[18px] py-[10px]"
              style={{
                gridTemplateColumns: '1.4fr 0.8fr 0.8fr 60px',
                gap: 16,
                background: 'var(--surface-2)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--ink-4)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
              }}
            >
              <span>Member</span>
              <span>Role</span>
              <span>Joined</span>
              <span />
            </div>

            {loading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="grid items-center px-[18px]"
                    style={{
                      gridTemplateColumns: '1.4fr 0.8fr 0.8fr 60px',
                      gap: 16,
                      paddingTop: 14,
                      paddingBottom: 14,
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full" style={{ background: 'var(--bg-2)' }} />
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />
                        <div className="h-2.5 w-40 animate-pulse rounded" style={{ background: 'var(--bg-2)', opacity: 0.6 }} />
                      </div>
                    </div>
                    <div className="h-5 w-14 animate-pulse rounded-full" style={{ background: 'var(--bg-2)' }} />
                    <div className="h-3 w-20 animate-pulse rounded" style={{ background: 'var(--bg-2)' }} />
                    <div />
                  </div>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <div
                className="flex items-center justify-center gap-2 py-10 text-[13px]"
                style={{ borderTop: '1px solid var(--line)', color: 'var(--ink-4)' }}
              >
                <Users className="h-4 w-4" />
                {filter ? 'No members match your filter.' : 'No members yet.'}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const colors = getAvatarColor(member.email)
                const initials = getInitials(member.fullName, member.email)
                const isCurrentUser = member.userId === user?.id
                const canRemove = isOwner && member.role === 'member' && !isCurrentUser

                return (
                  <div
                    key={member.id}
                    className="grid items-center px-[18px]"
                    style={{
                      gridTemplateColumns: '1.4fr 0.8fr 0.8fr 60px',
                      gap: 16,
                      paddingTop: 12,
                      paddingBottom: 12,
                      borderTop: '1px solid var(--line)',
                      fontSize: 13,
                    }}
                  >
                    {/* Member info */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{ background: colors.bg, color: colors.fg, letterSpacing: '0.02em' }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                          {member.fullName || member.email}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-[11px] font-normal" style={{ color: 'var(--ink-4)' }}>you</span>
                          )}
                        </div>
                        {member.fullName && (
                          <div
                            className="truncate text-[12px]"
                            style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
                          >
                            {member.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{ background: 'var(--bg-2)', color: 'var(--ink-2)' }}
                      >
                        {member.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                    </div>

                    {/* Joined */}
                    <div
                      className="text-[12.5px]"
                      style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
                    >
                      {member.joinedAt ? formatDate(member.joinedAt) : '—'}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      {canRemove && (
                        <MemberMenu onRemove={() => setRemoveTarget(member)} />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Pending invitations card */}
        <div
          className="mt-4 overflow-hidden rounded-xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          <div
            className="px-[18px] py-[14px]"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Pending invitations</div>
            <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-4)' }}>Invitations expire after 7 days.</div>
          </div>

          {pendingInvites.length === 0 ? (
            <div
              className="flex items-center justify-center gap-2 py-10 text-[13px]"
              style={{ color: 'var(--ink-4)' }}
            >
              <Users className="h-[18px] w-[18px]" />
              <span>No pending invitations.</span>
            </div>
          ) : (
            <div>
              {/* Pending head row */}
              <div
                className="grid px-[18px] py-[10px]"
                style={{
                  gridTemplateColumns: '1.4fr 0.8fr 0.8fr 60px',
                  gap: 16,
                  background: 'var(--surface-2)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--ink-4)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                }}
              >
                <span>Email</span>
                <span>Status</span>
                <span>Expires</span>
                <span />
              </div>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.email}
                  className="grid items-center px-[18px]"
                  style={{
                    gridTemplateColumns: '1.4fr 0.8fr 0.8fr 60px',
                    gap: 16,
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderTop: '1px solid var(--line)',
                    fontSize: 13,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: '#fdf3e3', color: '#b86a17' }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 truncate" style={{ color: 'var(--ink)' }}>{inv.email}</div>
                  </div>

                  <div>
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ background: '#fdf3e3', color: '#b86a17' }}
                    >
                      Pending
                    </span>
                  </div>

                  <div
                    className="text-[12.5px]"
                    style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatDate(inv.expiresAt)}
                  </div>

                  <div className="flex justify-end">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv.email)}
                        disabled={resendingEmail === inv.email}
                        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)] disabled:opacity-50"
                        style={{ color: 'var(--ink-4)' }}
                        title="Resend invitation"
                      >
                        {resendingEmail === inv.email ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite panel */}
        {inviteOpen && (
          <div
            className="mt-4 overflow-hidden rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
          >
            <div
              className="flex items-start justify-between gap-4 px-[18px] py-[14px]"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Invite by email</p>
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--ink-4)' }}>
                  If they already have an account they&apos;re added immediately, otherwise we send a link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setInviteOpen(false); setInviteError(null); setLastInviteLink(null) }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-2)]"
                style={{ color: 'var(--ink-4)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-[18px]">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--ink-4)' }} />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none"
                    style={{ border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-[6px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--ink)' }}
                >
                  {inviting ? <Loader2 className="h-[14px] w-[14px] animate-spin" /> : 'Send invite'}
                </button>
              </div>

              {inviteError && (
                <p className="mt-2 text-[12.5px]" style={{ color: 'var(--danger)' }}>{inviteError}</p>
              )}

              {lastInviteLink && (
                <div
                  className="mt-4 rounded-lg p-4"
                  style={{ background: '#e6f7f1', border: '1px solid rgba(14,155,107,0.2)' }}
                >
                  <p className="text-[13px] font-medium" style={{ color: '#0e9b6b' }}>Invite sent</p>
                  <p className="mt-0.5 text-[12px]" style={{ color: '#0e9b6b', opacity: 0.85 }}>
                    We emailed them a link. You can also copy it below to share manually.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lastInviteLink}
                      className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
                      style={{ border: '1px solid rgba(14,155,107,0.25)', background: 'var(--surface)', color: 'var(--ink-2)' }}
                    />
                    <button
                      type="button"
                      onClick={copyInviteLink}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium"
                      style={{ border: '1px solid rgba(14,155,107,0.3)', background: 'var(--surface)', color: '#0e9b6b' }}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Remove member modal */}
      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Remove member</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              Remove{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {removeTarget.fullName || removeTarget.email}
              </strong>{' '}
              from this workspace? They will lose access to all agents immediately.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removing}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium"
                style={{ border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-2)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--danger)' }}
              >
                {removing ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
