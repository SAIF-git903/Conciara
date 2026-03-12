/**
 * Structured plan-limit errors for frontend to act on by code, not message.
 * Use 403 for plan limits (agent, member, storage, API access); 402 for credits.
 */

export const PLAN_LIMIT_CODES = {
  AGENT_LIMIT_REACHED: 'AGENT_LIMIT_REACHED',
  MEMBER_LIMIT_REACHED: 'MEMBER_LIMIT_REACHED',
  STORAGE_LIMIT_REACHED: 'STORAGE_LIMIT_REACHED',
  API_ACCESS_RESTRICTED: 'API_ACCESS_RESTRICTED',
  CREDITS_EXHAUSTED: 'CREDITS_EXHAUSTED',
} as const;

export type PlanLimitCode = (typeof PLAN_LIMIT_CODES)[keyof typeof PLAN_LIMIT_CODES];

export interface PlanLimitErrorBody {
  code: PlanLimitCode;
  message: string;
  current?: number;
  limit?: number;
  plan?: string;
}

export class PlanLimitError extends Error {
  readonly code: PlanLimitCode;
  readonly statusCode: number;
  readonly current?: number;
  readonly limit?: number;
  readonly plan?: string;

  constructor(
    code: PlanLimitCode,
    message: string,
    opts?: { current?: number; limit?: number; plan?: string }
  ) {
    super(message);
    this.name = 'PlanLimitError';
    this.code = code;
    this.statusCode = code === PLAN_LIMIT_CODES.CREDITS_EXHAUSTED ? 402 : 403;
    this.current = opts?.current;
    this.limit = opts?.limit;
    this.plan = opts?.plan;
  }

  toJSON(): PlanLimitErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.current !== undefined && { current: this.current }),
      ...(this.limit !== undefined && { limit: this.limit }),
      ...(this.plan !== undefined && { plan: this.plan }),
    };
  }
}

export function sendPlanLimitError(
  res: import('express').Response,
  error: PlanLimitError
): void {
  res.status(error.statusCode).json(error.toJSON());
}
