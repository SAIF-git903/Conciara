/**
 * Intent classification for agent chat. Used to decide whether to run RAG or
 * reply conversationally (thanks, confirmation, goodbye, smalltalk).
 */

export type AgentIntent =
  | 'knowledge_query'
  | 'purchase_intent'
  | 'support_request'
  | 'thanks'
  | 'confirmation'
  | 'goodbye'
  | 'smalltalk';

/** Intents that do not require RAG; reply using conversation history only. */
export const CONVERSATIONAL_INTENTS: AgentIntent[] = [
  'thanks',
  'confirmation',
  'goodbye',
  'smalltalk',
];

export function isConversationalIntent(intent: AgentIntent): boolean {
  return CONVERSATIONAL_INTENTS.includes(intent);
}

const THANKS_PATTERNS = [
  /^(thanks?|thank you|thx|ty)\s*!?\s*$/i,
  /^ok(ay)?\s*[,.]?\s*thanks?(\s*!?)?$/i,
  /^great\s*[,.]?\s*thanks?(\s*!?)?$/i,
  /^perfect\s*[,.]?\s*thanks?(\s*!?)?$/i,
  /^cool\s*[,.]?\s*thanks?(\s*!?)?$/i,
  /^got it\s*[,.]?\s*thanks?(\s*!?)?$/i,
  /^thanks?\s*(a lot|so much|anyway)?\s*!?\s*$/i,
];

const CONFIRMATION_PATTERNS = [
  /^(ok|okay|okey)\s*!?\s*$/i,
  /^(yes|yeah|yep|yup)\s*!?\s*$/i,
  /^(sure|sounds good|will do|got it|noted|done|alright)\s*!?\s*$/i,
  /^i (will|'ll) do that\s*!?\s*$/i,
  /^perfect\s*!?\s*$/i,
  /^understood\s*!?\s*$/i,
];

const GOODBYE_PATTERNS = [
  /^(bye|goodbye|good bye)\s*!?\s*$/i,
  /^(see you|later|catch you)\s*!?\s*$/i,
  /^have a good (one|day|night)\s*!?\s*$/i,
  /^(good night|gn|g night)\s*!?\s*$/i,
  /^talk (to you )?later\s*!?\s*$/i,
];

const SMALLTALK_PATTERNS = [
  /^(hi|hello|hey|hiya)\s*!?\s*$/i,
  /^how (are you|r u|ru)\s*[?.]?\s*$/i,
  /^(what'?s up|whats up|sup|wassup)\s*[?.]?\s*$/i,
  /^good (morning|afternoon|evening)\s*!?\s*$/i,
];

const PURCHASE_PATTERNS = [
  /\b(want to|wanna|would like to)\s+(buy|order|get|purchase)\b/i,
  /\b(order|buy|purchase|get)\s+(me\s+)?(the|some|a)\b/i,
  /\badd\s+(to\s+)?(cart|basket)\b/i,
  /\b(how much|price|cost|pay for)\b/i,
  /\bi want\s+(the|a|some)\b/i,
  /\b(available|in stock|in stock)\b/i,
];

const SUPPORT_PATTERNS = [
  /\b(help|assist|support)\b/i,
  /\b(issue|problem|broken|not working|wrong)\b/i,
  /\b(refund|return|exchange)\b/i,
  /\b(track|tracking|delivery|shipping)\b/i,
  /\b(order status|where is my)\b/i,
  /\b(complaint|unhappy|disappointed)\b/i,
  /\bcontact\b/i,
  /\b(reach|get in touch)\b/i,
  /\b(opening|business)\s*hours?\b/i,
  /\byour\s*(address|location|email|phone|number)\b/i,
  /\bhow\s*(do\s*i|can\s*i|to)\s*(contact|reach|call)\b/i,
  /\b(phone|call|email|chat)\s*(you|us|support|team|someone)\b/i,
];

function matchAny(text: string, patterns: RegExp[]): boolean {
  const t = text.trim();
  return patterns.some((p) => p.test(t));
}

export function classifyIntent(userMessage: string): AgentIntent {
  const msg = userMessage.trim();
  if (!msg) return 'smalltalk';

  if (matchAny(msg, THANKS_PATTERNS)) return 'thanks';
  if (matchAny(msg, CONFIRMATION_PATTERNS)) return 'confirmation';
  if (matchAny(msg, GOODBYE_PATTERNS)) return 'goodbye';
  if (matchAny(msg, SMALLTALK_PATTERNS)) return 'smalltalk';
  if (matchAny(msg, PURCHASE_PATTERNS)) return 'purchase_intent';
  if (matchAny(msg, SUPPORT_PATTERNS)) return 'support_request';

  return 'knowledge_query';
}

export interface AgentSessionState {
  lastProductViewed: string | null;
  conversationStage: string;
  userIntent: AgentIntent;
}

const STAGE_PRODUCT_RECOMMENDED = 'product_recommended';
const STAGE_ACKNOWLEDGMENT = 'acknowledgment';
const STAGE_GREETING = 'greeting';
const STAGE_OPEN = 'open';

export function deriveSessionState(
  history: { role: 'user' | 'assistant'; content: string }[],
  currentIntent: AgentIntent
): AgentSessionState {
  let lastProductViewed: string | null = null;
  let conversationStage = STAGE_OPEN;

  const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant?.content) {
    const content = lastAssistant.content;
    if (currentIntent === 'thanks' || currentIntent === 'confirmation') {
      conversationStage = STAGE_ACKNOWLEDGMENT;
    }
    const productMatch = content.match(/(?:^|\s)([A-Z][a-zA-Z0-9\s]+(?:Pro|TWS|AirPods|earbuds)?)\s*(?:for|at|₹|Rs\.|\$)/);
    if (productMatch?.[1]) {
      lastProductViewed = productMatch[1].trim();
      if (conversationStage === STAGE_OPEN) conversationStage = STAGE_PRODUCT_RECOMMENDED;
    }
  }

  if (currentIntent === 'smalltalk' && history.length < 2) conversationStage = STAGE_GREETING;

  return {
    lastProductViewed,
    conversationStage,
    userIntent: currentIntent,
  };
}
