'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function NewAgentPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : null

  useEffect(() => {
    if (workspaceId) {
      router.replace(`/dashboard/${workspaceId}/new-agent/link`)
    } else {
      router.replace('/dashboard')
    }
  }, [router, workspaceId])

  return null
}
