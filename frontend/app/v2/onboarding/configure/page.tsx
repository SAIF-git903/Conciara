'use client'

import { useRouter } from 'next/navigation'
import ConfigureStep from '@/components/v2/onboarding/ConfigureStep'
import { resetOnboardingAndGoToWorkspace } from '@/lib/v2-onboarding'

export default function OnboardingConfigurePage() {
  const router = useRouter()
  return (
    <ConfigureStep
      nextPath="/v2/onboarding/personality"
      router={router}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
    />
  )
}
