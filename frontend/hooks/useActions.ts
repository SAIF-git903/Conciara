'use client'

import { useCallback, useMemo, useState } from 'react'
import api from '@/lib/api'
import type { ChatbotAction, ActionType, ActionsByType, SupportedActionConfig } from '@/components/actions/types'

interface UseActionsArgs {
  workspaceId?: number
  chatbotId?: string
}

interface SaveActionPayload {
  id?: string
  type: ActionType
  name: string
  isEnabled: boolean
  config: SupportedActionConfig
  lastKnownUpdatedAt?: string
}

function ensureNumericId(value?: string): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function useActions({ workspaceId, chatbotId }: UseActionsArgs) {
  const [actions, setActions] = useState<ChatbotAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canFetch = Boolean(workspaceId) && Boolean(ensureNumericId(chatbotId))
  const numericChatbotId = ensureNumericId(chatbotId)

  const basePath = useMemo(() => {
    if (!workspaceId || !numericChatbotId) return null
    return `/workspaces/${workspaceId}/agents/${numericChatbotId}/actions`
  }, [workspaceId, numericChatbotId])

  const loadActions = useCallback(async () => {
    if (!basePath) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<{ actions: ChatbotAction[] }>(basePath)
      setActions(data.actions ?? [])
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : 'Failed to load actions'
      setError(message || 'Failed to load actions')
    } finally {
      setLoading(false)
    }
  }, [basePath])

  const saveAction = useCallback(
    async (payload: SaveActionPayload) => {
      if (!basePath) throw new Error('Missing workspace or chatbot context')
      const body = {
        type: payload.type,
        name: payload.name,
        isEnabled: payload.isEnabled,
        config: payload.config,
        ...(payload.lastKnownUpdatedAt ? { lastKnownUpdatedAt: payload.lastKnownUpdatedAt } : {}),
      }
      if (!payload.id) {
        const { data } = await api.post<{ action: ChatbotAction }>(basePath, body)
        setActions((prev) => [data.action, ...prev])
        return data.action
      }
      const { data } = await api.put<{ action: ChatbotAction }>(`${basePath}/${payload.id}`, body)
      setActions((prev) => prev.map((action) => (action.id === payload.id ? data.action : action)))
      return data.action
    },
    [basePath]
  )

  const deleteAction = useCallback(
    async (actionId: string) => {
      if (!basePath) throw new Error('Missing workspace or chatbot context')
      await api.delete(`${basePath}/${actionId}`)
      setActions((prev) => prev.filter((action) => action.id !== actionId))
    },
    [basePath]
  )

  const toggleAction = useCallback(
    async (actionId: string, isEnabled: boolean) => {
      if (!basePath) throw new Error('Missing workspace or chatbot context')
      const { data } = await api.patch<{ action: ChatbotAction }>(`${basePath}/${actionId}/toggle`, { isEnabled })
      setActions((prev) => prev.map((action) => (action.id === actionId ? data.action : action)))
      return data.action
    },
    [basePath]
  )

  const validateFunctionName = useCallback(
    async (functionName: string, excludeActionId?: string): Promise<boolean> => {
      if (!basePath || !functionName.trim()) return true
      const { data } = await api.get<{ isUnique: boolean }>(`${basePath}/validate-function-name`, {
        params: {
          functionName: functionName.trim(),
          ...(excludeActionId ? { excludeActionId } : {}),
        },
      })
      return Boolean(data.isUnique)
    },
    [basePath]
  )

  const actionsByType = useMemo<ActionsByType>(() => {
    return actions.reduce<ActionsByType>((acc, action) => {
      if (!acc[action.type]) acc[action.type] = []
      acc[action.type].push(action)
      return acc
    }, {})
  }, [actions])

  return {
    actions,
    actionsByType,
    loading,
    error,
    canFetch,
    loadActions,
    saveAction,
    deleteAction,
    toggleAction,
    validateFunctionName,
  }
}
