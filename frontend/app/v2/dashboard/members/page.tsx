'use client'

import { useState } from 'react'
import { Plus, Mail, MoreHorizontal } from 'lucide-react'

type Role = 'Admin' | 'Manager' | 'User'

type Member = {
  id: string
  name: string
  email: string
  role: Role
  avatar?: string
}

// Mock data – replace with API: list workspace members by current workspace ID
const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@company.com', role: 'Admin' },
  { id: '2', name: 'Sam Lee', email: 'sam@company.com', role: 'Manager' },
  { id: '3', name: 'Jordan Smith', email: 'jordan@company.com', role: 'User' },
]

const ROLE_COLORS: Record<Role, string> = {
  Admin: 'bg-slate-200 text-slate-800',
  Manager: 'bg-blue-100 text-blue-800',
  User: 'bg-slate-100 text-slate-600',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Members</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              People in this workspace and their roles. Admins and managers can invite others and change roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Invite member
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 px-4 py-3 first:rounded-t-xl last:rounded-b-xl hover:bg-slate-50/80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[member.role]}`}
                  >
                    {member.role}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Options"
                      title="Change role or remove"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {inviteOpen && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Invite by email</p>
              <p className="mt-0.5 text-xs text-slate-500">They’ll receive an email to join this workspace.</p>
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="email@company.com"
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-[var(--v2-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--v2-primary)]"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-[var(--v2-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Send invite
                </button>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/*
 * MEMBERS – WHAT IT IS AND LOGIC
 *
 * Scope: Members = people in the current WORKSPACE (not per-agent). Same list whether
 * you open Members from the agent sidebar or from Workspace settings → Members.
 *
 * Roles (from your v2 context):
 * - Admin (System Administrator): Full access – settings, billing, all agents, invite/remove members, change roles.
 * - Manager: Can manage agents and users in the workspace; cannot change billing or some workspace settings.
 * - User: Can use assigned agents and view their own activity only.
 *
 * Logic to implement with backend:
 * 1. List: GET /workspaces/:workspaceId/members → show name, email, role, pending (invited but not accepted).
 * 2. Invite: POST /workspaces/:workspaceId/invites { email, role } → send invite email; add row as "Pending".
 * 3. Change role: PATCH /workspaces/:workspaceId/members/:userId { role } – only Admin/Manager.
 * 4. Remove: DELETE /workspaces/:workspaceId/members/:userId – only Admin/Manager; cannot remove last Admin.
 * 5. Permissions: UI for "Invite", "Change role", "Remove" only if current user is Admin or Manager.
 */
