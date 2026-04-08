'use client'

import { useParams } from 'next/navigation'
import ActionsPage from '@/components/actions/ActionsPage'

export default function ChatbotsActionsPage() {
  const params = useParams<{ chatbotId: string }>()
  return <ActionsPage chatbotIdParam={params?.chatbotId} />
}
