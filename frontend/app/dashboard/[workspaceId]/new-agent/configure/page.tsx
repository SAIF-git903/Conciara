'use client'

import { useRouter, useParams } from 'next/navigation'
import ConfigureStep from '@/components/onboarding/ConfigureStep'
import { redirectNewAgentToDashboard } from '@/lib/onboarding'

export default function NewAgentConfigurePage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : null
  const nextPath = workspaceId ? `/dashboard/${workspaceId}/new-agent/personality` : '/dashboard'

  return (
    <div className='mb-10'>
      <ConfigureStep
        nextPath={nextPath}
        router={router}
        onForbidden={() => redirectNewAgentToDashboard(router)}
      />
    </div>
  )
}
