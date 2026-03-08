'use client'

import { useRouter } from 'next/navigation'
import PersonalityStep from '@/components/onboarding/PersonalityStep'
import { useAuth } from '@/contexts/AuthContext'
import { redirectNewAgentToDashboard } from '@/lib/onboarding'

export default function NewAgentPersonalityPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  return (
    <PersonalityStep
      onSuccess={async (agentId) => {
        await refreshUser()
        router.push(`/dashboard/playground?agent=${agentId}`)
      }}
      onForbidden={() => redirectNewAgentToDashboard(router)}
      submittingLabel="Taking you to Playground..."
      confirmLabel="Confirm & go to Playground"
    />
  )
}
