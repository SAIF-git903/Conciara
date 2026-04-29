'use client'

import { useMemo, useState } from 'react'
import api from '@/lib/api'

interface UseActionTestArgs {
  workspaceId?: number
  chatbotId?: string
}

interface ActionTestResult {
  success: boolean
  statusCode: number
  responseBody: unknown
  durationMs: number
}

function toId(value?: string): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function useActionTest({ workspaceId, chatbotId }: UseActionTestArgs) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActionTestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const basePath = useMemo(() => {
    const id = toId(chatbotId)
    if (!workspaceId || !id) return null
    return `/workspaces/${workspaceId}/agents/${id}/actions`
  }, [workspaceId, chatbotId])

  const runTest = async (actionId: string, testInputs: Record<string, unknown>) => {
    if (!basePath) throw new Error('Missing workspace or chatbot context')
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post<ActionTestResult>(`${basePath}/${actionId}/test`, { testInputs })
      setResult(data)
      return data
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { responseBody?: { error?: string }; error?: string } } }).response?.data?.responseBody?.error ||
            (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Failed to run action test'
      setError(message || 'Failed to run action test')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, runTest, setResult, setError }
}
