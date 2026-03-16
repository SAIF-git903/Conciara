'use client'

import { useRouter, useParams } from 'next/navigation'
import LinkStep from '@/components/onboarding/LinkStep'
import { redirectNewAgentToDashboard } from '@/lib/onboarding'

export default function NewAgentLinkPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : null
  const nextPath = workspaceId ? `/dashboard/${workspaceId}/new-agent/configure` : '/dashboard'

  const onForbidden = () => redirectNewAgentToDashboard(router)

  return (
    <LinkStep
      nextPath={nextPath}
      router={router}
      onForbidden={onForbidden}
    />
  )
}
