'use client'

import { useRouter } from 'next/navigation'
import LinkStep from '@/components/onboarding/LinkStep'
import { resetOnboardingAndGoToWorkspace } from '@/lib/onboarding'

export default function OnboardingLinkPage() {
  const router = useRouter()
  return (
    <LinkStep
      nextPath="/onboarding/configure"
      router={router}
      onForbidden={() => resetOnboardingAndGoToWorkspace(router)}
    />
  )
}
