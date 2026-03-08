'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/onboarding/PersonalityStep'
import { useAuth } from '@/contexts/AuthContext'
import { resetOnboardingAndGoToWorkspace } from '@/lib/onboarding'

export default function OnboardingPersonalityPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  return (
    <PersonalityStep
      onSuccess={async (agentId) => {
        await refreshUser()
        router.push(`/dashboard?agent=${agentId}`)
      }}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
      submittingLabel="Taking you to dashboard..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
