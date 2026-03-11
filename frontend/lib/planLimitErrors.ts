/**
 * Plan-limit error codes from API (403/402). Use these to drive UI, not message strings.
 */

export const PLAN_LIMIT_CODES = {
  AGENT_LIMIT_REACHED: 'AGENT_LIMIT_REACHED',
  MEMBER_LIMIT_REACHED: 'MEMBER_LIMIT_REACHED',
  STORAGE_LIMIT_REACHED: 'STORAGE_LIMIT_REACHED',
  API_ACCESS_RESTRICTED: 'API_ACCESS_RESTRICTED',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',
} as const

export type PlanLimitCode = (typeof PLAN_LIMIT_CODES)[keyof typeof PLAN_LIMIT_CODES]

export interface PlanLimitErrorBody {
  code: PlanLimitCode
  message: string
  current?: number
  limit?: number
  plan?: string
}

export function isPlanLimitError(
  e: unknown,
  code?: PlanLimitCode
): e is { response: { status: number; data: PlanLimitErrorBody } } {
  const data = (e as { response?: { data?: { code?: string } } })?.response?.data
  if (!data || typeof data.code !== 'string') return false
  if (code) return data.code === code
  return Object.values(PLAN_LIMIT_CODES).includes(data.code as PlanLimitCode)
}
