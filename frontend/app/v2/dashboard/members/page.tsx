'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Mail, Trash2, Loader2, Copy, Check, Send } from 'lucide-react'
import { useDashboard } from '@/contexts/DashboardContext'
import { useV2Auth } from '@/contexts/V2AuthContext'
import v2Api from '@/lib/v2-api'

type WorkspaceRole = 'owner' | 'member'

type Member = {
  id: number
  userId: number
  email: string
  fullName: string | null
  role: WorkspaceRole
}

type PendingInvite = {
  email: string
  expiresAt: string
  createdAt: string
}

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  member: 'Member',
}

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: 'bg-slate-200 text-slate-800',
  member: 'bg-slate-100 text-slate-600',
}

export default function MembersPage() {
  const { currentWorkspace } = useDashboard()
  const { user } = useV2Auth()
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isOwner = Boolean(
    currentWorkspace?.id && user?.workspaces?.find((w) => w.id === currentWorkspace.id)?.role === 'owner'
  )

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setMembers([])
      setPendingInvites([])
      setLoading(false)
      return
    }
    setError(null)
    try {
      const { data } = await v2Api.get<{ members: Member[]; pendingInvites?: PendingInvite[] }>(
        `/v2/workspaces/${currentWorkspace.id}/members`
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
      const { data } = await v2Api.post<{ member?: Member; pendingInvite?: boolean; inviteLink?: string; expiresAt?: string }>(
        `/v2/workspaces/${currentWorkspace.id}/members`,
        { email: inviteEmail.trim() }
      )
      if (data.member) {
        setInviteEmail('')
        setInviteOpen(false)
        await fetchMembers()
      } else if (data.pendingInvite && data.inviteLink) {
        setLastInviteLink(data.inviteLink)
        setInviteEmail('')
        await fetchMembers()
      }
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setInviteError(res || (e instanceof Error ? e.message : 'Failed to invite'))
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

  const handleResendInvite = async (email: string) => {
    if (!currentWorkspace?.id) return
    setResendingEmail(email)
    setError(null)
    try {
      await v2Api.post<{ inviteLink: string; expiresAt: string }>(
        `/v2/workspaces/${currentWorkspace.id}/invites/resend`,
        { email }
      )
      await fetchMembers()
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(res || (e instanceof Error ? e.message : 'Failed to resend invite'))
    } finally {
      setResendingEmail(null)
    }
  }

  const handleRemove = async () => {
    if (!currentWorkspace?.id || !removeTarget) return
    setRemoving(true)
    try {
      await v2Api.delete(
        `/v2/workspaces/${currentWorkspace.id}/members/${removeTarget.userId}`
      )
      setRemoveTarget(null)
      await fetchMembers()
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(res || (e instanceof Error ? e.message : 'Failed to remove member'))
    } finally {
      setRemoving(false)
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-slate-600">Select a workspace to manage members.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Members</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isOwner
                ? 'People in this workspace. As owner, you can invite and remove members.'
                : 'People in this workspace. Only the owner can invite or remove members.'}
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setInviteOpen(true)
                setInviteError(null)
                setInviteEmail('')
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Invite member
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-100">
                {members.length === 0 && pendingInvites.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No members in this workspace yet.
                  </div>
                ) : (
                  <>
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 px-4 py-3 first:rounded-t-xl hover:bg-slate-50/80"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                          {(member.fullName || member.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">
                            {member.fullName || member.email}
                          </p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[member.role]}`}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                        {isOwner && member.role === 'member' && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(member)}
                              className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove member"
                              title="Remove from workspace"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.email}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/80 last:rounded-b-xl"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{inv.email}</p>
                          <p className="text-xs text-slate-500">Invitation pending</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          Pending
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleResendInvite(inv.email)}
                            disabled={resendingEmail === inv.email}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            title="Resend invitation email"
                          >
                            {resendingEmail === inv.email ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Resend invitation
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {inviteOpen && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Invite by email</p>
              <p className="mt-0.5 text-xs text-slate-500">
                If they already have an account, they&apos;re added immediately. If not, we&apos;ll give you a link to send them—they&apos;ll create an account and join as a member.
              </p>
              <form onSubmit={handleInvite} className="mt-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@company.com"
                      required
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send invite'
                    )}
                  </button>
                </div>
                {inviteError && (
                  <p className="mt-2 text-sm text-red-600">{inviteError}</p>
                )}
                {lastInviteLink && (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-medium text-emerald-800">Invite sent by email</p>
                    <p className="mt-0.5 text-xs text-emerald-700">
                      We&apos;ve sent them an email with a link to create an account and join the workspace. You can also copy the link below to share manually.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={lastInviteLink}
                        className="min-w-0 flex-1 rounded border border-emerald-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={copyInviteLink}
                        className="inline-flex items-center gap-1.5 rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
              <button
                type="button"
                onClick={() => { setInviteOpen(false); setInviteError(null); setLastInviteLink(null) }}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {removeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 id="remove-member-title" className="text-lg font-semibold text-slate-900">
              Remove member
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Remove <strong>{removeTarget.fullName || removeTarget.email}</strong> from this workspace? They will lose access to all agents in this workspace.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removing}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
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
