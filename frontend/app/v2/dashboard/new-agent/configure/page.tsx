'use client'

import { useRouter } from 'next/navigation'
import ConfigureStep from '@/components/v2/onboarding/ConfigureStep'
import { redirectNewAgentToDashboard } from '@/lib/v2-onboarding'
import { div } from 'framer-motion/client'

export default function NewAgentConfigurePage() {
  const router = useRouter()
  return (
    <div className='mb-10'>
      <ConfigureStep
        nextPath="/v2/dashboard/new-agent/personality"
        router={router}
        onForbidden={() => redirectNewAgentToDashboard(router)}
      />
    </div>
  )
}
