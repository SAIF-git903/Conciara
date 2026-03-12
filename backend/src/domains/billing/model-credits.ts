/**
 * Credit cost per model (per assistant response).
 * 1 = standard, 2–5 = premium models.
 */

const MODEL_CREDITS: Record<string, number> = {
  'gpt-4o-mini': 1,
  'gpt-3.5-turbo': 1,
  'gpt-4o': 1,
  'gpt-4-turbo': 1,
  'gpt-4': 1,
  'gpt-5.2': 2,
  'gemini-2.5-pro': 2,
  'claude-sonnet': 3,
  'grok-3': 3,
  'grok-4': 4,
  'claude-opus': 5,
};

export function getCreditsForModel(modelId: string | null): number {
  if (!modelId) return 1;
  return MODEL_CREDITS[modelId] ?? 1;
}
