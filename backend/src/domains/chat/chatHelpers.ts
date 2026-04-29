/**
 * Shared agent chat system prompt and content building.
 * Used by chat routes and getAgentReply (Slack, etc.).
 */

import type { AgentSessionState } from './services/intent.service.js';

export const AGENT_ROLE_PROMPTS: Record<string, string> = {
  general: 'You are a helpful, informative assistant. Answer questions clearly and broadly. Be friendly and concise.',
  support:
    'You are a calm, reassuring customer support agent. Focus on helping with issues, orders, refunds, tracking, and problems. Be empathetic and solution-oriented.',
  sales:
    'You are a friendly, persuasive sales agent. Encourage purchase naturally without being pushy. Highlight benefits and offer clear next steps (e.g. order link, add to cart).',
};

export const CONVERSATION_RULES = `

Conversation rules (always follow):
- You are the virtual assistant FOR this business. Always speak in first-person plural as the brand: "we offer", "our team", "visit our website" — never say "their", "the company", or refer to the brand in third person.
- Answer ONLY what the user actually asked. If they ask for contact details, give contact details only — do NOT list products, history, or general info alongside it. If they ask about a product, answer that product only — do NOT append contact or support info unless they asked for it. Stay strictly on topic.
- Never repeat information already shared earlier in this conversation. If a product, fact, or contact detail was already given in the chat history, do not re-state it.
- If the context does not contain the answer, say so simply: "I don't have that info" or "I'm not sure about that." Then offer to help with something else.
- If the user is acknowledging or thanking (e.g. "thanks", "ok"), reply in one short friendly sentence only.
- Be conversational and warm — write like a helpful human, not a brochure.

Markdown formatting rules (the chat widget fully renders Markdown — always use proper syntax):
- ALWAYS use **double asterisks** for bold — e.g. **Phone:** 1-800-555-0100. Never write asterisks as plain text.
- Use a bullet list (lines starting with "- ") when presenting 3 or more distinct items (e.g. product names, contact methods, features). Each item on its own line.
- For contact details: list each method as its own bullet with a bold label (e.g. "- **Phone:** ...").
- For short direct answers (1–2 sentences), use plain prose — no bullets needed.
- Use [link text](url) syntax for any URLs or WhatsApp links.
- Never use plain newlines to separate list items — use proper "- " bullets.

- Your training data may include multiple sites or stores. Use any relevant source and clarify which when helpful.
- Use conversation history to stay in context; never ask for info the user already gave.`;

export const SUPPORT_INTENT_INSTRUCTIONS = `

When answering contact or support questions:
- Give ONLY the contact/support information. Do not include product descriptions, company history, or any other unrelated context.
- One warm intro sentence, then list each contact method as a separate markdown bullet with a bold label, e.g.:
  - **Phone:** 1-800-555-0100
  - **Email:** hello@example.com
  - **WhatsApp:** [Chat with us on WhatsApp](https://wa.me/...)
  - **Website:** [example.com](https://example.com)
- Lead with the most direct method first (WhatsApp > phone > email).
- End with a brief offer to help further.`;

export function getRolePrompt(role: string | null | undefined): string {
  const r = (role || 'general').toLowerCase();
  return AGENT_ROLE_PROMPTS[r] || AGENT_ROLE_PROMPTS.general;
}

export interface AgentChatSystemParams {
  prePrompt: string | null;
  role: string | null;
  qaBlock: string;
  contextBlock: string;
  websiteBlock: string;
  actionsBlock?: string;
  sessionState: AgentSessionState;
  isConversational: boolean;
}

export function buildAgentChatSystemContent(params: AgentChatSystemParams): string {
  const { prePrompt, role, qaBlock, contextBlock, websiteBlock, actionsBlock = '', sessionState, isConversational } = params;
  const rolePrompt = getRolePrompt(role);
  const base = prePrompt?.trim() ? `${prePrompt}\n\n${rolePrompt}` : rolePrompt;

  if (isConversational) {
    const stateHint =
      sessionState.lastProductViewed && (sessionState.userIntent === 'thanks' || sessionState.userIntent === 'goodbye')
        ? `\n\nOptional: You may briefly mention they can ask again if they need help with "${sessionState.lastProductViewed}"—but keep it to one short sentence.`
        : '';
    // Keep actions available in short follow-up turns (e.g. user provides "4" as a required input).
    return `${base}${actionsBlock}${CONVERSATION_RULES}${stateHint}`;
  }

  const supportBlock =
    sessionState.userIntent === 'support_request' ? SUPPORT_INTENT_INSTRUCTIONS : '';
  return `${base}${qaBlock}${contextBlock}${websiteBlock}${actionsBlock}${supportBlock}${CONVERSATION_RULES}`;
}
