/**
 * Platform admin (Conciara staff) checks.
 *
 * The global `users.role` column is NOT an authorization signal: every self-registered
 * user is created with role 'owner'. Workspace permissions come from workspace_members;
 * platform-wide admin access comes only from the PLATFORM_ADMIN_EMAILS allowlist.
 */

function adminEmails(): Set<string> {
  return new Set(
    (process.env.PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPlatformAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return adminEmails().has(user.email.trim().toLowerCase());
}
