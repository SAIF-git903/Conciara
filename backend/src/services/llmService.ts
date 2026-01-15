import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Support both OpenAI and OpenRouter
const useOpenRouter = process.env.USE_OPENROUTER === 'true';
const apiKey = useOpenRouter 
  ? process.env.OPENROUTER_API_KEY 
  : process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({
      apiKey: apiKey,
      baseURL: useOpenRouter 
        ? 'https://openrouter.ai/api/v1' 
        : undefined,
    })
  : null;

export interface LLMResponse {
  content: string;
  tokens?: number;
}

/**
 * Generate a concise, personalized response based on user context and query
 * This replaces the rigid dialog tree approach with dynamic, context-aware responses
 */
export async function generateContextualResponse(
  userMessage: string,
  userContext: string,
  productCatalog?: string,
  maxLength: number = 150 // Keep responses concise (1-2 sentences)
): Promise<string> {
  if (!openai || !apiKey) {
    const provider = useOpenRouter ? 'OpenRouter' : 'OpenAI';
    console.warn(`${provider} API key not configured. Falling back to default response.`);
    return "I'm here to help you. Could you tell me more about what you're looking for?";
  }

  try {
    // Build the prompt for concise, personalized responses
    let systemPrompt = `You are a helpful, conversational assistant. Your goal is to provide concise, personalized recommendations in 1-2 sentences maximum (${maxLength} characters or less).

IMPORTANT RULES:
1. Be conversational and friendly, like talking to a friend
2. Give ONE direct recommendation, not multiple options
3. Use the user's context and preferences to personalize your answer
4. Be specific: mention exact products, specs, or models when relevant
5. Don't ask follow-up questions unless absolutely necessary
6. If you know the user's profession, preferences, or constraints, use them directly

Example good response: "Get yourself an M3 Mac Laptop with 36 Gigs of Ram or more. Faster processor even better. Get the 16 inch screen."

Example bad response: "I'd be happy to help you find a laptop. What are you looking for? Are you interested in Mac or Windows? What's your budget?"`;

    let userPrompt = `User message: "${userMessage}"\n\n`;

    if (userContext) {
      userPrompt += `User Context:\n${userContext}\n\n`;
    }

    if (productCatalog) {
      userPrompt += `Available Products:\n${productCatalog}\n\n`;
    }

    userPrompt += `Based on the user's message and context, provide a concise, personalized recommendation in 1-2 sentences.`;

    const model = useOpenRouter 
      ? 'openai/gpt-4o-mini'  // Fast and cost-effective
      : 'gpt-4o-mini';

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
    return "I'm here to help you. Could you tell me more about what you're looking for?";
  }
}

/**
 * Generate a response that combines dialog tree structure with user memory
 * This allows for hybrid approach: use trees when appropriate, but personalize with memory
 */
export async function generateHybridResponse(
  userMessage: string,
  userContext: string,
  dialogTreeContext?: string,
  productCatalog?: string
): Promise<string> {
  if (!openai || !apiKey) {
    return dialogTreeContext || "I'm here to help you. Could you tell me more about what you're looking for?";
  }

  try {
    const systemPrompt = `You are a helpful, conversational assistant. Combine the dialog tree response with user context to create a personalized, concise answer (1-2 sentences max).

Rules:
1. Use the dialog tree response as a base, but personalize it with user context
2. If user context contradicts dialog tree, prioritize user context
3. Be concise and direct
4. Don't repeat information the user already knows`;

    let userPrompt = `User message: "${userMessage}"\n\n`;

    if (userContext) {
      userPrompt += `User Context:\n${userContext}\n\n`;
    }

    if (dialogTreeContext) {
      userPrompt += `Suggested Response (from dialog tree):\n${dialogTreeContext}\n\n`;
    }

    if (productCatalog) {
      userPrompt += `Available Products:\n${productCatalog}\n\n`;
    }

    userPrompt += `Generate a personalized, concise response (1-2 sentences) that combines the dialog tree suggestion with user context.`;

    const model = useOpenRouter 
      ? 'openai/gpt-4o-mini'
      : 'gpt-4o-mini';

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
    return dialogTreeContext || "I'm here to help you.";
  }
}

