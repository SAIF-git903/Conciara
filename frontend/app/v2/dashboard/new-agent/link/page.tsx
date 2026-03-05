'use client'

import { useRouter } from 'next/navigation'
import LinkStep from '@/components/v2/onboarding/LinkStep'
import { redirectNewAgentToDashboard } from '@/lib/v2-onboarding'

export default function NewAgentLinkPage() {
  const router = useRouter()
  return (
    <LinkStep
      nextPath="/v2/dashboard/new-agent/configure"
      router={router}
      onForbidden={() => redirectNewAgentToDashboard(router)}
    />
  )
}
