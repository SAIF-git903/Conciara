'use client'

import { useRouter } from 'next/navigation'
import ConfigureStep from '@/components/onboarding/ConfigureStep'
import { resetOnboardingAndGoToWorkspace } from '@/lib/onboarding'

export default function OnboardingConfigurePage() {
  const router = useRouter()
  return (
    <ConfigureStep
      nextPath="/onboarding/personality"
      router={router}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
    />
  )
}
