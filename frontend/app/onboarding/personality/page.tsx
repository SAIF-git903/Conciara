'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/onboarding/PersonalityStep'
import { useAuth } from '@/contexts/AuthContext'
import { resetOnboardingAndGoToWorkspace, getOnboardingWorkspaceId } from '@/lib/onboarding'
import { buildDashboardUrl } from '@/lib/dashboard-url'

export default function OnboardingPersonalityPage() {
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
          router.push(`/dashboard?agent=${agentId}`)
        }
      }}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
      submittingLabel="Taking you to dashboard..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
