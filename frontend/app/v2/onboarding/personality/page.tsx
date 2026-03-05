'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/v2/onboarding/PersonalityStep'
import { useV2Auth } from '@/contexts/V2AuthContext'
import { resetOnboardingAndGoToWorkspace } from '@/lib/v2-onboarding'

export default function OnboardingPersonalityPage() {
  const router = useRouter()
  const { refreshUser } = useV2Auth()
  return (
    <PersonalityStep
      onSuccess={async (agentId) => {
        await refreshUser()
        router.push(`/v2/dashboard?agent=${agentId}`)
      }}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
      submittingLabel="Taking you to dashboard..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
