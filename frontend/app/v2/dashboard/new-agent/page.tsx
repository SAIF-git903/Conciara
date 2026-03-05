'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAgentPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/v2/dashboard/new-agent/link')
  }, [router])
  return null
}
