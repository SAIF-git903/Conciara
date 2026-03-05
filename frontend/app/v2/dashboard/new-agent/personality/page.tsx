'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/v2/onboarding/PersonalityStep'
import { useV2Auth } from '@/contexts/V2AuthContext'
import { redirectNewAgentToDashboard } from '@/lib/v2-onboarding'

export default function NewAgentPersonalityPage() {
  const router = useRouter()
  const { refreshUser } = useV2Auth()
  return (
    <PersonalityStep
      onSuccess={async (agentId) => {
        await refreshUser()
        router.push(`/v2/dashboard/playground?agent=${agentId}`)
      }}
      onForbidden={() => redirectNewAgentToDashboard(router)}
      submittingLabel="Taking you to Playground..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
