import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Use only OpenAI API
const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({
      apiKey: apiKey,
    })
  : null;

// Check if LLM/credits are available
// Returns true if API key is configured (indicating credits are available)
// Note: This doesn't verify the key is valid, but checks if it's configured
// Actual validation happens when making API calls (will fallback on error)
export function hasLLMCredits(): boolean {
  const hasKey = !!(openai && apiKey);
  if (hasKey) {
    console.log('[LLMService] Credits available - OpenAI API key configured');
  } else {
    console.log('[LLMService] No credits available - OpenAI API key not configured');
  }
  return hasKey;
}

export interface LLMResponse {
  content: string;
  tokens?: number;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public shouldFallback: boolean = true
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

// Check if error indicates we should fallback to dialog tree
export function isLLMLimitError(error: any): boolean {
  if (!error) return false;
  
  // Check status codes
  if (error.status === 429 || error.statusCode === 429) {
    return true; // Rate limit
  }
  
  if (error.status === 402 || error.statusCode === 402) {
    return true; // Quota exceeded
  }
  
  // Check error messages
  const message = error.message?.toLowerCase() || '';
  const errorString = JSON.stringify(error).toLowerCase();
  
  if (
    message.includes('rate limit') ||
    message.includes('quota') ||
    message.includes('limit exceeded') ||
    message.includes('insufficient quota') ||
    errorString.includes('rate limit') ||
    errorString.includes('quota')
  ) {
    return true;
  }
  
  return false;
}

// Check if error is an authentication error (invalid API key)
export function isLLMAuthError(error: any): boolean {
  if (!error) return false;
  
  // Check status codes
  if (error.status === 401 || error.statusCode === 401) {
    return true; // Unauthorized - invalid API key
  }
  
  // Check error messages
  const message = error.message?.toLowerCase() || '';
  const errorString = JSON.stringify(error).toLowerCase();
  
  if (
    message.includes('user not found') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('authentication') ||
    errorString.includes('user not found') ||
    errorString.includes('unauthorized')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Generate a concise, personalized response based on user context and query
 * This replaces the rigid dialog tree approach with dynamic, context-aware responses
 */
export async function generateContextualResponse(
  userMessage: string,
  userContext: string = '', // Can be empty if no user-id provided
  productCatalog?: string,
  maxLength: number = 150, // Keep responses concise (1-2 sentences)
  preprompt?: string // Optional preprompt from dialog tree configuration
): Promise<string> {
  if (!openai || !apiKey) {
    console.warn('[LLMService] OpenAI API key not configured. Falling back to default response.');
    console.warn(`[LLMService] hasKey: ${!!apiKey}`);
    return "I'm here to help you. Could you tell me more about what you're looking for?";
  }

  try {
    // Build the prompt for concise, personalized responses
    // If preprompt is provided, use it as the base; otherwise use default
    // Build system prompt - use preprompt if available, otherwise use intelligent default
    // This makes the chatbot intelligent even without user context
    let systemPrompt = preprompt 
      ? `${preprompt}\n\nIMPORTANT: Keep responses concise (1-2 sentences, ${maxLength} characters or less). Be conversational and direct. Provide helpful, intelligent responses based on the user's question.`
      : `You are an intelligent, helpful, conversational assistant. Your goal is to provide concise, helpful responses in 1-2 sentences maximum (${maxLength} characters or less).

IMPORTANT RULES:
1. Be conversational and friendly, like talking to a friend
2. Provide direct, helpful answers based on the user's question
3. Be intelligent and context-aware - understand what the user is asking
4. If user context is provided, use it to personalize your answer
5. Be specific when possible: mention exact products, specs, or models when relevant
6. Don't ask follow-up questions unless absolutely necessary
7. If you don't know something, be honest but still helpful

Example good response: "Let's troubleshoot this step by step. First, try holding the power button for 10 seconds. If that doesn't work, check if the device is charging. Is the charging indicator showing?"

Example bad response: "I'm here to help you. Could you tell me more about what you're looking for?"`;

    let userPrompt = `User message: "${userMessage}"\n\n`;

    if (userContext && userContext.trim()) {
      userPrompt += `User Context (from history):\n${userContext}\n\n`;
      userPrompt += `IMPORTANT: Use the user's history to interpret their message. For example:\n`;
      userPrompt += `- If they said "I need a laptop" and have gaming history, they likely want a gaming laptop.\n`;
      userPrompt += `- If they mentioned preferences before, incorporate those into your response.\n`;
      userPrompt += `- Personalize your answer based on their past interactions.\n\n`;
    }

    if (productCatalog) {
      userPrompt += `Available Products:\n${productCatalog}\n\n`;
    }

    // Adjust prompt based on whether user context is available
    if (userContext && userContext.trim()) {
      userPrompt += `Based on the user's message AND their history/context, provide a personalized, relevant response in 1-2 sentences. Use their history to understand what they really mean.`;
    } else {
      userPrompt += `Based on the user's message, provide a helpful, intelligent response in 1-2 sentences. Be conversational and address their question directly.`;
    }

    const model = 'gpt-4o-mini'; // Fast and cost-effective
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: Math.floor(maxLength / 3), // Rough estimate: 1 token ≈ 3-4 chars
      temperature: 0.7, // Balance between creativity and consistency
    });

    const content = response.choices[0]?.message?.content?.trim() || '';
    
    // Ensure response is concise
    if (content.length > maxLength) {
      // Truncate to last complete sentence within limit
      const truncated = content.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      return lastPeriod > maxLength * 0.5 
        ? truncated.substring(0, lastPeriod + 1)
        : truncated + '...';
    }
    
    return content;
  } catch (error: any) {
    console.error('Error generating LLM response:', error.message || error);
    
    // Check if this is a limit/quota error that should trigger fallback
    if (isLLMLimitError(error)) {
      console.warn('[LLM] Rate limit or quota exceeded. Will fallback to dialog tree.');
      throw new LLMError(
        'LLM API limit exceeded',
        error.code || 'RATE_LIMIT',
        error.status || error.statusCode || 429,
        true
      );
    }
    
    // For other errors, return a generic fallback message
    // The caller can decide whether to use dialog tree
    throw new LLMError(
      error.message || 'LLM API error',
      error.code,
      error.status || error.statusCode,
      false // Don't force fallback for unknown errors
    );
  }
}

/**
 * Generate a response that combines dialog tree structure with user memory
 * This allows for hybrid approach: use trees when appropriate, but personalize with memory
 */
export async function generateHybridResponse(
  userMessage: string,
  userContext: string = '', // Can be empty if no user-id provided
  dialogTreeContext?: string,
  productCatalog?: string,
  preprompt?: string // Optional preprompt from dialog tree configuration
): Promise<string> {
  if (!openai || !apiKey) {
    return dialogTreeContext || "I'm here to help you. Could you tell me more about what you're looking for?";
  }

  try {
    // If preprompt is provided, use it as the base; otherwise use default
    const systemPrompt = preprompt
      ? `${preprompt}\n\nIMPORTANT: Combine the dialog tree response with user context to create a personalized, concise answer (1-2 sentences max).`
      : `You are a helpful, conversational assistant. Combine the dialog tree response with user context to create a personalized, concise answer (1-2 sentences max).

Rules:
1. Use the dialog tree response as a base, but personalize it with user context
2. If user context contradicts dialog tree, prioritize user context
3. Be concise and direct
4. Don't repeat information the user already knows`;

    let userPrompt = `User message: "${userMessage}"\n\n`;

    if (userContext && userContext.trim()) {
      userPrompt += `User Context (from history):\n${userContext}\n\n`;
      userPrompt += `IMPORTANT: Use the user's history to interpret their message. For example:\n`;
      userPrompt += `- If they said "I need a laptop" and have gaming history, they likely want a gaming laptop.\n`;
      userPrompt += `- Personalize the dialog tree response based on their past preferences.\n\n`;
    }

    if (dialogTreeContext) {
      userPrompt += `Suggested Response (from dialog tree):\n${dialogTreeContext}\n\n`;
    }

    if (productCatalog) {
      userPrompt += `Available Products:\n${productCatalog}\n\n`;
    }

    if (userContext && userContext.trim()) {
      userPrompt += `Generate a personalized, concise response (1-2 sentences) that combines the dialog tree suggestion with user context. Use their history to understand what they really want.`;
    } else {
      userPrompt += `Generate a personalized, concise response (1-2 sentences) that combines the dialog tree suggestion with user context.`;
    }

    const model = 'gpt-4o-mini';
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || dialogTreeContext || "I'm here to help you.";
  } catch (error: any) {
    console.error('Error generating hybrid response:', error.message || error);
    
    // Check if this is an authentication error (invalid API key)
    if (isLLMAuthError(error)) {
      console.warn('[LLM] Authentication error - invalid API key. Will fallback to dialog tree.');
      throw new LLMError(
        'LLM API authentication failed - invalid API key',
        error.code || 'AUTH_ERROR',
        error.status || error.statusCode || 401,
        true // Should fallback to dialog tree
      );
    }
    
    // Check if this is a limit/quota error that should trigger fallback
    if (isLLMLimitError(error)) {
      console.warn('[LLM] Rate limit or quota exceeded. Will fallback to dialog tree.');
      throw new LLMError(
        'LLM API limit exceeded',
        error.code || 'RATE_LIMIT',
        error.status || error.statusCode || 429,
        true
      );
    }
    
    // For other errors, return dialog tree context if available
    if (dialogTreeContext) {
      return dialogTreeContext;
    }
    
    // If no dialog tree context, throw error so caller can handle
    throw new LLMError(
      error.message || 'LLM API error',
      error.code,
      error.status || error.statusCode,
      false
    );
  }
}
