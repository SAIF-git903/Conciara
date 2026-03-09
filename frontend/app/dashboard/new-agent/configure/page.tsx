'use client'

import { useRouter } from 'next/navigation'
import ConfigureStep from '@/components/onboarding/ConfigureStep'
import { redirectNewAgentToDashboard } from '@/lib/onboarding'
import { div } from 'framer-motion/client'

export default function NewAgentConfigurePage() {
  const router = useRouter()
  return (
    <div className='mb-10'>
      <ConfigureStep
        nextPath="/dashboard/new-agent/personality"
        router={router}
        onForbidden={() => redirectNewAgentToDashboard(router)}
      />
    </div>
  )
}
