'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/onboarding/PersonalityStep'
import { useAuth } from '@/contexts/AuthContext'
import { redirectNewAgentToDashboard, getOnboardingWorkspaceId } from '@/lib/onboarding'
import { buildDashboardUrl } from '@/lib/dashboard-url'

export default function NewAgentPersonalityPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  return (
    <PersonalityStep
      onSuccess={async (agentId) => {
        await refreshUser()
        const workspaceId = getOnboardingWorkspaceId()
        if (workspaceId) {
          router.push(buildDashboardUrl(workspaceId, { agentId: String(agentId), subPath: 'playground' }))
        } else {
          router.push(`/dashboard/playground?agent=${agentId}`)
        }
      }}
      onForbidden={() => redirectNewAgentToDashboard(router)}
      submittingLabel="Taking you to Playground..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
