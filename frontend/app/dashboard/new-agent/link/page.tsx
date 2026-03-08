'use client'

import { useRouter } from 'next/navigation'
import LinkStep from '@/components/onboarding/LinkStep'
import { redirectNewAgentToDashboard } from '@/lib/onboarding'

export default function NewAgentLinkPage() {
  const router = useRouter()
  return (
    <LinkStep
      nextPath="/dashboard/new-agent/configure"
      router={router}
      onForbidden={() => redirectNewAgentToDashboard(router)}
    />
  )
}
