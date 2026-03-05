'use client'

import { useRouter } from 'next/navigation'
import LinkStep from '@/components/v2/onboarding/LinkStep'
import { resetOnboardingAndGoToWorkspace } from '@/lib/v2-onboarding'

export default function OnboardingLinkPage() {
  const router = useRouter()
  return (
    <LinkStep
      nextPath="/v2/onboarding/configure"
      router={router}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
    />
  )
}
